"use client";

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

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "founder@traceready.online";
const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

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

  async function loadSample() {
    const file = new File([SAMPLE_CSV], "sample-coffee-export.csv", { type: "text/csv" });
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
    <div className="min-h-screen bg-[#f8f7f3] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">TraceReady</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              Clean farm files into EUDR-ready packs.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-700">
              Upload messy CSV, KML, or GeoJSON files for coffee and cocoa. Get cleaned farm records,
              geolocation output, issue logs, and a readiness report in one ZIP.
            </p>
          </div>

          <a
            href={buyHref}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            Buy cleanup - $149
          </a>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="space-y-6">
          <div
            className="border border-dashed border-zinc-300 bg-white p-6"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">Upload farm source file</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Accepted launch formats: CSV, KML, GeoJSON, JSON GeoJSON. Files are processed in
                  your browser for the MVP.
                </p>
                {activeFile ? (
                  <p className="mt-3 text-sm font-medium text-zinc-800">
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  onClick={() => inputRef.current?.click()}
                >
                  <UploadCloud className="size-4" aria-hidden="true" />
                  Choose file
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  onClick={() => void loadSample()}
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Load sample
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="mt-6 flex items-center gap-2 border-t border-zinc-100 pt-5 text-sm font-medium text-zinc-700">
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
          <section className="border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Readiness</h2>
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
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              onClick={() => void downloadPack()}
            >
              {isPacking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              Download compliance pack
            </button>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Operational readiness check only. Final EUDR due diligence remains the operator or
              trader responsibility.
            </p>
          </section>

          <section className="border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Launch conversion</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              For teams that need the messy file fixed, packaged, and returned instead of self-serve
              diagnosis.
            </p>
            <a
              href={buyHref}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              <CreditCard className="size-4" aria-hidden="true" />
              Buy 24-hour cleanup
            </a>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
        {value}
        <span className="text-sm text-zinc-500">{suffix}</span>
      </p>
    </div>
  );
}

function StatusBadge({ analysis }: { analysis: TraceReadyAnalysis | null }) {
  if (!analysis) {
    return <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">No file</span>;
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
    <section className="border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <h2 className="text-lg font-semibold">Issue log</h2>
        <span className="text-sm text-zinc-500">{issues.length} found</span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-zinc-600">
          <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" />
          Upload a file to see blockers, warnings, and cleanup suggestions.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-[0.1em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Field</th>
                <th className="px-4 py-3 font-semibold">Issue</th>
                <th className="px-4 py-3 font-semibold">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
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
                  <td className="max-w-44 px-4 py-3 align-top font-medium text-zinc-800">{issue.sourceLabel}</td>
                  <td className="px-4 py-3 align-top text-zinc-600">{issue.field}</td>
                  <td className="min-w-64 px-4 py-3 align-top text-zinc-800">{issue.message}</td>
                  <td className="min-w-64 px-4 py-3 align-top text-zinc-600">{issue.suggestion}</td>
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
