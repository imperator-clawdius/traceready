import Link from "next/link";
import {
  CHECKOUT_CLEANUP_HREF,
  CONTACT_EMAIL,
  CONTACT_HREF,
  FIELD_NOTE_EUDR_FILE_ERRORS_HREF,
  LEGAL_OPERATOR,
  PUBLIC_PILOT_CASE_HREF,
  PUBLIC_PILOT_PACK_MANIFEST_HREF,
  PUBLIC_PILOT_PACK_HREF,
} from "@/lib/site";
import { TrackedHomeLink } from "./TrackedHomeLink";
import { TrackedPilotProofLink } from "./TrackedPilotProofLink";
import { TrackedTriageLink } from "./TrackedTriageLink";

const AUDIT_STATS = [
  {
    label: "Public cocoa rows checked",
    value: "57,658",
    detail: "Rows downloaded from the public Colombian-Cocoa-Dataset and normalized for TraceReady checks.",
  },
  {
    label: "Point-only plots over 4 hectares",
    value: "46,134",
    detail: "Rows where area exceeds the launch-readiness polygon threshold but only point coordinates are present.",
  },
  {
    label: "Rows without plot IDs",
    value: "57,658",
    detail: "Coordinates existed, but row-level farm or plot identifiers were absent from the buyer-handoff view.",
  },
  {
    label: "Rows without supplier identity",
    value: "57,658",
    detail: "No supplier, producer, farmer, or supplier ID field was available for traceability handoff.",
  },
];

const EU_EUDR_FAQ_HREF =
  "https://www.eeas.europa.eu/sites/default/files/documents/2024/240314_EN_FAQ%20EUDR%20%281%29_0.pdf";
const DAARNHOUWER_GEOLOCATION_GUIDE_HREF = "https://daarnhouwer.com/eudr/eudr-geolocation-data/";

