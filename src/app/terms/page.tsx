import Link from "next/link";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";
const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";

export const metadata = {
  title: "Terms | TraceReady",
  description: "Launch terms for TraceReady self-serve validation and paid cleanup.",
};

export default function TermsPage() {
  const buyHref =
    PAYMENT_LINK ||
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("TraceReady 24-hour cleanup")}`;

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <h1 className="mt-6 text-3xl font-semibold">Terms</h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated June 2, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-950">What TraceReady provides</h2>
            <p className="mt-2">
              TraceReady cleans and validates messy farm CSV, KML, GeoJSON, and JSON GeoJSON files for
              coffee and cocoa teams preparing EUDR due-diligence packs. Outputs may include cleaned CSV,
              geolocation GeoJSON, issue logs, checklists, buyer summaries, and readiness reports.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">No legal certification</h2>
            <p className="mt-2">
              TraceReady is an operational cleanup and validation tool. It is not legal advice, customs
              advice, certification, audit assurance, or a guarantee that a shipment satisfies EUDR or buyer
              requirements. Operators, traders, importers, and exporters remain responsible for final due
              diligence decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Paid cleanup</h2>
            <p className="mt-2">
              A cleanup pass covers one submitted source file or one clearly related shipment pack. The
              24-hour turnaround starts after payment, receipt of the usable source file, and any essential
              order context. If the file is outside the launch scope, we may request clarification, propose a
              custom quote, or refund the order before work begins.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Customer responsibilities</h2>
            <p className="mt-2">
              You are responsible for providing accurate farm, supplier, commodity, lot, and location data;
              reviewing the returned outputs; and deciding whether additional field verification, supplier
              documentation, deforestation checks, or legal review is required.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Contact and checkout</h2>
            <p className="mt-2">
              Questions can be sent to{" "}
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <a
              href={buyHref}
              target={PAYMENT_LINK ? "_blank" : undefined}
              rel={PAYMENT_LINK ? "noopener noreferrer" : undefined}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Buy cleanup - $149
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
