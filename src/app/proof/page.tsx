import Link from "next/link";
import {
  CONTACT_EMAIL,
  LEGAL_OPERATOR,
  METHODOLOGY_HREF,
  ORDER_INTAKE_HREF,
  SAMPLE_PACK_HREF,
} from "@/lib/site";

const OUTPUTS = [
  "traceready-cleaned-farms.csv",
  "traceready-issues.csv",
  "traceready-geolocation.geojson",
  "traceready-buyer-summary.txt",
  "traceready-readiness-report.txt",
  "traceready-eudr-checklist.json",
  "traceready-paid-cleanup-intake.txt",
];

export const metadata = {
  title: "Proof | TraceReady",
  description: "TraceReady sample output, proof status, and buyer-facing limits.",
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
            Representative sample fixture, plain limits.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            The current public sample shows the product mechanics: messy file in, issue list, cleaned
            pack out. It is a fictional fixture for inspection, not customer proof, not transaction proof,
            not buyer approval, and not legal certification.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Before</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Messy source rows</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Duplicate farm ID, bad coordinate, missing supplier identity, and a point-only large plot.
            </p>
          </section>
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">During</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Issue list</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Blockers and warnings stay visible so the buyer can see what was fixed and what still needs
              supplier confirmation.
            </p>
          </section>
          <section className="border border-[#d9bf92] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">After</p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b190f]">Cleaned pack out</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              A ZIP with clean tabular data, normalized geolocation, a buyer summary, and operational
              readiness artifacts.
            </p>
          </section>
        </div>

        <section className="mt-6 border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2b190f]">Files in the sample pack</h2>
          <ul className="mt-4 grid gap-2 text-sm font-medium text-[#3f2a1b] sm:grid-cols-2">
            {OUTPUTS.map((output) => (
              <li key={output} className="border border-[#eadcc8] bg-white px-3 py-2">
                {output}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={SAMPLE_PACK_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Download representative sample pack
            </a>
            <Link
              href={METHODOLOGY_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Read methodology
            </Link>
            <Link
              href={ORDER_INTAKE_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Order intake checklist
            </Link>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Public proof will be upgraded only when it is true and permissioned: customer quote, company
          name, paid order count, turnaround metric, or de-identified customer before/after. Until then,
          TraceReady is clear that this public pack is a fictional inspection fixture operated by{" "}
          {LEGAL_OPERATOR}. Questions: {CONTACT_EMAIL}.
        </p>
      </div>
    </main>
  );
}
