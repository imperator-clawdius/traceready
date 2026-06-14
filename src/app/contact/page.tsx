import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_OPERATOR, ORDER_INTAKE_HREF } from "@/lib/site";

const CONTACT_REASONS = [
  "order questions after Stripe checkout",
  "file-scope questions before buying cleanup",
  "privacy or deletion requests for paid cleanup files",
  "buyer requirements that need to be reflected in the returned pack",
];

export const metadata = {
  title: "Contact | TraceReady",
  description: "Contact TraceReady for order questions, file scope, and privacy requests.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Contact
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            TraceReady order desk.
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-700">
            TraceReady is founder-operated by {LEGAL_OPERATOR}. Use the domain inbox for order
            questions, file-scope questions, and privacy or deletion requests.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <section className="mt-6 border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2b190f]">Best reasons to email</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5d432b]">
            {CONTACT_REASONS.map((reason) => (
              <li key={reason} className="border-l-2 border-emerald-700 pl-3">
                {reason}
              </li>
            ))}
          </ul>
          <Link
            href={ORDER_INTAKE_HREF}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            Review order intake checklist
          </Link>
        </section>
      </div>
    </main>
  );
}
