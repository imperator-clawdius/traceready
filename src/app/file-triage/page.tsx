import Link from "next/link";
import {
  CHECKOUT_CLEANUP_HREF,
  LEGAL_OPERATOR,
  METHODOLOGY_HREF,
  ORDER_INTAKE_HREF,
  PROOF_HREF,
} from "@/lib/site";
import { TriageMailLink } from "./TriageMailLink";

const TRIAGE_ITEMS = [
  "Issue counts from TraceReady: blockers, warnings, duplicate farm IDs, missing fields, and point-only over-4ha records.",
  "Column names or field names from the source file, with sensitive supplier names removed if needed.",
  "One non-sensitive sample row shape, such as farm_id, supplier_name, area_ha, latitude, longitude.",
  "Commodity, source country, deadline, and what the buyer or importer asked for.",
];

export const metadata = {
  title: "Free Issue-Log Triage | TraceReady",
  description: "Ask TraceReady to review non-sensitive issue counts before sending raw farm coordinates.",
};

export default function FileTriagePage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={PROOF_HREF} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to proof
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Free issue-log triage
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Show the failure pattern before you send the farm file.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            Do not send raw farm coordinates first. Run the browser-side check. Paste issue counts,
            field names, and a non-sensitive sample row shape. I can tell you whether the file looks
            like a quick fix, a 24-hour cleanup, or a bad fit before you share confidential supplier
            data.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <TriageMailLink
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Email issue-log triage request
            </TriageMailLink>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Run browser check
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">What to paste</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5d432b]">
              {TRIAGE_ITEMS.map((item) => (
                <li key={item} className="border-l-2 border-emerald-700 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-[#d9bf92] bg-white p-6 text-sm leading-7 text-zinc-700 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">What happens next</h2>
            <p className="mt-3">
              If the issue pattern is in scope, TraceReady can turn one messy source file into a
              cleaned CSV, row-level issue log, normalized GeoJSON, and buyer summary through the
              24-hour cleanup path.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={CHECKOUT_CLEANUP_HREF}
                className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                View 24-hour cleanup
              </Link>
              <Link
                href={ORDER_INTAKE_HREF}
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Review intake checklist
              </Link>
              <Link
                href={METHODOLOGY_HREF}
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Read methodology
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          TraceReady is operated by {LEGAL_OPERATOR}. Free triage is operational scope review only:
          not legal advice, not certification, not TRACES submission, and not proof of deforestation-free
          status.
        </p>
      </div>
    </main>
  );
}
