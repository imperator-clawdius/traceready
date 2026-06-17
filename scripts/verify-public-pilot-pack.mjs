import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";
import {
  PUBLIC_PILOT_PACK_DIR,
  PUBLIC_PILOT_PACK_ZIP,
} from "./render-public-pilot-pack.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_PILOT_PACK_MANIFEST = "public-cocoa-pilot-pack-manifest.json";
const REQUIRED_BOUNDARY_FLAGS = [
  "noRawSourceRows",
  "noRawCoordinates",
  "noCustomerMaterial",
];
const COORDINATE_LITERAL_RE = /[-+]?\d{1,3}\.\d{6,}/g;

export function parsePublicPilotPackVerificationArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--public-dir") {
      options.publicDir = next;
      index += 1;
    } else if (arg === "--pack-dir") {
      options.packDir = next;
      index += 1;
    } else if (arg === "--manifest") {
      options.manifestPath = next;
      index += 1;
    } else if (arg === "--zip") {
      options.zipPath = next;
      index += 1;
    }
  }

  return options;
}

export async function verifyPublicPilotPack(options = {}) {
  const publicDir = path.resolve(options.publicDir ?? path.join(REPO_ROOT, "public"));
  const packDir = path.resolve(options.packDir ?? path.join(publicDir, PUBLIC_PILOT_PACK_DIR));
  const manifestPath = path.resolve(options.manifestPath ?? path.join(packDir, PUBLIC_PILOT_PACK_MANIFEST));
  const zipPath = path.resolve(options.zipPath ?? path.join(publicDir, PUBLIC_PILOT_PACK_ZIP));
  const errors = [];

  const manifest = await readJson(manifestPath, errors);
  const zip = await readZip(zipPath, errors);

  if (manifest) {
    if (manifest.packType !== "public-data-pilot") {
      errors.push("manifest packType must be public-data-pilot");
    }

    for (const flag of REQUIRED_BOUNDARY_FLAGS) {
      if (manifest.boundary?.[flag] !== true) {
        errors.push(`manifest boundary.${flag} must be true`);
      }
    }

    if (!Array.isArray(manifest.artifacts)) {
      errors.push("manifest artifacts must be an array");
    }
  }

  const artifactEntries = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const artifactNames = artifactEntries.map((artifact) => artifact.filename).filter(Boolean);
  const expectedZipNames = new Set([...artifactNames, PUBLIC_PILOT_PACK_MANIFEST]);
  const zipEntries = zip ? listZipFiles(zip) : [];

  if (zip) {
    for (const zipName of zipEntries) {
      if (!expectedZipNames.has(zipName)) {
        errors.push(`zip contains unexpected file: ${zipName}`);
      }
    }

    for (const expectedName of expectedZipNames) {
      if (!zip.file(expectedName)) {
        errors.push(`zip is missing expected file: ${expectedName}`);
      }
    }
  }

  for (const artifact of artifactEntries) {
    const artifactName = artifact.filename;
    if (!artifactName) {
      errors.push("manifest artifact is missing filename");
      continue;
    }

    const artifactPath = path.join(packDir, artifactName);
    const localBuffer = await readFileBuffer(artifactPath, errors, artifactName);

    if (localBuffer) {
      verifyArtifactBuffer({
        buffer: localBuffer,
        expectedBytes: artifact.bytes,
        expectedSha256: artifact.sha256,
        sourceLabel: artifactName,
        errors,
      });
      scanForCoordinateLeaks(artifactName, localBuffer, errors);
    }

    const zipEntry = zip?.file(artifactName);
    if (zipEntry) {
      const zipBuffer = await zipEntry.async("nodebuffer");
      verifyArtifactBuffer({
        buffer: zipBuffer,
        expectedBytes: artifact.bytes,
        expectedSha256: artifact.sha256,
        sourceLabel: `zip:${artifactName}`,
        errors,
      });
      scanForCoordinateLeaks(`zip:${artifactName}`, zipBuffer, errors);
    }
  }

  if (zip?.file(PUBLIC_PILOT_PACK_MANIFEST)) {
    const zippedManifest = await zip.file(PUBLIC_PILOT_PACK_MANIFEST).async("string");
    const localManifest = manifest ? `${JSON.stringify(manifest, null, 2)}\n` : "";
    if (manifest && zippedManifest !== localManifest) {
      errors.push(`${PUBLIC_PILOT_PACK_MANIFEST} in zip does not match committed manifest`);
    }
    scanForCoordinateLeaks(`zip:${PUBLIC_PILOT_PACK_MANIFEST}`, Buffer.from(zippedManifest, "utf8"), errors);
  }

  return {
    ready: errors.length === 0,
    errors,
    artifactCount: artifactEntries.length,
    zipEntryCount: zipEntries.length,
    manifestPath,
    packDir,
    zipPath,
  };
}

export function renderPublicPilotPackVerification(result) {
  const status = result.ready ? "pass" : "pending";
  const lines = [
    `PUBLIC_PILOT_PACK=${status} artifacts=${result.artifactCount} zip_entries=${result.zipEntryCount} manifest=${result.manifestPath} zip=${result.zipPath}`,
  ];

  for (const error of result.errors) {
    lines.push(`PUBLIC_PILOT_PACK_ERROR=${error}`);
  }

  return lines.join("\n");
}

async function readJson(filePath, errors) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    errors.push(`${path.basename(filePath)} could not be read as JSON: ${error.message}`);
    return null;
  }
}

async function readZip(filePath, errors) {
  try {
    return await JSZip.loadAsync(await fs.readFile(filePath));
  } catch (error) {
    errors.push(`${path.basename(filePath)} could not be read as ZIP: ${error.message}`);
    return null;
  }
}

async function readFileBuffer(filePath, errors, artifactName) {
  try {
    return await fs.readFile(filePath);
  } catch {
    errors.push(`${artifactName} is missing from the public pilot pack directory`);
    return null;
  }
}

function verifyArtifactBuffer({ buffer, expectedBytes, expectedSha256, sourceLabel, errors }) {
  if (buffer.byteLength !== expectedBytes) {
    errors.push(`${sourceLabel} byte size does not match manifest`);
  }

  if (sha256(buffer) !== expectedSha256) {
    errors.push(`${sourceLabel} sha256 does not match manifest`);
  }
}

function listZipFiles(zip) {
  return Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => entry.name)
    .sort();
}

function scanForCoordinateLeaks(label, buffer, errors) {
  const text = buffer.toString("utf8");
  const matches = new Set(text.match(COORDINATE_LITERAL_RE) ?? []);

  for (const match of matches) {
    const value = Number(match);
    if (Number.isFinite(value) && Math.abs(value) <= 180) {
      errors.push(`${label} contains coordinate-looking value: ${match}`);
    }
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyPublicPilotPack(parsePublicPilotPackVerificationArgs());
  console.log(renderPublicPilotPackVerification(result));
  process.exitCode = result.ready ? 0 : 1;
}
