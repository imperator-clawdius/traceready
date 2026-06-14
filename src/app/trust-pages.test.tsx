import type { AnchorHTMLAttributes, ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CleanupCheckoutPage from "./checkout/cleanup/page";
import PilotCheckoutPage from "./checkout/pilot/page";
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
    expect(pageText).toContain("Stripe checkout is branded as TraceReady");
    expect(pageText).toContain("Buy cleanup in Stripe");
    expect(pageText).toContain("Email the source file, commodity, source country, deadline, and buyer summary");
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
    expect(pageText).toContain("TraceReady checkout is branded as TraceReady");
    expect(pageText).toContain("Passive Print Labs LLC");
    expect(pageText).toContain("Download anonymized sample pack");
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
    expect(pageText).toContain("TraceReady checkout is branded as TraceReady");
    expect(pageText).toContain("Passive Print Labs LLC");
    expect(pageText).toContain("Receive a batch cleanup summary and cleaned packs");
    expect(stripeLink?.getAttribute("href")).toContain("https://buy.stripe.com/");
  });
});
