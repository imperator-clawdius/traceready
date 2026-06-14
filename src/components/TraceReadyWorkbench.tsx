"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from "react";
import {
  analyzeTraceReadyFile,
  createCompliancePack,
  type TraceReadyAnalysis,
  type ValidationIssue,
} from "@/lib/eudr";

const SAMPLE_CSV = `farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude
COF-001,Ama Mensah,Ghana,coffee,LOT-24-10,2.6,6.2031,-1.7082
COF-002,Kofi Adu,Ghana,coffee,LOT-24-10,8.2,6.3344,-1.6129
COF-002,Kofi Adu,Ghana,coffee,LOT-24-10,8.2,6.3344,-1.6129
COC-114,Coop San Pedro,Peru,cocoa,,3.9,-6.6232,-78.4420
`;

const SAMPLE_GEOJSON = JSON.stringify(
  {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          farm_id: "GEO-101",
          supplier_name: "Coop Rio Verde",
          country: "Peru",
          commodity: "cocoa",
          batch_id: "PE-COCOA-77",
          area_ha: "5.4",
        },
        geometry: {
          type: "Point",
          coordinates: [-76.2412, -6.5821],
        },
      },
      {
        type: "Feature",
        properties: {
          farm_id: "GEO-102",
          supplier_name: "Coop Rio Verde",
          country: "Peru",
          commodity: "cocoa",
          batch_id: "PE-COCOA-77",
          area_ha: "6.1",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-76.2501, -6.5901],
              [-76.2452, -6.5901],
              [-76.2452, -6.5854],
              [-76.2501, -6.5854],
              [-76.2501, -6.5901],
            ],
          ],
        },
      },
    ],
  },
  null,
  2,
);

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>KML-201</name>
      <ExtendedData>
        <Data name="farm_id"><value>KML-201</value></Data>
        <Data name="supplier_name"><value>Highlands Coffee Coop</value></Data>
        <Data name="country"><value>Uganda</value></Data>
        <Data name="commodity"><value>coffee</value></Data>
        <Data name="batch_id"><value>UG-COFFEE-18</value></Data>
        <Data name="area_ha"><value>2.8</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>30.2876,0.3476,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>KML-202</name>
      <ExtendedData>
        <Data name="farm_id"><value>KML-202</value></Data>
        <Data name="supplier_name"><value>Highlands Coffee Coop</value></Data>
        <Data name="country"><value>Uganda</value></Data>
        <Data name="commodity"><value>coffee</value></Data>
        <Data name="batch_id"><value>UG-COFFEE-18</value></Data>
        <Data name="area_ha"><value>5.3</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>30.2900,0.3500,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";
const LEGAL_OPERATOR = "Passive Print Labs LLC";
const SAMPLE_PACK_HREF = "/traceready-sample-output.zip";
const CHECKOUT_CLEANUP_HREF = "/checkout/cleanup/";
const CHECKOUT_PILOT_HREF = "/checkout/pilot/";

const FIX_CATEGORIES = [
  {
    title: "Coordinate defects",
    detail:
      "Flags impossible latitude/longitude values, zero points, swapped coordinate order, and missing geolocation fields.",
    mode: "Auto-detect",
  },
  {
    title: "Plot geometry gaps",
    detail:
      "Checks point-only records, polygon closure, over-4ha farm warnings, and GeoJSON/KML geometry structure.",
    mode: "Buyer follow-up",
  },
  {
    title: "Supplier field mess",
    detail:
      "Normalizes farm IDs, supplier names, batch IDs, commodity labels, area values, and duplicate farm records.",
    mode: "Clean + log",
  },
  {
    title: "Import-ready output",
    detail:
      "Packages cleaned CSV, issue CSV, normalized GeoJSON, buyer summary, readiness report, and EUDR checklist.",
    mode: "ZIP pack",
  },
];

const BEFORE_AFTER_ROWS = [
  {
    value: "COOP-018, Ghana, coffee, LOT-7, 5.7 ha, lat: 183.421, lon: -1.612",
    problem: "invalid latitude and point-only plot",
  },
  {
    value: "COOP-018, Ghana, coffee, LOT-7, 5.7 ha, lat: 6.334, lon: -1.613",
    problem: "duplicate farm ID",
  },
  {
    value: "COOP-022, , cocoa, LOT-7, 2.1 ha, lat: 6.204, lon: -1.708",
    problem: "missing supplier",
  },
];

const PACK_ITEMS = [
  "Cleaned farm CSV",
  "Issue log CSV",
  "Normalized GeoJSON",
  "Buyer summary",
  "Readiness report",
  "EUDR checklist",
  "Paid-cleanup intake note",
];

