import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_HREF, LEGAL_OPERATOR, ORDER_INTAKE_HREF } from "@/lib/site";

export const metadata = {
  title: "Privacy | TraceReady",
  description: "How TraceReady handles farm files, paid cleanup requests, and contact information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to TraceReady
        </Link>

        <h1 className="mt-6 text-3xl font-semibold">Privacy</h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated June 14, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-950">Self-serve file checks</h2>
            <p className="mt-2">
              The launch validator processes uploaded CSV, KML, GeoJSON, and JSON files in your browser.
              TraceReady does not intentionally upload, store, or read those self-serve files from the website.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Paid cleanup files</h2>
            <p className="mt-2">
              If you buy a cleanup pass and email a source file, we use that file to prepare the requested
              compliance pack and communicate with you about the order. Do not send unrelated personal,
              financial, or sensitive information.
            </p>
            <p className="mt-2">
              Buyer files are treated as confidential order material. They are kept only as long as needed
              to fulfill the order, support the customer, and maintain payment or accounting records, and
              they can be deleted on request after delivery unless retention is legally required.
            </p>
            <p className="mt-2">
              Paid cleanup files are not sold or published. They are not used to train AI or machine-learning
              models.
            </p>
            <p className="mt-2">
              The order intake checklist asks only for the receipt email, source files, commodity, source
              country, deadline, and buyer requirements needed to complete the cleanup.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Payments and service providers</h2>
            <p className="mt-2">
              Payments are handled by Stripe and TraceReady is operated by {LEGAL_OPERATOR}. Email,
              hosting, analytics, and other operational providers may process limited data needed to run the
              service, receive orders, and respond to support requests.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Contact</h2>
            <p className="mt-2">
              For privacy requests or cleanup-order questions, email{" "}
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={ORDER_INTAKE_HREF}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Order intake checklist
              </Link>
              <Link
                href={CONTACT_HREF}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Contact TraceReady
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
