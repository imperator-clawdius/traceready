import Link from "next/link";
import { CreditCard, Download, Mail, ShieldCheck } from "lucide-react";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";
const LEGAL_OPERATOR = "Passive Print Labs LLC";
const SAMPLE_PACK_HREF = "/traceready-sample-output.zip";

type CheckoutHandoffProps = {
  title: string;
  price: string;
  description: string;
  stripeHref: string;
  nextSteps: string[];
};

export function CheckoutHandoff({ title, price, description, stripeHref, nextSteps }: CheckoutHandoffProps) {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border border-[#d9bf92] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              TraceReady checkout
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">{description}</p>

            <div className="mt-6 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">Stripe name check</p>
              <p className="mt-1">
                TraceReady checkout is branded as TraceReady. Payment operations, tax records, and support
                are handled by {LEGAL_OPERATOR}.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={stripeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                Continue to Stripe checkout
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                <Mail className="size-4" aria-hidden="true" />
                Ask a question first
              </a>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">Price</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2b190f]">{price}</p>
            </section>

            <section className="border border-[#d9bf92] bg-[#fffaf2] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7d5d32]">
                What happens next
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[#5d432b]">
                {nextSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            <a
              href={SAMPLE_PACK_HREF}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d9bf92] bg-white px-4 text-sm font-semibold text-[#2b190f] transition hover:bg-[#fff3dd]"
            >
              <Download className="size-4" aria-hidden="true" />
              Download anonymized sample pack
            </a>
          </aside>
        </section>

        <p className="mt-6 max-w-3xl text-xs leading-5 text-zinc-500">
          TraceReady is operational cleanup and validation only. It is not legal advice, audit assurance,
          certification, or a guarantee that a shipment satisfies EUDR or buyer requirements.
        </p>
      </div>
    </main>
  );
}
