import Link from "next/link";
import {
  FILE_TRIAGE_HREF,
  LEGAL_OPERATOR,
  METHODOLOGY_HREF,
  PROOF_HREF,
  PUBLIC_PILOT_PACK_HREF,
} from "@/lib/site";
import { PilotProofMailLink } from "./PilotProofMailLink";

const PILOT_STEPS = [
  {
    title: "1. Send issue counts first",
    detail:
      "Run the browser check and paste blockers, warnings, file type, field names, commodity, source country, and buyer deadline. Do not include raw coordinates or confidential supplier rows.",
  },
  {
    title: "2. Scope one real file",
    detail:
      "If the file is in scope, TraceReady replies with the cleanup scope, quote, and the exact anonymized facts that could become proof.",
  },
  {
    title: "3. Publish only with permission",
    detail:
      "A case study needs explicit approval for anonymized issue counts, before/after structure, and one short quote. No company name, supplier names, coordinates, or buyer files are published.",
  },
];

const PROOF_OUTPUTS = [
  "Anonymized before: file type, row count, issue counts, and blocker categories.",
  "Anonymized after: cleaned-pack contents, issues fixed, and remaining buyer/supplier follow-ups.",
  "One permissioned sentence about whether the issue log or cleaned pack was useful.",
];

export const metadata = {
  title: "Documented Pilot | TraceReady",
  description: "Request a TraceReady documented pilot that can become an anonymized case study with permission.",
};

export default function PilotProofPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={PROOF_HREF} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to proof
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Documented pilot
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Let one real messy file become the first anonymized case.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            TraceReady still needs a permissioned real-world case. If you have a coffee or cocoa farm
            file that is creating buyer-review rework, start with non-sensitive issue counts. If the
            cleanup is useful, we can document the before/after without publishing your company,
            suppliers, buyers, or coordinates.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <PilotProofMailLink
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Email documented pilot request
            </PilotProofMailLink>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Run browser check
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {PILOT_STEPS.map((step) => (
            <article key={step.title} className="border border-[#d9bf92] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2b190f]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-700">{step.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2b190f]">What can become public proof</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5d432b]">
            {PROOF_OUTPUTS.map((item) => (
              <li key={item} className="border-l-2 border-emerald-700 pl-3">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={PUBLIC_PILOT_PACK_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              View current public pilot pack
            </a>
            <Link
              href={FILE_TRIAGE_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Use free issue-log triage instead
            </Link>
            <Link
              href={METHODOLOGY_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Read methodology
            </Link>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          TraceReady is operated by {LEGAL_OPERATOR}. A documented pilot is operational file cleanup
          and proof collection only: not legal advice, not certification, not TRACES submission, and not
          proof of deforestation-free status.
        </p>
      </div>
    </main>
  );
}
