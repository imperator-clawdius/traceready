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
          area_ha: "3.4",
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
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              30.2900,0.3500,0 30.2940,0.3500,0 30.2940,0.3540,0 30.2900,0.3540,0 30.2900,0.3500,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";
const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";

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

const CLEANUP_STEPS = [
  {
    label: "Upload",
    title: "Drop in the messy supplier file",
    detail: "CSV, KML, GeoJSON, or JSON GeoJSON can be checked in the browser without sending the file first.",
  },
  {
    label: "Validate",
    title: "TraceReady scores and explains the blockers",
    detail: "The workbench separates hard blockers from warnings and writes the suggested repair next to each issue.",
  },
  {
    label: "Package",
    title: "Download the buyer-ready handoff",
    detail: "Export the compliance pack yourself, or buy the 24-hour cleanup pass when the file needs manual repair.",
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

const AUDIENCE_GROUPS = [
  {
    title: "Exporters and coops",
    detail: "Find bad farm rows before a buyer or importer rejects a shipment file.",
  },
  {
    title: "EU importers",
    detail: "Screen supplier data before it enters a larger EUDR workflow or due diligence system.",
  },
  {
    title: "Compliance consultants",
    detail: "Turn repeated file cleanup into a consistent, explainable handoff for clients.",
  },
];

const SAMPLE_RECEIPT = [
  ["Records checked", "1,248"],
  ["Auto-detected issues", "73"],
  ["Supplier follow-ups", "11"],
  ["Pack files", "7"],
];

export function TraceReadyWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<TraceReadyAnalysis | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const [error, setError] = useState("");

  const buyHref = useMemo(() => {
    if (PAYMENT_LINK) {
      return PAYMENT_LINK;
    }

    const subject = encodeURIComponent("TraceReady 24-hour cleanup");
    const body = encodeURIComponent(
      `I want to buy a TraceReady cleanup pass.\n\nFile type:\nCommodity:\nShipment or lot size:\nDeadline:`,
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);
  const orderHandoffHref = useMemo(() => {
    const subject = encodeURIComponent("TraceReady paid cleanup file");
    const body = encodeURIComponent(
      `I bought TraceReady cleanup and need to submit my file.\n\nStripe receipt email:\nCommodity:\nSource country:\nDeadline:\nNotes:`,
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, []);
  const opensCheckout = Boolean(PAYMENT_LINK);

  async function runAnalysis(file: File) {
    setError("");
    setActiveFile(file);
    setIsAnalyzing(true);

    try {
      const nextAnalysis = await analyzeTraceReadyFile(file);
      setAnalysis(nextAnalysis);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "TraceReady could not analyze that file.";
      setError(message);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void runAnalysis(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file) {
      void runAnalysis(file);
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
    await runAnalysis(file);
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

  return (
    <div className="trace-botanical-shell relative min-h-screen overflow-hidden bg-[#f6efe1] text-[#24150d]">
      <CoffeeBotanicalFrame />

      <header className="relative z-10 border-b border-[#dec8a6] bg-[#fffaf1]/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-md border border-[#d7bd95] bg-white shadow-sm">
                <Image
                  src="/traceready-logo-icon.png"
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 object-contain"
                  aria-hidden="true"
                />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#087f73]">TraceReady</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#7d5d32]">
                  Farm data cleanup
                </p>
              </div>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-[#2b190f] sm:text-4xl">
              Clean farm files into EUDR-ready packs.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#62472e]">
              Upload messy CSV, KML, or GeoJSON files for coffee and cocoa. Get cleaned farm records,
              geolocation output, issue logs, and a readiness report in one ZIP.
            </p>
          </div>

          <a
            href={buyHref}
            target={opensCheckout ? "_blank" : undefined}
            rel={opensCheckout ? "noopener noreferrer" : undefined}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#2d1a10] px-5 text-sm font-semibold text-[#fff7e8] shadow-sm transition hover:bg-[#4a2a16]"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            Buy cleanup - $149
          </a>
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
                  Accepted launch formats: CSV, KML, GeoJSON, JSON GeoJSON. Files are processed in
                  your browser for the MVP.
                </p>
                {activeFile ? (
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

          <IssueTable issues={analysis?.issues ?? []} />
        </section>

        <aside className="space-y-6">
          <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/95 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#2b190f]">Readiness</h2>
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
              Download compliance pack
            </button>

            <p className="mt-4 text-xs leading-5 text-[#7a6144]">
              Operational readiness check only. Final EUDR due diligence remains the operator or
              trader responsibility.
            </p>
          </section>

          <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/95 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">Launch conversion</h2>
            <p className="mt-2 text-sm leading-6 text-[#6a5137]">
              For teams that need the messy file fixed, packaged, and returned instead of self-serve
              diagnosis.
            </p>
            <a
              href={buyHref}
              target={opensCheckout ? "_blank" : undefined}
              rel={opensCheckout ? "noopener noreferrer" : undefined}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#c6782a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a86222]"
            >
              <CreditCard className="size-4" aria-hidden="true" />
              Buy 24-hour cleanup
            </a>
            <div className="mt-4 border-t border-[#eadcc8] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">
                After checkout
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6a5137]">
                Send the source file, Stripe receipt email, commodity, source country, and deadline.
                We return the cleaned pack within 24 hours.
              </p>
              <a
                href={orderHandoffHref}
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#d3b887] bg-white px-3 text-sm font-semibold text-[#3a2517] transition hover:bg-[#fff3dd]"
              >
                Send paid-cleanup file
              </a>
            </div>
          </section>
        </aside>
      </main>

      <MarketProofSections />

      <footer className="relative z-10 border-t border-[#dec8a6] bg-[#fffaf1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-[#6a5137] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Browser-side validation for launch. Paid cleanup files are submitted by email after checkout.</p>
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
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
              What TraceReady fixes
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#2b190f]">
              Clean the farm data before it reaches the buyer.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6a5137]">
              TraceReady turns the common EUDR file problems into visible repair work: what can be
              normalized, what needs supplier follow-up, and what is ready to pack.
            </p>

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
          </div>

          <div className="trace-card border border-[#d9bf92] bg-[#2d1a10] p-5 text-[#fff7e8] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f3b365]">
              Sample cleanup receipt
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">The output is a documented handoff.</h2>
            <p className="mt-3 text-sm leading-6 text-[#ecd8b8]">
              The pack gives operators a concise record of what was checked, what was fixed, and what
              still needs a supplier answer.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {SAMPLE_RECEIPT.map(([label, value]) => (
                <div key={label} className="border border-[#6f4b2b] bg-[#3d2416] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#d3aa73]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
              Cleanup pipeline
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {CLEANUP_STEPS.map((step) => (
                <div key={step.label} className="border-l-4 border-[#087f73] bg-white/72 p-4">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-[#dff5e8] text-sm font-semibold text-[#087f73]">
                    {step.label.slice(0, 1)}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-[#2b190f]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6a5137]">{step.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="trace-card border border-[#d9bf92] bg-[#fffaf2]/96 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f73]">
              Buyer pack contents
            </p>
            <ul className="mt-4 space-y-2">
              {PACK_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-medium text-[#3f2a1b]">
                  <CheckCircle2 className="size-4 shrink-0 text-[#087f73]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {AUDIENCE_GROUPS.map((group) => (
            <section key={group.title} className="border border-[#d9bf92] bg-[#fffaf2]/88 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#2b190f]">{group.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6a5137]">{group.detail}</p>
            </section>
          ))}
        </div>
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

function IssueTable({ issues }: { issues: ValidationIssue[] }) {
  return (
    <section className="trace-card overflow-hidden border border-[#d9bf92] bg-[#fffaf2]/95 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#eadcc8] px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2b190f]">Issue log</h2>
        <span className="text-sm text-[#7a6144]">{issues.length} found</span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-[#6a5137]">
          <CheckCircle2 className="size-5 text-[#087f73]" aria-hidden="true" />
          Upload a file to see blockers, warnings, and cleanup suggestions.
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
