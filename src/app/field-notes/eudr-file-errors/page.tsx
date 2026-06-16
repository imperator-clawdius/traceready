import Link from "next/link";
import {
  FIELD_NOTE_EUDR_FILE_ERRORS_HREF,
  FILE_TRIAGE_HREF,
  LEGAL_OPERATOR,
  PROOF_HREF,
} from "@/lib/site";

const DATASET_URL = "https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset";
const EUDR_FAQ_URL =
  "https://www.eeas.europa.eu/sites/default/files/documents/2024/240314_EN_FAQ%20EUDR%20%281%29_0.pdf";

const ERROR_PATTERNS = [
  {
    title: "1. Point-only plots over 4 hectares",
    detail:
      "The public audit found 46,134 rows where area exceeded 4 hectares but the handoff still had point coordinates instead of polygon geometry.",
  },
  {
    title: "2. Missing plot IDs",
    detail:
      "All 57,658 checked rows lacked a stable farm or plot identifier in the buyer-handoff view, which makes row-level fixes hard to discuss.",
  },
  {
    title: "3. Missing supplier identity",
    detail:
      "All 57,658 rows also lacked supplier, producer, farmer, or supplier-ID fields in the normalized handoff view.",
  },
  {
    title: "4. Duplicate farm IDs",
    detail:
      "Duplicate plot identifiers and duplicate farm IDs are routine failure modes in TraceReady checks because one row can silently overwrite or contradict another.",
  },
  {
    title: "5. Invalid latitude or longitude",
    detail:
      "Bad ranges, zero points, swapped coordinate order, and empty geolocation cells create cleanup work before anyone can review risk.",
  },
  {
    title: "6. Missing batch or shipment context",
    detail:
      "A farm list without batch, lot, shipment, commodity, or origin context is difficult to attach to a specific buyer request.",
  },
  {
    title: "7. Mixed or broken file structure",
    detail:
      "CSV, KML, GeoJSON, Excel exports, and pasted spreadsheets often carry the same facts in different columns and geometry shapes.",
  },
];

export const metadata = {
  title: "7 EUDR File Errors | TraceReady",
  description:
    "A public TraceReady field note on seven farm-file defects that create buyer-review rework before EUDR due diligence.",
};

export default function EudrFileErrorsPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <Link href={PROOF_HREF} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Back to public proof
        </Link>

        <section className="mt-6 border border-[#d9bf92] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Field note
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2b190f]">
            7 EUDR file errors that create buyer-review rework.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            I ran 57,658 public cocoa rows through TraceReady to test the handoff problem behind
            EUDR geolocation work. The file had coordinates, but it still surfaced 46,134
            point-only plots over 4 hectares, 57,658 rows with missing plot IDs, and 57,658 rows
            with missing supplier identity.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">
            This is not legal certification, not a due diligence statement, and not customer proof.
            It is a public file-readiness stress test: the kind of issue list a small importer,
            exporter, roaster, or consultant can inspect before deciding whether a supplier file is
            worth cleaning up.
          </p>
        </section>

        <section className="mt-6 border border-[#d9bf92] bg-[#fffaf2] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#2b190f]">The seven failure patterns</h2>
          <div className="mt-5 grid gap-3">
            {ERROR_PATTERNS.map((pattern) => (
              <section key={pattern.title} className="border border-[#eadcc8] bg-white p-4">
                <h3 className="text-base font-semibold text-[#3f2a1b]">{pattern.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{pattern.detail}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="border border-[#d9bf92] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2b190f]">Sources and limits</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-700">
              Dataset:{" "}
              <a href={DATASET_URL} className="font-semibold text-emerald-700 hover:text-emerald-800">
                Colombian-Cocoa-Dataset
              </a>
              . TraceReady supplied commodity and country from public metadata, then left missing
              fields blank when the row data did not provide them.
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-700">
              Rule reference: the{" "}
              <a href={EUDR_FAQ_URL} className="font-semibold text-emerald-700 hover:text-emerald-800">
                EU EUDR FAQ
              </a>{" "}
              explains that plots over 4 hectares for relevant commodities other than cattle require
              polygon geolocation. TraceReady uses that as an operational readiness check, not as a
              legal conclusion.
            </p>
          </div>

          <div className="border border-[#d9bf92] bg-[#123f34] p-6 text-white shadow-sm">
            <h2 className="text-lg font-semibold">Post-ready summary</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50">
              I analyzed 57,658 public cocoa farm-location rows. The practical surprise was not
              missing coordinates; it was that coordinate-heavy files can still be bad buyer
              handoffs: 46,134 point-only plots over 4 hectares, 57,658 missing plot IDs, and
              57,658 missing supplier identities. TraceReady is built for that narrow cleanup step:
              show the issue list in the browser, then clean the file only if the rework is real.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={FILE_TRIAGE_HREF}
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#123f34] transition hover:bg-emerald-50"
              >
                Request free issue-log triage
              </Link>
              <Link
                href={PROOF_HREF}
                className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-100 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                View public audit proof
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Permanent link: {FIELD_NOTE_EUDR_FILE_ERRORS_HREF}. TraceReady is operated by{" "}
          {LEGAL_OPERATOR}. This field note is operational file-readiness commentary only.
        </p>
      </article>
    </main>
  );
}