const PROOF_ISSUES = [
  {
    label: "3 blockers",
    detail: "invalid coordinate, duplicate farm ID, and missing supplier identity",
  },
  {
    label: "1 geometry follow-up",
    detail: "plot over 4 ha has only a point, so buyer likely needs polygon evidence",
  },
  {
    label: "7 files out",
    detail: "cleaned CSV, issue log, normalized GeoJSON, buyer summary, report, checklist, intake note",
  },
];

type BatchResult = {
  fileName: string;
  fileSize: number;
  analysis: TraceReadyAnalysis | null;
  error: string;
};

export function TraceReadyWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<TraceReadyAnalysis | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedBatchBrief, setCopiedBatchBrief] = useState(false);
  const [error, setError] = useState("");

  const orderHandoffHref = useMemo(() => {
    if (analysis) {
      return buildPaidCleanupHandoffHref(analysis);
    }

    const subject = encodeURIComponent("TraceReady paid cleanup file");
    const body = encodeURIComponent(
      `I bought TraceReady cleanup and need to submit my file.\n\nStripe receipt email:\nCommodity:\nSource country:\nDeadline:\nNotes:`,
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, [analysis]);
  const buyerBrief = useMemo(() => (analysis ? buildBuyerBrief(analysis) : ""), [analysis]);
  const batchBrief = useMemo(
    () => (batchResults.length > 1 ? buildBatchPilotBrief(batchResults) : ""),
    [batchResults],
  );
  const pilotHandoffHref = useMemo(() => buildPilotHandoffHref(batchBrief), [batchBrief]);

  async function runAnalysis(files: File[]) {
    const selectedFiles = files.slice(0, 5);

    if (selectedFiles.length === 0) {
      return;
    }

    setError("");
    setCopiedBrief(false);
    setCopiedBatchBrief(false);
    setActiveFile(selectedFiles[0]);
    setIsAnalyzing(true);

    try {
      const nextResults: BatchResult[] = [];

      for (const file of selectedFiles) {
        try {
          const nextAnalysis = await analyzeTraceReadyFile(file);
          nextResults.push({
            fileName: file.name,
            fileSize: file.size,
            analysis: nextAnalysis,
            error: "",
          });
        } catch (nextError) {
          nextResults.push({
            fileName: file.name,
            fileSize: file.size,
            analysis: null,
            error: nextError instanceof Error ? nextError.message : "TraceReady could not analyze that file.",
          });
        }
      }

      setBatchResults(nextResults);
      setAnalysis(nextResults.find((result) => result.analysis)?.analysis ?? null);

      if (files.length > selectedFiles.length) {
        setError("TraceReady analyzed the first 5 files. Request a pilot for larger supplier batches.");
      } else if (nextResults.every((result) => !result.analysis)) {
        setError("TraceReady could not analyze any of those files.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      void runAnalysis(files);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      void runAnalysis(files);
    }
  }

  async function loadSample(kind: "csv" | "geojson" | "kml") {
    const sample = {
      csv: {
        body: SAMPLE_CSV,
        name: "sample-coffee-export.csv",
        type: "text/csv",
      },
      geojson: {
        body: SAMPLE_GEOJSON,
        name: "sample-cocoa-export.geojson",
        type: "application/geo+json",
      },
      kml: {
        body: SAMPLE_KML,
        name: "sample-coffee-export.kml",
        type: "application/vnd.google-earth.kml+xml",
      },
    }[kind];
    const file = new File([sample.body], sample.name, { type: sample.type });
    await runAnalysis([file]);
  }

  async function loadPilotSample() {
    const files = [
      new File([SAMPLE_CSV], "pilot-ghana-coffee.csv", { type: "text/csv" }),
      new File([SAMPLE_GEOJSON], "pilot-peru-cocoa.geojson", { type: "application/geo+json" }),
      new File([SAMPLE_KML], "pilot-uganda-coffee.kml", { type: "application/vnd.google-earth.kml+xml" }),
    ];

    await runAnalysis(files);
  }

  async function downloadPack() {
    if (!analysis) {
      return;
    }

    setIsPacking(true);

    try {
      const blob = await createCompliancePack(analysis);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `traceready-${safeFileBase(analysis.fileName)}-pack.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPacking(false);
    }
  }

  async function copyBuyerBrief() {
    if (!buyerBrief) {
      return;
    }

    try {
      await navigator.clipboard.writeText(buyerBrief);
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 1800);
    } catch {
      setError("TraceReady could not copy the buyer summary. Download the pack instead.");
    }
  }

  async function copyBatchBrief() {
    if (!batchBrief) {
      return;
    }

    try {
      await navigator.clipboard.writeText(batchBrief);
      setCopiedBatchBrief(true);
      window.setTimeout(() => setCopiedBatchBrief(false), 1800);
    } catch {
      setError("TraceReady could not copy the pilot summary. Use the pilot request email instead.");
    }
  }

  return (
    <div className="trace-botanical-shell relative min-h-screen overflow-hidden bg-[#f6efe1] text-[#24150d]">
      <CoffeeBotanicalFrame />

      <header className="relative z-10 overflow-hidden border-b border-[#d6dfd4] bg-[#10251f] text-white shadow-sm">
        <Image
          src="/trace-ready-hero-field.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,29,28,0.96)_0%,rgba(9,38,35,0.86)_37%,rgba(9,38,35,0.36)_68%,rgba(9,38,35,0.1)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_48%,rgba(255,250,238,0.15),transparent_28rem)]" />

        <div className="relative mx-auto flex min-h-[620px] w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-4" aria-label="Primary">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-white/[0.18] bg-white/[0.94] shadow-sm">
                <Image
                  src="/traceready-logo-icon.png"
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 object-contain"
                  aria-hidden="true"
                />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-[#effdf4]">TraceReady</p>
                <p className="mt-1 text-xs font-medium uppercase text-[#bcd6c4]">Farm file cleanup</p>
              </div>
            </div>
            <a
              href="#sample-output"
              className="hidden h-10 items-center justify-center rounded-md border border-white/[0.18] bg-white/[0.1] px-4 text-sm font-semibold text-[#effdf4] backdrop-blur transition hover:bg-white/[0.16] sm:inline-flex"
            >
              Sample output
            </a>
          </nav>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.58fr)] lg:py-14">
            <section className="max-w-3xl">
              <h1 className="text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                Check a farm file before a buyer rejects it.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#d8eadf] sm:text-lg">
                Upload a CSV, KML, or GeoJSON file for coffee or cocoa. TraceReady finds missing
                fields, duplicate farms, bad coordinates, and cleanup blockers before the file reaches
                an importer.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0aa394] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b8f83]"
                  onClick={() => inputRef.current?.click()}
                >
                  <UploadCloud className="size-4" aria-hidden="true" />
                  Upload a farm file for free
                </button>
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/[0.22] bg-white/[0.12] px-5 text-sm font-semibold text-[#effdf4] backdrop-blur transition hover:bg-white/[0.18]"
                  onClick={() => void loadSample("csv")}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Try a sample file
                </button>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#bcd6c4]">
                No farm data leaves your browser during the free check. Paid cleanup is offered after
                you can see what needs fixing.
              </p>
              <div className="mt-5 max-w-2xl border border-white/[0.18] bg-white/[0.1] p-4 text-sm leading-6 text-[#d8eadf] backdrop-blur">
                <p className="font-semibold text-white">Founder proof</p>
                <p className="mt-1">
                  I built and verified this cleanup workflow around the failure modes buyers ask
                  suppliers to fix: missing IDs, duplicate farms, bad coordinates, point-only plots
                  over 4 ha, and incomplete shipment fields.
                </p>
                <p className="mt-2 text-xs leading-5 text-[#bcd6c4]">
                  Operated by {LEGAL_OPERATOR}. This is operational file cleanup, not a legal
                  certification or due diligence statement.
                </p>
              </div>
            </section>

            <section
              id="sample-output"
              className="border border-white/[0.16] bg-[#071d1a]/[0.78] p-5 shadow-2xl backdrop-blur-md"
            >
              <p className="text-xs font-semibold uppercase text-[#74e0cd]">One anonymized before-and-after</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                Messy rows become a visible issue list and cleaned pack.
              </h2>
              <div className="mt-5 border border-white/[0.12] bg-white/[0.08] p-4">
                <p className="text-sm font-semibold text-[#fff9e8]">Before: messy supplier CSV</p>
                <div className="mt-3 space-y-2 font-mono text-[11px] leading-5 text-[#d8eadf]">
                  {BEFORE_AFTER_ROWS.map((row) => (
                    <div key={row.value} className="border-l-2 border-[#f3b365] pl-3">
                      <p>{row.value}</p>
                      <p className="text-[#f6c987]">{row.problem}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 border border-white/[0.12] bg-white/[0.08] p-4">
                <p className="text-sm font-semibold text-[#fff9e8]">Issues TraceReady catches</p>
                <ul className="mt-3 space-y-2 text-sm leading-5 text-[#cfe3d7]">
                  {PROOF_ISSUES.map((issue) => (
                    <li key={issue.label} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#f3b365]" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-white">{issue.label}:</span> {issue.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 border border-white/[0.12] bg-[#effaf4] p-4 text-[#17352d]">
                <p className="text-sm font-semibold">After: cleaned buyer pack</p>
                <p className="mt-2 text-sm leading-6">
                  Cleaned farm CSV, issue log, normalized GeoJSON, buyer summary, readiness
                  report, EUDR checklist, and paid-cleanup intake note.
                </p>
              </div>
            </section>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="space-y-6">
          <div
            className="trace-card relative overflow-hidden border border-dashed border-[#c8a56f] bg-[#fffaf2]/95 p-6 shadow-sm"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#dff5e8] text-[#087f73]">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-[#2b190f]">Upload farm source file</h2>
                <p className="mt-2 text-sm leading-6 text-[#6a5137]">
                  Accepted formats: CSV, KML, GeoJSON, and JSON GeoJSON. Select one file for a quick
                  diagnosis or up to 5 files when comparing a small supplier batch.
                </p>
                {batchResults.length > 1 ? (
                  <p className="mt-3 text-sm font-medium text-[#3f2a1b]">
                    Selected: {batchResults.length} files ({formatBytes(totalBatchBytes(batchResults))})
                  </p>
                ) : activeFile ? (
                  <p className="mt-3 text-sm font-medium text-[#3f2a1b]">
                    Selected: {activeFile.name} ({formatBytes(activeFile.size)})
                  </p>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.kml,.geojson,.json,text/csv,application/geo+json,application/vnd.google-earth.kml+xml"
                  className="hidden"
                  multiple
                  onChange={handleInput}
                />
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#087f73] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05665d]"
                  onClick={() => inputRef.current?.click()}
                >
                  <UploadCloud className="size-4" aria-hidden="true" />
                  Choose file
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3b887] bg-white px-4 text-sm font-semibold whitespace-nowrap text-[#3a2517] transition hover:bg-[#fff3dd] sm:min-w-40"
                  onClick={() => void loadSample("csv")}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Sample CSV
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3b887] bg-white px-4 text-sm font-semibold whitespace-nowrap text-[#3a2517] transition hover:bg-[#fff3dd] sm:min-w-40"
                  onClick={() => void loadSample("kml")}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Sample KML
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d3b887] bg-white px-4 text-sm font-semibold whitespace-nowrap text-[#3a2517] transition hover:bg-[#fff3dd] sm:min-w-40"
                  onClick={() => void loadSample("geojson")}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Sample GeoJSON
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#087f73] bg-[#effaf4] px-4 text-sm font-semibold whitespace-nowrap text-[#05665d] transition hover:bg-[#dff5e8] sm:min-w-40"
                  onClick={() => void loadPilotSample()}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Pilot sample
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="mt-6 flex items-center gap-2 border-t border-[#eadcc8] pt-5 text-sm font-medium text-[#5d432b]">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Analyzing file
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <BatchPilotSummary results={batchResults} copied={copiedBatchBrief} onCopy={() => void copyBatchBrief()} />

          <IssueTable issues={analysis?.issues ?? []} hasAnalysis={Boolean(analysis)} />
        </section>

        <aside className="space-y-6">
          <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/95 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#2b190f]">
                {batchResults.length > 1 ? "Active file readiness" : "Readiness"}
              </h2>
              <StatusBadge analysis={analysis} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Score" value={analysis ? `${analysis.summary.readinessScore}` : "-"} suffix="/100" />
              <Metric label="Records" value={analysis ? String(analysis.summary.totalRecords) : "-"} />
              <Metric label="Blockers" value={analysis ? String(analysis.summary.blockers) : "-"} />
              <Metric label="Warnings" value={analysis ? String(analysis.summary.warnings) : "-"} />
            </div>

            <button
              type="button"
              disabled={!analysis || isPacking}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2d1a10] px-4 text-sm font-semibold text-[#fff7e8] transition hover:bg-[#4a2a16] disabled:cursor-not-allowed disabled:bg-[#c9b79c]"
              onClick={() => void downloadPack()}
            >
              {isPacking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {batchResults.length > 1 ? "Download active-file pack" : "Download compliance pack"}
            </button>

            <button
              type="button"
              disabled={!analysis}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d3b887] bg-white px-4 text-sm font-semibold text-[#3a2517] transition hover:bg-[#fff3dd] disabled:cursor-not-allowed disabled:bg-[#efe1c9] disabled:text-[#9a8060]"
              onClick={() => void copyBuyerBrief()}
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              {copiedBrief ? "Buyer summary copied" : "Copy buyer summary"}
            </button>

            <p className="mt-4 text-xs leading-5 text-[#7a6144]">
              {batchResults.length > 1
                ? "The batch summary compares all analyzed files. This card and ZIP download use the first successful file."
                : "Operational readiness check only. Final EUDR due diligence remains the operator or trader responsibility."}
            </p>
          </section>

          <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/95 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">After the diagnosis</h2>
            <p className="mt-2 text-sm leading-6 text-[#6a5137]">
              If the free check shows blockers, buy cleanup only after you can see the issue list.
            </p>
            <a
              href={CHECKOUT_CLEANUP_HREF}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#c6782a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a86222]"
            >
              <CreditCard className="size-4" aria-hidden="true" />
              Buy 24-hour cleanup
            </a>
            <a
              href={CHECKOUT_PILOT_HREF}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#c6782a] bg-white px-4 text-sm font-semibold text-[#8a4d1f] shadow-sm transition hover:bg-[#fff3dd]"
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Buy 5-file pilot - $745
            </a>
            <div className="mt-4 border-t border-[#eadcc8] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">
                Fulfillment path
              </p>
              <ol className="mt-2 space-y-2 text-sm leading-6 text-[#6a5137]">
                <li>Buy cleanup in Stripe.</li>
                <li>Email the source file, commodity, source country, deadline, and buyer summary.</li>
                <li>Receive the cleaned ZIP pack within 24 hours after payment and usable file receipt.</li>
              </ol>
              <p className="mt-3 text-sm leading-6 text-[#6a5137]">
                If the file is outside launch scope, we clarify or refund before work begins.
              </p>
              <a
                href={batchResults.length > 1 ? pilotHandoffHref : orderHandoffHref}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#d3b887] bg-white px-3 text-sm font-semibold text-[#3a2517] transition hover:bg-[#fff3dd]"
              >
                {batchResults.length > 1 ? "Send pilot files" : "Send paid-cleanup file"}
              </a>
            </div>
            <div className="mt-4 border-t border-[#eadcc8] pt-4 text-xs leading-5 text-[#7a6144]">
              <p className="font-semibold text-[#3a2517]">Founder-operated cleanup desk</p>
              <p className="mt-1">
                TraceReady checkout is branded as TraceReady and operated by {LEGAL_OPERATOR}.
              </p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-block font-semibold text-[#087f73] hover:text-[#05665d]">
                {CONTACT_EMAIL}
              </a>
            </div>
          </section>
        </aside>
      </main>

      <MarketProofSections />

      <footer className="relative z-10 border-t border-[#dec8a6] bg-[#fffaf1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-[#6a5137] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Browser-side validation for launch. Paid cleanup files are submitted by email after checkout.
            TraceReady is operated by {LEGAL_OPERATOR}.
          </p>
          <nav className="flex gap-4 font-semibold text-[#3a2517]" aria-label="Trust links">
            <a href="/privacy/" className="hover:text-[#087f73]">
              Privacy
            </a>
            <a href="/terms/" className="hover:text-[#087f73]">
              Terms
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#087f73]">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MarketProofSections() {
  return (
    <section className="relative z-10 border-y border-[#dec8a6] bg-[#fff7e8]/86 py-8 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
              What the proof example represents
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#2b190f]">
              The product is the issue log, cleaned file, and buyer handoff.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6a5137]">
              The free check shows whether the source file is actually usable. Paid cleanup is only
              for files where the issue list shows work that needs manual repair before buyer review.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FIX_CATEGORIES.map((item) => (
              <div key={item.title} className="border border-[#e0c79d] bg-white/78 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#2b190f]">{item.title}</h3>
                  <span className="shrink-0 rounded-md bg-[#dff5e8] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#087f73]">
                    {item.mode}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6a5137]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/96 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
            Cleaned pack contents
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-[#2b190f]">What a buyer can inspect.</h2>
          <ul className="mt-4 space-y-2">
            {PACK_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-[#3f2a1b]">
                <CheckCircle2 className="size-4 shrink-0 text-[#087f73]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href={SAMPLE_PACK_HREF}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#087f73] px-3 text-sm font-semibold text-white transition hover:bg-[#05665d]"
          >
            <Download className="size-4" aria-hidden="true" />
            Download anonymized sample pack
          </a>
          <p className="mt-3 text-xs leading-5 text-[#7a6144]">
            Sample files are anonymized launch examples, not legal certification or buyer approval.
          </p>
        </section>
      </div>
    </section>
  );
}

function CoffeeBotanicalFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <svg className="trace-vines trace-vines-left" viewBox="0 0 260 720" fill="none">
        <path
          d="M30 12C87 82 89 141 50 204C9 270 33 330 108 384C184 440 191 504 116 575C78 611 76 654 116 708"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M65 134C103 111 136 114 164 143C124 166 91 163 65 134Z" fill="currentColor" />
        <path d="M42 296C77 261 112 255 148 278C116 311 81 317 42 296Z" fill="currentColor" />
        <path d="M115 452C153 429 186 432 214 461C174 484 141 481 115 452Z" fill="currentColor" />
        <path d="M55 602C89 573 125 571 162 598C126 627 91 628 55 602Z" fill="currentColor" />
        <g className="trace-bean-fill">
          <ellipse cx="158" cy="218" rx="18" ry="29" transform="rotate(-30 158 218)" />
          <path d="M149 195C155 211 159 225 166 241" stroke="#5a341f" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="88" cy="520" rx="17" ry="27" transform="rotate(22 88 520)" />
          <path d="M94 497C89 514 84 527 78 542" stroke="#5a341f" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>

      <svg className="trace-vines trace-vines-right" viewBox="0 0 280 740" fill="none">
        <path
          d="M226 6C166 76 160 132 201 203C246 281 217 348 135 399C57 447 52 512 128 583C166 620 168 672 124 731"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M198 130C158 108 123 113 96 145C138 166 171 162 198 130Z" fill="currentColor" />
        <path d="M222 312C184 279 149 276 114 302C150 334 185 337 222 312Z" fill="currentColor" />
        <path d="M128 474C90 451 55 454 28 487C70 508 102 504 128 474Z" fill="currentColor" />
        <path d="M209 616C173 589 139 591 102 620C140 647 174 644 209 616Z" fill="currentColor" />
        <g className="trace-bean-fill">
          <ellipse cx="96" cy="232" rx="18" ry="29" transform="rotate(31 96 232)" />
          <path d="M106 209C99 225 95 239 88 254" stroke="#5a341f" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="183" cy="528" rx="17" ry="27" transform="rotate(-22 183 528)" />
          <path d="M176 505C181 522 187 535 193 550" stroke="#5a341f" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>

      <div className="trace-bean-scatter trace-bean-scatter-a" />
      <div className="trace-bean-scatter trace-bean-scatter-b" />
      <div className="trace-bean-scatter trace-bean-scatter-c" />
    </div>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border border-[#e0c79d] bg-[#fff4df] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7d5d32]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#2b190f]">
        {value}
        <span className="text-sm text-[#7d5d32]">{suffix}</span>
      </p>
    </div>
  );
}

function StatusBadge({ analysis }: { analysis: TraceReadyAnalysis | null }) {
  if (!analysis) {
    return <span className="rounded-md bg-[#efe1c9] px-2.5 py-1 text-xs font-semibold text-[#725439]">No file</span>;
  }

  if (analysis.summary.blockers > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <XCircle className="size-3.5" aria-hidden="true" />
        Needs cleanup
      </span>
    );
  }

  if (analysis.summary.warnings > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Review
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Ready
    </span>
  );
}

function IssueTable({ issues, hasAnalysis }: { issues: ValidationIssue[]; hasAnalysis: boolean }) {
  return (
    <section className="trace-card overflow-hidden border border-[#d9bf92] bg-[#fffaf2]/95 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#eadcc8] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2b190f]">Issue log</h2>
        <span className="text-sm text-[#7a6144]">{issues.length} found</span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-[#6a5137]">
          <CheckCircle2 className="size-5 text-[#087f73]" aria-hidden="true" />
          {hasAnalysis
            ? "No issues found in this file."
            : "Upload a file to see blockers, warnings, and cleanup suggestions."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fff4df] text-xs uppercase tracking-[0.1em] text-[#7d5d32]">
              <tr>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Field</th>
                <th className="px-4 py-3 font-semibold">Issue</th>
                <th className="px-4 py-3 font-semibold">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadcc8]">
              {issues.map((issue, index) => (
                <tr key={`${issue.code}-${issue.sourceLabel}-${index}`}>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={
                        issue.severity === "blocker"
                          ? "rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                          : "rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td className="max-w-44 px-4 py-3 align-top font-medium text-[#3f2a1b]">{issue.sourceLabel}</td>
                  <td className="px-4 py-3 align-top text-[#6a5137]">{issue.field}</td>
                  <td className="min-w-64 px-4 py-3 align-top text-[#3f2a1b]">{issue.message}</td>
                  <td className="min-w-64 px-4 py-3 align-top text-[#6a5137]">{issue.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BatchPilotSummary({
  results,
  copied,
  onCopy,
}: {
  results: BatchResult[];
  copied: boolean;
  onCopy: () => void;
}) {
  if (results.length <= 1) {
    return null;
  }

  const summary = summarizeBatch(results);

  return (
    <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#eadcc8] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
            Multi-file cleanup check
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">
            Batch view for supplier file cleanup.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6a5137]">
            Compare up to 5 supplier files, spot which ones need cleanup, and copy a pilot summary for
            the buyer or importer.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#087f73] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05665d]"
          onClick={onCopy}
        >
          <FileCheck2 className="size-4" aria-hidden="true" />
          {copied ? "Pilot summary copied" : "Copy pilot summary"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Files" value={`${summary.analyzedFiles}`} suffix={`/${summary.fileCount}`} />
        <Metric label="Records" value={String(summary.totalRecords)} />
        <Metric label="Blockers" value={String(summary.blockers)} />
        <Metric label="Avg score" value={summary.analyzedFiles ? String(summary.averageScore) : "-"} suffix="/100" />
      </div>

      <div className="mt-4 divide-y divide-[#eadcc8] border border-[#e0c79d] bg-white/70">
        {results.map((result) => {
          const status = batchFileStatus(result);

          return (
            <div key={result.fileName} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px_120px]">
              <div>
                <p className="font-semibold text-[#2b190f]">{result.fileName}</p>
                <p className="mt-1 text-xs text-[#7a6144]">
                  {result.error ||
                    `${result.analysis?.summary.totalRecords ?? 0} records, ${
                      result.analysis?.summary.blockers ?? 0
                    } blockers, ${result.analysis?.summary.warnings ?? 0} warnings`}
                </p>
              </div>
              <span className={status.className}>{status.label}</span>
              <p className="text-right font-semibold tabular-nums text-[#3f2a1b] sm:text-left">
                {result.analysis ? `${result.analysis.summary.readinessScore}/100` : "-"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildBuyerBrief(analysis: TraceReadyAnalysis): string {
  const blockers = analysis.issues.filter((issue) => issue.severity === "blocker");
  const warnings = analysis.issues.filter((issue) => issue.severity === "warning");
  const status =
    blockers.length > 0
      ? "Needs cleanup before buyer/importer review"
      : warnings.length > 0
        ? "Ready for review with warnings"
        : "No blockers or warnings detected";
  const commodities = detectedValues(
    analysis,
    (record) => (record.commodity === "unknown" ? record.rawCommodity : record.commodity),
  );
  const countries = detectedValues(analysis, (record) => record.country);
  const topIssues = analysis.issues.slice(0, 6);

  return [
    "TraceReady Buyer Summary",
    "",
    `Status: ${status}`,
    `Source file: ${analysis.fileName}`,
    `Detected format: ${analysis.format}`,
    `Readiness score: ${analysis.summary.readinessScore}/100`,
    `Records checked: ${analysis.summary.totalRecords}`,
    `Records without blockers: ${analysis.summary.readyRecords}`,
    `Blockers: ${analysis.summary.blockers}`,
    `Warnings: ${analysis.summary.warnings}`,
    `Commodity: ${commodities}`,
    `Country: ${countries}`,
    "",
    "Top issues:",
    ...(topIssues.length
      ? topIssues.map((issue) => `- [${issue.severity}] ${issue.sourceLabel} ${issue.field}: ${issue.message}`)
      : ["- No blockers or warnings detected."]),
    "",
    "Recommended next step:",
    blockers.length > 0
      ? "Buy the 24-hour cleanup pass or 5-file pilot before sending this pack to an importer."
      : "Download the compliance pack and attach it to the buyer/importer review record.",
    "",
    "Caveat: TraceReady is an operational readiness pack, not legal certification.",
  ].join("\n");
}

function buildBatchPilotBrief(results: BatchResult[]): string {
  const summary = summarizeBatch(results);
  const cleanupFiles = results.filter((result) => (result.analysis?.summary.blockers ?? 0) > 0);
  const reviewFiles = results.filter(
    (result) => result.analysis && result.analysis.summary.blockers === 0 && result.analysis.summary.warnings > 0,
  );
  const readyFiles = results.filter(
    (result) => result.analysis && result.analysis.summary.blockers === 0 && result.analysis.summary.warnings === 0,
  );
  const failedFiles = results.filter((result) => result.error);

  return [
    "TraceReady Importer Pilot Summary",
    "",
    `Files submitted: ${summary.fileCount}`,
    `Files analyzed: ${summary.analyzedFiles}`,
    `Analyze errors: ${summary.failedFiles}`,
    `Records checked: ${summary.totalRecords}`,
    `Records without blockers: ${summary.readyRecords}`,
    `Total blockers: ${summary.blockers}`,
    `Total warnings: ${summary.warnings}`,
    `Average readiness score: ${summary.analyzedFiles ? `${summary.averageScore}/100` : "not available"}`,
    "",
    "File breakdown:",
    ...results.map((result) => {
      if (!result.analysis) {
        return `- ${result.fileName}: analyze error - ${result.error}`;
      }

      return `- ${result.fileName}: ${result.analysis.summary.readinessScore}/100, ${result.analysis.summary.totalRecords} records, ${result.analysis.summary.blockers} blockers, ${result.analysis.summary.warnings} warnings`;
    }),
    "",
    "Pilot buckets:",
    `- Needs cleanup: ${cleanupFiles.length}`,
    `- Ready with warnings: ${reviewFiles.length}`,
    `- Ready files: ${readyFiles.length}`,
    `- Analyze errors: ${failedFiles.length}`,
    "",
    "Recommended next step:",
    cleanupFiles.length > 0 || failedFiles.length > 0
      ? "Buy the $745 5-file pilot and attach the original supplier files for manual cleanup."
      : "Download individual compliance packs and use the pilot summary as the importer review cover note.",
    "",
    "Caveat: TraceReady is an operational readiness pack, not legal certification.",
  ].join("\n");
}

function buildPaidCleanupHandoffHref(analysis: TraceReadyAnalysis): string {
  const subject = encodeURIComponent(`TraceReady paid cleanup file - ${analysis.fileName}`);
  const body = encodeURIComponent(
    [
      "I bought TraceReady cleanup and need to submit my file.",
      "",
      "Stripe receipt email:",
      "Company:",
      "Contact name:",
      "Deadline:",
      "",
      buildBuyerBrief(analysis),
      "",
      "Notes:",
    ].join("\n"),
  );

  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function buildPilotHandoffHref(batchBrief = ""): string {
  const subject = encodeURIComponent("TraceReady pilot files after checkout");
  const body = encodeURIComponent(
    [
      "I bought the TraceReady 5-file pilot and need to submit files.",
      "",
      "Stripe receipt email:",
      "Company:",
      "Contact name:",
      "Target deadline:",
      "Buyer-specific requirements:",
      "",
      batchBrief || "Paste the TraceReady Importer Pilot Brief here if you generated one.",
      "",
      "Notes:",
    ].join("\n"),
  );

  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function summarizeBatch(results: BatchResult[]) {
  const analyses = results.flatMap((result) => (result.analysis ? [result.analysis] : []));
  const totalScore = analyses.reduce((sum, nextAnalysis) => sum + nextAnalysis.summary.readinessScore, 0);

  return {
    fileCount: results.length,
    analyzedFiles: analyses.length,
    failedFiles: results.length - analyses.length,
    totalRecords: analyses.reduce((sum, nextAnalysis) => sum + nextAnalysis.summary.totalRecords, 0),
    readyRecords: analyses.reduce((sum, nextAnalysis) => sum + nextAnalysis.summary.readyRecords, 0),
    blockers: analyses.reduce((sum, nextAnalysis) => sum + nextAnalysis.summary.blockers, 0),
    warnings: analyses.reduce((sum, nextAnalysis) => sum + nextAnalysis.summary.warnings, 0),
    averageScore: analyses.length ? Math.round(totalScore / analyses.length) : 0,
  };
}

function batchFileStatus(result: BatchResult) {
  if (!result.analysis) {
    return {
      label: "Error",
      className:
        "inline-flex h-7 items-center justify-center rounded-md bg-red-50 px-2 text-xs font-semibold text-red-700",
    };
  }

  if (result.analysis.summary.blockers > 0) {
    return {
      label: "Needs cleanup",
      className:
        "inline-flex h-7 items-center justify-center rounded-md bg-red-50 px-2 text-xs font-semibold text-red-700",
    };
  }

  if (result.analysis.summary.warnings > 0) {
    return {
      label: "Review",
      className:
        "inline-flex h-7 items-center justify-center rounded-md bg-amber-50 px-2 text-xs font-semibold text-amber-700",
    };
  }

  return {
    label: "Ready",
    className:
      "inline-flex h-7 items-center justify-center rounded-md bg-emerald-50 px-2 text-xs font-semibold text-emerald-700",
  };
}

function detectedValues(analysis: TraceReadyAnalysis, selector: (record: TraceReadyAnalysis["records"][number]) => string) {
  const values = Array.from(
    new Set(
      analysis.records
        .map((record) => selector(record).trim())
        .filter((value) => value.length > 0 && value !== "unknown"),
    ),
  );

  return values.join(", ") || "not detected";
}

function totalBatchBytes(results: BatchResult[]): number {
  return results.reduce((sum, result) => sum + result.fileSize, 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileBase(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
