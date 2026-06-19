import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const DEFAULT_CONTACTS_PATH = "private/outreach-people-2026-06-18.csv";
const DEFAULT_FROM = { name: "TraceReady", email: "founder@traceready.online" };
const DEFAULT_SUBJECT = "Quick EUDR file check before buyer review";

export function parseDirectOutreachPeople(csv) {
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`direct outreach CSV parse failed: ${parsed.errors[0].message}`);
  }

  return parsed.data.map((row) => ({
    ...row,
    priority: String(row.priority ?? "").trim(),
    person_name: String(row.person_name ?? "").trim(),
    business: String(row.business ?? "").trim(),
    title_at_business: String(row.title_at_business ?? "").trim(),
    email: String(row.email ?? "").trim(),
    phone: String(row.phone ?? "").trim(),
  }));
}

export function selectDirectOutreachContact(rows, { priority = null, email = null } = {}) {
  if (!priority && !email) {
    throw new Error("select a contact with --priority or --email");
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const contact = rows.find((row) => {
    if (priority && row.priority === String(priority).trim()) {
      return true;
    }
    return normalizedEmail ? row.email.toLowerCase() === normalizedEmail : false;
  });

  if (!contact) {
    throw new Error(`direct outreach contact not found for ${priority ? `priority ${priority}` : email}`);
  }

  for (const field of ["person_name", "business", "title_at_business", "email", "phone"]) {
    if (!contact[field]) {
      throw new Error(`direct outreach contact ${contact.priority || contact.email} is missing ${field}`);
    }
  }

  return contact;
}

export function renderDirectOutreachPitch(contact) {
  const firstName = firstNameFor(contact.person_name);

  return `Hi ${firstName},

I run TraceReady, a small browser-side checker for coffee and cocoa farm files before they hit buyer review.

I am not asking you to trust a platform. I ran a public cocoa dataset through the checker first: 57,658 rows in, 46,134 over-4ha point-only plots found, missing plot IDs and supplier identity flagged, zero buyer-ready records. The evidence pack is here:

https://traceready.online/proof/public-cocoa-pilot/

The useful part is narrow: send one CSV, KML, or GeoJSON through the browser checker and it gives the exact row, field, problem, and suggested fix before paid cleanup. Coordinates do not leave the machine during the free check.

If one supplier file is currently messy, I can help turn the issue log into a buyer-readable cleanup scope. Worth a look, or is there someone else on your team who owns supplier geolocation file readiness?

Best,
Teddy
TraceReady
founder@traceready.online`;
}

export function buildDirectOutreachEmailPayload(contact, options = {}) {
  return {
    sender: options.sender ?? DEFAULT_FROM,
    to: [{ name: contact.person_name, email: contact.email }],
    subject: options.subject ?? DEFAULT_SUBJECT,
    textContent: renderDirectOutreachPitch(contact),
  };
}

export function parseDirectOutreachSendArgs(argv) {
  const parsed = {
    contactsPath: DEFAULT_CONTACTS_PATH,
    priority: null,
    email: null,
    send: false,
    confirmEmail: null,
    evidenceOutputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (flag === "--send") {
      parsed.send = true;
      continue;
    }

    const value = argv[index + 1];
    if (!flag.startsWith("--")) {
      throw new Error(`unexpected argument: ${flag}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--contacts") {
      parsed.contactsPath = value;
    } else if (flag === "--priority") {
      parsed.priority = value;
    } else if (flag === "--email") {
      parsed.email = value;
    } else if (flag === "--confirm-email") {
      parsed.confirmEmail = value;
    } else if (flag === "--evidence-output") {
      parsed.evidenceOutputPath = value;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }

    index += 1;
  }

  if (parsed.priority && parsed.email) {
    throw new Error("use either --priority or --email, not both");
  }

  return parsed;
}

export async function runDirectOutreachEmailSend({ csv, args = {}, sendEmail = sendBrevoEmail }) {
  const contacts = parseDirectOutreachPeople(csv);
  const contact = selectDirectOutreachContact(contacts, args);
  const payload = buildDirectOutreachEmailPayload(contact);

  if (!args.send) {
    return {
      sent: false,
      contact,
      payload,
      statusLine: `DIRECT_OUTREACH_EMAIL_DRY_RUN=ready priority=${contact.priority} to=${contact.email}`,
    };
  }

  if (String(args.confirmEmail ?? "").trim().toLowerCase() !== contact.email.toLowerCase()) {
    throw new Error(`confirm-email must match ${contact.email} before sending`);
  }

  const providerResponse = await sendEmail(payload);
  return {
    sent: true,
    contact,
    payload,
    providerResponse,
    statusLine: `DIRECT_OUTREACH_EMAIL_SENT=accepted priority=${contact.priority} to=${contact.email}`,
  };
}

export async function sendBrevoEmail(payload) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is required for --send");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseBody = responseText;
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    // Keep provider text for diagnostics.
  }

  if (!response.ok) {
    throw new Error(`Brevo send failed ${response.status}: ${typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody)}`);
  }

  return responseBody;
}

function firstNameFor(personName) {
  return String(personName ?? "").trim().split(/\s+/)[0] || "there";
}

async function main() {
  const args = parseDirectOutreachSendArgs(process.argv.slice(2));
  const csv = await fs.readFile(args.contactsPath, "utf8");
  const result = await runDirectOutreachEmailSend({ csv, args });

  if (args.evidenceOutputPath) {
    await fs.writeFile(
      args.evidenceOutputPath,
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          sent: result.sent,
          statusLine: result.statusLine,
          contact: result.contact,
          payload: result.payload,
          providerResponse: result.providerResponse ?? null,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  console.log(result.statusLine);
  if (!result.sent) {
    console.log(JSON.stringify(result.payload, null, 2));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`DIRECT_OUTREACH_EMAIL=pending ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
