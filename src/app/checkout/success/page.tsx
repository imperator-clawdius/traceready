import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_OPERATOR, ORDER_INTAKE_HREF } from "@/lib/site";

export const metadata = {
  title: "Checkout Success | TraceReady",
  description: "TraceReady checkout success handoff and order intake instructions.",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Checkout received
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            Send your cleanup files.
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-700">
            Email your Stripe receipt email, source file, commodity, source country, deadline, and buyer
            requirements to {CONTACT_EMAIL}. TraceReady is operated by {LEGAL_OPERATOR}.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ORDER_INTAKE_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Review order intake checklist
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Email TraceReady
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