export const metadata = {
  title: "Proof | TraceReady",
  description: "TraceReady public-data pilot, exact issue counts, output format, and buyer-facing limits.",
};

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Proof status
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Public-data pilot, exact limits.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            This is the current trust asset: one real public cocoa dataset treated like a buyer handoff
            file, exact issues found, and an honest output boundary. It is not a customer case, not a
            paid transaction, not buyer approval, and not legal certification.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Before</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Messy public file in</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Public source rows: 57,658 rows with latitude, longitude, and area values, but no plot
              IDs, supplier identity, batch linkage, or polygon geometry in the buyer-handoff view.
            </p>
          </section>
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">During</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Exact issue counts out</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Issue log: TraceReady found 161,450 blockers, 57,658 warnings, and 46,134 point-only
              plots over 4 hectares that need polygon follow-up before buyer review.
            </p>
          </section>
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">After</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Cleaned pack boundary</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Handoff out: buyer/supplier follow-up list and issue evidence. TraceReady does not
              fabricate missing supplier IDs, plot IDs, batch IDs, or polygon boundaries.
            </p>
          </section>
        </div>

        <section className="mt-6 border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Real-world problem
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2b190f]">
            The buyer handoff fails before legal review starts.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            TraceReady&apos;s public proof is not founder biography. It is a measured file problem:
            the regulation asks for plot-level geolocation, buyers ask suppliers for structured
            farm files, and 57,658 rows with coordinates still produced a repair brief instead of a
            buyer-ready pack.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <article className="border border-[#eadcc8] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#2b190f]">Regulatory pressure</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                The{" "}
                <a
                  href={EU_EUDR_FAQ_HREF}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  EU EUDR FAQ
                </a>{" "}
                says due diligence statements need plot coordinates, and plots over 4 hectares
                need polygon boundaries instead of a single point.
              </p>
            </article>
            <article className="border border-[#eadcc8] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#2b190f]">Buyer handoff pressure</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                The{" "}
                <a
                  href={DAARNHOUWER_GEOLOCATION_GUIDE_HREF}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Daarnhouwer supplier geolocation guide
                </a>{" "}
                asks coffee and cocoa suppliers for WGS84 GeoJSON, CSV, or Excel geolocation
                files with a unique and persistent farm ID.
              </p>
            </article>
            <article className="border border-[#eadcc8] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#2b190f]">Measured TraceReady proof</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Public audit result: 0 buyer-ready records, 46,134 point-only plots over 4
                hectares, and every row missing plot ID and supplier identity.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-6 border border-emerald-800 bg-[#123f34] p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Evidence pack
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Download the public pilot output.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50">
            The ZIP contains the readiness report, issue-summary CSV, buyer/supplier follow-up list,
            one-page case study, buyer-style handoff summary, and audit JSON used for this public-data
            pilot. For this source file, the cleaned output is a repair brief: derived counts, method
            notes, and source-owner follow-up questions, not raw source rows or coordinates.
          </p>
          <a
            href={PUBLIC_PILOT_CASE_HREF}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#123f34] transition hover:bg-emerald-50"
          >
            View public pilot case
          </a>
          <a
            href={PUBLIC_PILOT_PACK_HREF}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:ml-3 sm:mt-5"
          >
            Download public pilot evidence pack
          </a>
          <a
            href={PUBLIC_PILOT_PACK_MANIFEST_HREF}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:ml-3 sm:mt-5"
          >
            View checksum manifest
          </a>
        </section>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Public dataset mini-audit
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2b190f]">
            Coordinates are not the same thing as a buyer-ready handoff.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            57,658 public cocoa rows checked: TraceReady found 46,134 point-only plots over 4
            hectares, 57,658 rows without plot IDs, and 57,658 rows without supplier identity. This
            is not a customer file, not buyer approval, and not legal certification; it is proof that a
            geolocation-heavy file can still fail basic handoff readiness.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {AUDIT_STATS.map((stat) => (
              <article key={stat.label} className="border border-[#eadcc8] bg-[#fffaf2] p-4">
                <p className="text-2xl font-semibold tabular-nums text-[#2b190f]">{stat.value}</p>
                <h3 className="mt-2 text-sm font-semibold text-[#3f2a1b]">{stat.label}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{stat.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 border-t border-[#eadcc8] pt-5 text-sm leading-6 text-zinc-700 lg:grid-cols-2">
            <p>
              Source:{" "}
              <a
                href="https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Colombian-Cocoa-Dataset
              </a>
              . TraceReady supplied country and commodity from public metadata, then left plot IDs,
              supplier identity, batch IDs, and polygon geometry blank when the row data did not
              provide them.
            </p>
            <p>
              Rule reference:{" "}
              <a
                href="https://www.cbi.eu/market-information/coffee/tips-become-eudr-compliant"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                CBI EUDR coffee guidance
              </a>{" "}
              states that polygon mapping is mandatory for coffee plots larger than 4 hectares.
              TraceReady applies that launch-readiness threshold to coffee and cocoa file checks.
            </p>
          </div>
          <Link
            href={FIELD_NOTE_EUDR_FILE_ERRORS_HREF}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Read the field note
          </Link>
        </section>

        <section className="mt-6 border border-emerald-800 bg-[#123f34] p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Next step for a real file
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Run one supplier file before sending coordinates.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50">
            The first pass stays in your browser: load a CSV, KML, GeoJSON, or JSON GeoJSON file,
            review the row-level blockers, and decide whether the issue list is worth cleaning up.
            If the issue list is useful, buy the 24-hour cleanup and send the file through the
            order-intake path.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TrackedHomeLink
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#123f34] transition hover:bg-emerald-50"
            >
              Run a file in the browser
            </TrackedHomeLink>
            <TrackedTriageLink
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Request free issue-log triage
            </TrackedTriageLink>
            <Link
              href={CHECKOUT_CLEANUP_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Buy 24-hour cleanup
            </Link>
            <Link
              href={CONTACT_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Ask a scope question
            </Link>
            <TrackedPilotProofLink
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Offer documented pilot
            </TrackedPilotProofLink>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Public proof will be upgraded only when it is true and permissioned: customer quote, company
          name, paid order count, turnaround metric, or de-identified customer before/after. Until then,
          TraceReady is clear that the public-data pilot is not a customer case or buyer approval.
          Operated by {LEGAL_OPERATOR}. Questions: {CONTACT_EMAIL}.
        </p>
      </div>
    </main>
  );
}
