import type { AnchorHTMLAttributes, ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CleanupCheckoutPage from "./checkout/cleanup/page";
import PilotCheckoutPage from "./checkout/pilot/page";
import ContactPage from "./contact/page";
import MethodologyPage from "./methodology/page";
import OrderIntakePage from "./order-intake/page";
import ProofPage from "./proof/page";
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

  it("publishes proof status without pretending the sample is customer proof", () => {
    act(() => {
      root.render(<ProofPage />);
    });

    const pageText = container.textContent ?? "";
    const sampleLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download representative sample pack"),
    );

    expect(pageText).toContain("Representative sample fixture");
    expect(pageText).toContain("not customer proof");
    expect(pageText).toContain("not transaction proof");
    expect(pageText).toContain("messy file in");
    expect(pageText).toContain("issue list");
    expect(pageText).toContain("cleaned pack out");
    expect(sampleLink?.getAttribute("href")).toBe("/traceready-sample-output.zip");
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

    expect(pageText).toContain("Run one supplier file before sending coordinates");
    expect(pageText).toContain("The first pass stays in your browser");
    expect(pageText).toContain("If the issue list is useful, buy the 24-hour cleanup");
    expect(browserCheckLink?.getAttribute("href")).toBe("/");
    expect(cleanupLink?.getAttribute("href")).toBe("/checkout/cleanup/");
    expect(contactLink?.getAttribute("href")).toBe("/contact/");
  });

  it("preserves proof-led route tracking when proof visitors continue to the browser checker", () => {
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

    expect(browserCheckLink?.getAttribute("href")).toBe(
      "/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r04",
    );
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
