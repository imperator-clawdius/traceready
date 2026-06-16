import Link from "next/link";
import {
  FIELD_NOTE_EUDR_FILE_ERRORS_HREF,
  FILE_TRIAGE_HREF,
  PROOF_HREF,
  PUBLIC_PILOT_PACK_HREF,
} from "@/lib/site";

const ISSUE_ROWS = [
  ["Records analyzed", "57,658", "Public cocoa rows checked by TraceReady."],
  ["Point-only plots over 4 hectares", "46,134", "Rows that need polygon follow-up before buyer review."],
  ["Rows without plot IDs", "57,658", "No stable farm or plot ID in the buyer-handoff view."],
  ["Rows without supplier identity", "57,658", "No supplier, producer, farmer, cooperative, or supplier-ID field."],
  ["Rows without shipment linkage", "57,658", "No batch, lot, shipment, or purchase-order linkage."],
  ["Ready records", "0", "No row was ready without source-owner repair."],
];

export const metadata = {
  title: "Public Cocoa Pilot Case | TraceReady",
  description:
    "TraceReady public cocoa pilot case: messy public file in, exact issues found, and a cleaned-pack boundary.",
};

export default function PublicCocoaPilotPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={PROOF_HREF} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to proof
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Public cocoa pilot case
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-[#2b190f]">
            57,658 public cocoa rows checked; zero were buyer-ready.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            This is the shareable case for TraceReady&apos;s current proof asset. It is not a
            customer case, not a paid transaction, not buyer approval, and not legal certification.
            It shows what happened when one real public cocoa dataset was treated like a buyer
            handoff file.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Input</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Messy public file in</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              57,658 rows with coordinates and area values from the public Colombian-Cocoa-Dataset.
              Country and commodity came from public metadata. Plot IDs, supplier identity, shipment
              linkage, and polygon geometry were not invented.
            </p>
          </section>

          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Analysis</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Exact issues found</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              TraceReady found 46,134 point-only plots over 4 hectares, 57,658 rows without plot IDs,
              57,658 rows without supplier identity, and 57,658 rows without shipment linkage.
            </p>
          </section>

          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Output</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Cleaned pack out</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Decision: hold for source-owner repair. For this source file, the cleaned output is a
              repair brief, issue summary, buyer handoff summary, and follow-up list.
            </p>
          </section>
        </div>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[#2b190f]">Issue ledger</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border border-[#eadcc8] text-left text-sm">
              <thead className="bg-[#fff4df] text-xs uppercase tracking-[0.1em] text-[#7d5d32]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Check</th>
                  <th className="px-4 py-3 font-semibold">Count</th>
                  <th className="px-4 py-3 font-semibold">Buyer meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eadcc8]">
                {ISSUE_ROWS.map(([check, count, meaning]) => (
                  <tr key={check}>
                    <td className="px-4 py-3 font-semibold text-[#2b190f]">{check}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-[#2b190f]">{count}</td>
                    <td className="px-4 py-3 leading-6 text-zinc-700">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 border border-emerald-800 bg-[#123f34] p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Inspectable output
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Download the evidence pack.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50">
            The ZIP contains the readiness report, issue-summary CSV, buyer-style handoff summary,
            buyer/supplier follow-up list, reproducibility manifest, and audit JSON. It contains
            derived proof artifacts only, not raw source rows or farm coordinates.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={PUBLIC_PILOT_PACK_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#123f34] transition hover:bg-emerald-50"
            >
              Download evidence pack
            </a>
            <Link
              href={FILE_TRIAGE_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Request free issue-log triage
            </Link>
            <Link
              href={FIELD_NOTE_EUDR_FILE_ERRORS_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Read field note
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
