import type { AnchorHTMLAttributes, ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CleanupCheckoutPage from "./checkout/cleanup/page";
import PilotCheckoutPage from "./checkout/pilot/page";
import ContactPage from "./contact/page";
import FileTriagePage from "./file-triage/page";
import EudrFileErrorsPage from "./field-notes/eudr-file-errors/page";
import MethodologyPage from "./methodology/page";
import OrderIntakePage from "./order-intake/page";
import PilotProofPage from "./pilot-proof/page";
import ProofPage from "./proof/page";
import PublicCocoaPilotPage from "./proof/public-cocoa-pilot/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
};

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("TraceReady trust pages", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.history.pushState({}, "", "/");
  });

  it("states retention, deletion, confidentiality, and no-training handling for buyer files", () => {
    act(() => {
      root.render(<PrivacyPage />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("kept only as long as needed to fulfill the order");
    expect(pageText).toContain("deleted on request after delivery");
    expect(pageText).toContain("treated as confidential order material");
    expect(pageText).toContain("not used to train AI or machine-learning models");
  });

  it("makes the legal operator and paid-cleanup handoff explicit", () => {
    act(() => {
      root.render(<TermsPage />);
    });

    const pageText = container.textContent ?? "";
    const cleanupLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy cleanup"),
    );
    const pilotLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy 5-file pilot"),
    );

    expect(pageText).toContain("TraceReady is operated by Passive Print Labs LLC");
    expect(pageText).toContain("Stripe checkout is labeled as TraceReady");
    expect(pageText).toContain("Buy cleanup in Stripe");
    expect(pageText).toContain("Use the order intake checklist");
    expect(pageText).toContain("Email the source file, receipt email, commodity, source country, deadline, and buyer requirements");
    expect(pageText).toContain("Receive the cleaned ZIP pack within 24 hours after payment and usable file receipt");
    expect(cleanupLink?.getAttribute("href")).toBe("/checkout/cleanup/");
    expect(pilotLink?.getAttribute("href")).toBe("/checkout/pilot/");
  });

  it("shows TraceReady and legal-operator context before the single-file Stripe handoff", () => {
    act(() => {
      root.render(<CleanupCheckoutPage />);
    });

    const pageText = container.textContent ?? "";
    const stripeLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Continue to Stripe checkout"),
    );

    expect(pageText).toContain("TraceReady 24-hour cleanup");
    expect(pageText).toContain("Operator and payment");
    expect(pageText).toContain("TraceReady checkout is labeled as TraceReady");
    expect(pageText).toContain("Passive Print Labs LLC");
    expect(pageText).toContain("Download representative sample pack");
    expect(pageText).toContain("Review order intake checklist");
    expect(stripeLink?.getAttribute("href")).toContain("https://buy.stripe.com/");
  });

  it("shows TraceReady and legal-operator context before the pilot Stripe handoff", () => {
    act(() => {
      root.render(<PilotCheckoutPage />);
    });

    const pageText = container.textContent ?? "";
    const stripeLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Continue to Stripe checkout"),
    );

    expect(pageText).toContain("TraceReady 5-file pilot");
    expect(pageText).toContain("Operator and payment");
    expect(pageText).toContain("TraceReady checkout is labeled as TraceReady");
    expect(pageText).toContain("Passive Print Labs LLC");
    expect(pageText).toContain("Receive a batch cleanup summary and cleaned packs");
    expect(pageText).toContain("Review order intake checklist");
    expect(stripeLink?.getAttribute("href")).toBe("https://buy.stripe.com/dRm6oH9SH8l671l59W8IU03");
  });

  it("explains the deterministic cleanup methodology and limits", () => {
    act(() => {
      root.render(<MethodologyPage />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("Deterministic checks");
    expect(pageText).toContain("What TraceReady never invents");
    expect(pageText).toContain("invalid latitude/longitude");
    expect(pageText).toContain("duplicate farm IDs");
    expect(pageText).toContain("plots over 4 hectares");
    expect(pageText).toContain("No model training");
    expect(pageText).toContain("not legal certification");
  });

  it("publishes proof status around the public-data pilot without pretending it is a customer case", () => {
    act(() => {
      root.render(<ProofPage />);
    });

    const pageText = container.textContent ?? "";
    const pilotPackLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download public pilot evidence pack"),
    );
    const sampleLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download representative sample pack"),
    );

    expect(pageText).toContain("Public-data pilot, exact limits");
    expect(pageText).toContain("one real public cocoa dataset");
    expect(pageText).toContain("not a customer case");
    expect(pageText).toContain("not a paid transaction");
    expect(pageText).toContain("Public source rows");
    expect(pageText).toContain("Issue log");
    expect(pageText).toContain("Handoff out");
    expect(pageText).toContain("does not fabricate missing supplier IDs");
    expect(pageText).toContain("Evidence pack");
    expect(pageText).toContain("readiness report, issue-summary CSV, buyer/supplier follow-up list");
    expect(pageText).toContain("buyer-style handoff summary");
    expect(pageText).toContain("the cleaned output is a repair brief");
    expect(pageText).toContain("not raw source rows or coordinates");
    expect(pageText).toContain("Messy public file in");
    expect(pageText).toContain("Exact issue counts out");
    expect(pageText).toContain("Cleaned pack boundary");
    expect(pageText).not.toContain("Format example pack");
    expect(pageText).not.toContain("fictional fixture");
    expect(pilotPackLink?.getAttribute("href")).toBe("/traceready-public-cocoa-pilot-pack.zip");
    expect(sampleLink).toBeUndefined();
  });

  it("publishes the public cocoa dataset mini-audit as proof-led outreach evidence", () => {
    act(() => {
      root.render(<ProofPage />);
    });

    const pageText = container.textContent ?? "";
    const sourceLinks = Array.from(container.querySelectorAll("a"));
    const datasetLink = sourceLinks.find((element) =>
      element.textContent?.includes("Colombian-Cocoa-Dataset"),
    );
    const cbiLink = sourceLinks.find((element) =>
      element.textContent?.includes("CBI EUDR coffee guidance"),
    );

    expect(pageText).toContain("Public dataset mini-audit");
    expect(pageText).toContain("57,658 public cocoa rows checked");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("57,658 rows without plot IDs");
    expect(pageText).toContain("57,658 rows without supplier identity");
    expect(pageText).toContain("not a customer file");
    expect(pageText).toContain("not legal certification");
    expect(datasetLink?.getAttribute("href")).toBe("https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset");
    expect(cbiLink?.getAttribute("href")).toBe("https://www.cbi.eu/market-information/coffee/tips-become-eudr-compliant");
  });

  it("connects the measured public audit to real EUDR buyer handoff pressure", () => {
    act(() => {
      root.render(<ProofPage />);
    });

    const pageText = container.textContent ?? "";
    const sourceLinks = Array.from(container.querySelectorAll("a"));
    const euFaqLink = sourceLinks.find((element) => element.textContent?.includes("EU EUDR FAQ"));
    const importerGuideLink = sourceLinks.find((element) =>
      element.textContent?.includes("Daarnhouwer supplier geolocation guide"),
    );

    expect(pageText).toContain("Real-world problem");
    expect(pageText).toContain("The buyer handoff fails before legal review starts");
    expect(pageText).toContain("0 buyer-ready records");
    expect(pageText).toContain("57,658 rows with coordinates still produced a repair brief");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("every row missing plot ID and supplier identity");
    expect(pageText).toContain("WGS84 GeoJSON, CSV, or Excel");
    expect(pageText).toContain("unique and persistent farm ID");
    expect(pageText).toContain("not founder biography");
    expect(euFaqLink?.getAttribute("href")).toBe(
      "https://www.eeas.europa.eu/sites/default/files/documents/2024/240314_EN_FAQ%20EUDR%20%281%29_0.pdf",
    );
    expect(importerGuideLink?.getAttribute("href")).toBe("https://daarnhouwer.com/eudr/eudr-geolocation-data/");
  });

  it("publishes a standalone public cocoa pilot case page for cold outreach proof", () => {
    act(() => {
      root.render(<PublicCocoaPilotPage />);
    });

    const pageText = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll("a"));
    const packLink = links.find((element) =>
      element.textContent?.includes("Download evidence pack"),
    );
    const triageLink = links.find((element) =>
      element.textContent?.includes("Request free issue-log triage"),
    );

    expect(pageText).toContain("Public cocoa pilot case");
    expect(pageText).toContain("Messy public file in");
    expect(pageText).toContain("57,658 rows with coordinates and area values");
    expect(pageText).toContain("Exact issues found");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("Cleaned pack out");
    expect(pageText).toContain("Decision: hold for source-owner repair");
    expect(pageText).toContain("the cleaned output is a repair brief");
    expect(pageText).toContain("reproducibility manifest");
    expect(pageText).toContain("audit JSON");
    expect(pageText).toContain("not a customer case");
    expect(pageText).not.toContain("fictional fixture");
    expect(packLink?.getAttribute("href")).toBe("/traceready-public-cocoa-pilot-pack.zip");
    expect(triageLink?.getAttribute("href")).toBe("/file-triage/");
  });

  it("publishes a shareable field note that turns the public audit into outreach credibility", () => {
    act(() => {
      root.render(<EudrFileErrorsPage />);
    });

    const pageText = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll("a"));
    const datasetLink = links.find((element) => element.textContent?.includes("Colombian-Cocoa-Dataset"));
    const regulationLink = links.find((element) => element.textContent?.includes("EU EUDR FAQ"));
    const triageLink = links.find((element) => element.textContent?.includes("Request free issue-log triage"));
    const proofLink = links.find((element) => element.textContent?.includes("View public audit proof"));

    expect(pageText).toContain("7 EUDR file errors that create buyer-review rework");
    expect(pageText).toContain("57,658 public cocoa rows");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("missing plot IDs");
    expect(pageText).toContain("missing supplier identity");
    expect(pageText).toContain("duplicate farm IDs");
    expect(pageText).toContain("not legal certification");
    expect(pageText).toContain("Post-ready summary");
    expect(datasetLink?.getAttribute("href")).toBe("https://www.kaggle.com/datasets/lehetasa/colombian-cocoa-dataset");
    expect(regulationLink?.getAttribute("href")).toBe(
      "https://www.eeas.europa.eu/sites/default/files/documents/2024/240314_EN_FAQ%20EUDR%20%281%29_0.pdf",
    );
    expect(triageLink?.getAttribute("href")).toBe("/file-triage/");
    expect(proofLink?.getAttribute("href")).toBe("/proof/");
  });

  it("turns the proof page into a low-trust file-check landing path", () => {
    act(() => {
      root.render(<ProofPage />);
    });

    const pageText = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll("a"));
    const browserCheckLink = links.find((element) =>
      element.textContent?.includes("Run a file in the browser"),
    );
    const cleanupLink = links.find((element) =>
      element.textContent?.includes("Buy 24-hour cleanup"),
    );
    const contactLink = links.find((element) =>
      element.textContent?.includes("Ask a scope question"),
    );
    const triageLink = links.find((element) =>
      element.textContent?.includes("Request free issue-log triage"),
    );
    const fieldNoteLink = links.find((element) =>
      element.textContent?.includes("Read the field note"),
    );
    const pilotProofLink = links.find((element) =>
      element.textContent?.includes("Offer documented pilot"),
    );

    expect(pageText).toContain("Run one supplier file before sending coordinates");
    expect(pageText).toContain("The first pass stays in your browser");
    expect(pageText).toContain("If the issue list is useful, buy the 24-hour cleanup");
    expect(browserCheckLink?.getAttribute("href")).toBe("/");
    expect(cleanupLink?.getAttribute("href")).toBe("/checkout/cleanup/");
    expect(contactLink?.getAttribute("href")).toBe("/contact/");
    expect(triageLink?.getAttribute("href")).toBe("/file-triage/");
    expect(fieldNoteLink?.getAttribute("href")).toBe("/field-notes/eudr-file-errors/");
    expect(pilotProofLink?.getAttribute("href")).toBe("/pilot-proof/");
  });

  it("offers a documented pilot route for earning a permissioned anonymized case", () => {
    act(() => {
      root.render(<PilotProofPage />);
    });

    const pageText = container.textContent ?? "";
    const emailLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Email documented pilot request"),
    );
    const triageLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Use free issue-log triage instead"),
    );
    const pilotPackLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("View current public pilot pack"),
    );

    expect(pageText).toContain("Documented pilot");
    expect(pageText).toContain("first anonymized case");
    expect(pageText).toContain("Do not include raw coordinates");
    expect(pageText).toContain("Publish only with permission");
    expect(pageText).toContain("Anonymized before: file type, row count, issue counts");
    expect(pageText).toContain("one short quote");
    expect(pageText).toContain("Permission boundary");
    expect(pageText).toContain("Can publish only with explicit yes");
    expect(pageText).toContain("Stays private even if the pilot is useful");
    expect(pageText).toContain("company name, supplier names, buyer names, coordinates, source rows");
    expect(pageText).toContain("If permission is no, TraceReady still treats the cleanup as private work");
    expect(emailLink?.getAttribute("href")).toContain("mailto:founder@traceready.online");
    expect(emailLink?.getAttribute("href")).toContain("TraceReady%20documented%20pilot%20request");
    expect(triageLink?.getAttribute("href")).toBe("/file-triage/");
    expect(pilotPackLink?.getAttribute("href")).toBe("/traceready-public-cocoa-pilot-pack.zip");
  });

  it("preserves proof-led route tracking when proof visitors continue to the browser checker, triage handoff, or documented pilot", () => {
    window.history.pushState(
      {},
      "",
      "/proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );

    act(() => {
      root.render(<ProofPage />);
    });

    const browserCheckLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Run a file in the browser"),
    );
    const triageLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Request free issue-log triage"),
    );
    const pilotProofLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Offer documented pilot"),
    );

    expect(browserCheckLink?.getAttribute("href")).toBe(
      "/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );
    expect(triageLink?.getAttribute("href")).toBe(
      "/file-triage/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );
    expect(pilotProofLink?.getAttribute("href")).toBe(
      "/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );
  });

  it("stamps proof-led route tracking into documented pilot email handoffs", () => {
    window.history.pushState(
      {},
      "",
      "/pilot-proof/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );

    act(() => {
      root.render(<PilotProofPage />);
    });

    const emailLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Email documented pilot request"),
    );
    const decodedHref = decodeURIComponent(emailLink?.getAttribute("href") ?? "");

    expect(decodedHref).toContain("Outreach route: b01-r04");
    expect(decodedHref).toContain("Outreach source: proof_led_batch_01");
    expect(decodedHref).toContain("Outreach campaign: eudr_file_readiness");
    expect(decodedHref).toContain("What stays private even if the pilot is useful");
    expect(decodedHref).toContain("company name, supplier names, buyer names, coordinates, source rows");
    expect(decodedHref).toContain("If permission is no, treat the cleanup as private work only");
  });

  it("offers a non-sensitive free triage handoff before asking for source files or payment", () => {
    act(() => {
      root.render(<FileTriagePage />);
    });

    const pageText = container.textContent ?? "";
    const emailLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Email issue-log triage request"),
    );
    const pilotProofLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Offer documented pilot"),
    );

    expect(pageText).toContain("Free issue-log triage");
    expect(pageText).toContain("Do not send raw farm coordinates first");
    expect(pageText).toContain("Paste issue counts, field names, and a non-sensitive sample row shape");
    expect(pageText).toContain("24-hour cleanup");
    expect(emailLink?.getAttribute("href")).toContain("mailto:founder@traceready.online");
    expect(emailLink?.getAttribute("href")).toContain("TraceReady%20free%20issue-log%20triage");
    expect(pilotProofLink?.getAttribute("href")).toBe("/pilot-proof/");
  });

  it("stamps proof-led route tracking into free triage email handoffs", () => {
    window.history.pushState(
      {},
      "",
      "/file-triage/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );

    act(() => {
      root.render(<FileTriagePage />);
    });

    const emailLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Email issue-log triage request"),
    );
    const decodedHref = decodeURIComponent(emailLink?.getAttribute("href") ?? "");

    expect(decodedHref).toContain("Outreach route: b01-r04");
    expect(decodedHref).toContain("Outreach source: proof_led_batch_01");
    expect(decodedHref).toContain("Outreach campaign: eudr_file_readiness");
  });

  it("provides a tighter paid-order intake handoff", () => {
    act(() => {
      root.render(<OrderIntakePage />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("Order intake checklist");
    expect(pageText).toContain("Stripe receipt email");
    expect(pageText).toContain("source files");
    expect(pageText).toContain("commodity and source country");
    expect(pageText).toContain("buyer requirements");
    expect(pageText).toContain("clarify or refund before work begins");
    expect(pageText).toContain("not used to train AI or machine-learning models");
  });

  it("adds a contact surface for order, scope, and privacy questions", () => {
    act(() => {
      root.render(<ContactPage />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("founder@traceready.online");
    expect(pageText).toContain("order questions");
    expect(pageText).toContain("file-scope questions");
    expect(pageText).toContain("privacy or deletion requests");
    expect(pageText).toContain("Passive Print Labs LLC");
  });
});
