import Link from "next/link";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "founder@traceready.online";

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
        <p className="mt-3 text-sm text-zinc-500">Last updated June 2, 2026</p>

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
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950">Payments and service providers</h2>
            <p className="mt-2">
              Payments are handled by Stripe. Email, hosting, analytics, and other operational providers may
              process limited data needed to run the service, receive orders, and respond to support requests.
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
          </section>
        </div>
      </div>
    </main>
  );
}
