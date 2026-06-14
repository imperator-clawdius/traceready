import Link from "next/link";
import {
  CONTACT_EMAIL,
  LEGAL_OPERATOR,
  ORDER_INTAKE_HREF,
  PROOF_HREF,
  SAMPLE_PACK_HREF,
} from "@/lib/site";

const CHECKS = [
  "CSV, KML, GeoJSON, and JSON GeoJSON format detection",
  "required farm, supplier, commodity, country, and batch fields",
  "invalid latitude/longitude, swapped coordinate order, missing geolocation, and zero-point risk",
  "duplicate farm IDs and repeated rows that can break buyer imports",
  "plots over 4 hectares that still use point-only geometry",
  "open polygons and malformed KML or GeoJSON geometry",
];

export const metadata = {
  title: "Methodology | TraceReady",
  description: "How TraceReady checks, cleans, and limits farm file outputs for EUDR preparation.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Methodology
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Deterministic checks before manual cleanup.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            TraceReady starts with browser-side deterministic checks. The free diagnosis reads the source
            file locally, normalizes common field names, detects data blockers, and shows the exact issue
            list before any paid cleanup decision.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border border-[#d9bf92] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">Checks run</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
              {CHECKS.map((check) => (
                <li key={check} className="border-l-2 border-emerald-600 pl-3">
                  {check}
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-4">
            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2b190f]">What TraceReady never invents</h2>
              <p className="mt-3 text-sm leading-6 text-[#5d432b]">
                TraceReady does not invent supplier names, farm IDs, missing origin countries, polygon
                boundaries, buyer approval, deforestation clearance, or due-diligence statements.
              </p>
            </section>
            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2b190f]">AI and data handling</h2>
              <p className="mt-3 text-sm leading-6 text-[#5d432b]">
                No model training is performed on self-serve uploads or paid cleanup files. Paid files are
                confidential order material handled by {LEGAL_OPERATOR}.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 text-sm leading-7 text-zinc-700 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2b190f]">Output logic</h2>
          <p className="mt-3">
            A returned pack can include cleaned CSV, issue CSV, normalized GeoJSON, readiness report,
            buyer summary, EUDR checklist, and paid-cleanup intake note. The checklist records whether
            each deterministic check passed, needs review, or blocked the file.
          </p>
          <p className="mt-3">
            TraceReady is not legal certification, audit assurance, customs advice, or a guarantee that a
            shipment satisfies EUDR or buyer requirements. It is a file-quality and handoff workflow for
            teams preparing data before buyer or importer review.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={SAMPLE_PACK_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Download representative sample pack
            </a>
            <Link
              href={PROOF_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              View proof status
            </Link>
            <Link
              href={ORDER_INTAKE_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Order intake checklist
            </Link>
          </div>
          <p className="mt-5 text-xs text-zinc-500">Questions: {CONTACT_EMAIL}</p>
        </section>
      </div>
    </main>
  );
}
