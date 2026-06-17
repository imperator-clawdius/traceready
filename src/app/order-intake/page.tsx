import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_OPERATOR, METHODOLOGY_HREF, PROOF_HREF } from "@/lib/site";

const CHECKLIST = [
  "scope confirmation thread",
  "Stripe receipt email",
  "company and contact name",
  "source files or related shipment pack",
  "commodity and source country",
  "deadline and buyer requirements",
  "buyer summary or issue log if generated in TraceReady",
];

export const metadata = {
  title: "Order Intake | TraceReady",
  description: "TraceReady paid cleanup order intake checklist and fulfillment expectations.",
};

export default function OrderIntakePage() {
  const subject = encodeURIComponent("TraceReady order intake");
  const body = encodeURIComponent(
    [
      "TraceReady order intake",
      "",
      "Scope confirmation thread:",
      "Stripe receipt email:",
      "Company:",
      "Contact name:",
      "Cleanup type: 24-hour cleanup or 5-file pilot",
      "Commodity:",
      "Source country:",
      "Deadline:",
      "Buyer requirements:",
      "",
      "Files attached:",
      "- ",
      "",
      "Notes:",
    ].join("\n"),
  );

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Paid cleanup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Order intake checklist.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            After scope confirmation and checkout, email the checklist below to {CONTACT_EMAIL}. Do not
            send raw farm coordinates before scope confirmation. The cleanup clock starts after scope
            confirmation, payment, usable source files, and essential buyer context are received.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border border-[#d9bf92] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">Send these fields</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700">
              {CHECKLIST.map((item) => (
                <li key={item} className="border-l-2 border-emerald-600 pl-3">
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Email intake checklist
            </a>
          </section>

          <aside className="space-y-4">
            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2b190f]">Scope promise</h2>
              <p className="mt-3 text-sm leading-6 text-[#5d432b]">
                If the file is outside launch scope, TraceReady will clarify or refund before work begins.
              </p>
            </section>
            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2b190f]">Privacy</h2>
              <p className="mt-3 text-sm leading-6 text-[#5d432b]">
                Buyer files are confidential order material and are not used to train AI or
                machine-learning models.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 text-sm leading-7 text-zinc-700 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2b190f]">Fulfillment notes</h2>
          <p className="mt-3">
            The $149 cleanup covers one source file or one clearly related shipment pack. The $745 pilot
            covers up to five related supplier files submitted together. TraceReady returns a cleaned ZIP
            pack or batch cleanup summary after usable file receipt.
          </p>
          <p className="mt-3">
            TraceReady is operated by {LEGAL_OPERATOR}. It is operational file cleanup, not legal advice,
            audit assurance, certification, or buyer approval.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={METHODOLOGY_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Read methodology
            </Link>
            <Link
              href={PROOF_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              View proof status
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
