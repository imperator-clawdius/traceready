import { act } from "react";
import type { ImgHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TraceReadyWorkbench } from "./TraceReadyWorkbench";

type MockImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src?: string };
};

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : (src.src ?? "")} alt={alt ?? ""} {...props} />
  ),
}));

describe("TraceReady conversion surface", () => {
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

  it("leads cold visitors to a free upload diagnosis before paid cleanup", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const headerText = container.querySelector("header")?.textContent ?? "";
    const heading = container.querySelector("h1")?.textContent ?? "";
    const uploadAction = Array.from(container.querySelectorAll("button, a")).find((element) =>
      element.textContent?.includes("Upload a farm file for free"),
    );
    const cleanupLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy 24-hour cleanup"),
    );
    const cleanupSectionText = cleanupLink?.closest("section")?.textContent ?? "";

    expect(heading).toContain("Check a farm file before a buyer rejects it.");
    expect(headerText).toContain("Upload a farm file for free");
    expect(headerText).toContain("Try a sample file");
    expect(headerText).not.toContain("Buy cleanup");
    expect(uploadAction?.tagName).toBe("BUTTON");
    expect(cleanupSectionText).toContain("After the diagnosis");
  });

  it("shows a concrete sample output proof on the launch surface", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("Sample diagnosis output");
    expect(pageText).toContain("Messy file in");
    expect(pageText).toContain("Cleaned buyer pack out");
    expect(pageText).toContain("No farm data leaves your browser during the free check.");
  });

  it("discloses the legal operator before a buyer opens Stripe checkout", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("TraceReady is operated by Passive Print Labs LLC");
    expect(pageText).toContain("Stripe checkout may show Passive Print Labs LLC");
    expect(pageText).toContain("Founder-operated cleanup desk");
  });

  it("offers a downloadable anonymized sample pack", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const samplePackLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download anonymized sample pack"),
    );

    expect(samplePackLink?.getAttribute("href")).toBe("/traceready-sample-output.zip");
  });

  it("frames paid cleanup as a precise three-step handoff", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const cleanupLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy 24-hour cleanup"),
    );
    const cleanupSectionText = cleanupLink?.closest("section")?.textContent ?? "";

    expect(cleanupSectionText).toContain("Buy cleanup in Stripe.");
    expect(cleanupSectionText).toContain(
      "Email the source file, commodity, source country, deadline, and buyer brief.",
    );
    expect(cleanupSectionText).toContain(
      "Receive the cleaned ZIP pack within 24 hours after payment and usable file receipt.",
    );
    expect(cleanupSectionText).toContain("If the file is outside launch scope, we clarify or refund before work begins.");
  });

  it("does not ask for another upload after a clean file has been analyzed", async () => {
    await act(async () => {
      root.render(<TraceReadyWorkbench />);
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const cleanCsv = `farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude
QA-1,Ama Mensah,Ghana,coffee,LOT-QA,2.2,6.2031,-1.7082
QA-2,Kofi Adu,Ghana,coffee,LOT-QA,3.2,6.3344,-1.6129
`;
    const file = new File([cleanCsv], "qa-ready.csv", { type: "text/csv" });

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.textContent).toContain("No issues found in this file.");
    expect(container.textContent).not.toContain("Upload a file to see blockers, warnings, and cleanup suggestions.");
  });
});
