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
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.history.pushState({}, "", "/");
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

  it("shows one concrete representative before-and-after proof example on the launch surface", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";
    const sampleOutput = container.querySelector("#sample-output")?.textContent ?? "";

    expect(sampleOutput).toContain("Representative before-and-after");
    expect(sampleOutput).toContain("fictional sample fixture, not customer proof");
    expect(sampleOutput).toContain("Before: messy supplier CSV");
    expect(sampleOutput).toContain("COOP-018");
    expect(sampleOutput).toContain("lat: 183.421");
    expect(sampleOutput).toContain("Issues TraceReady catches");
    expect(sampleOutput).toContain("3 blockers");
    expect(sampleOutput).toContain("After: cleaned buyer pack");
    expect(sampleOutput).toContain(
      "Cleaned farm CSV, issue log, normalized GeoJSON, buyer summary, readiness report, EUDR checklist, and paid-cleanup intake note.",
    );
    expect(sampleOutput).not.toContain("cleaned_farms.csv");
    expect(sampleOutput).not.toContain("issue_log.csv");
    expect(sampleOutput).not.toContain("buyer_summary.md");
    expect(sampleOutput).not.toContain("No issues found");
    expect(pageText).toContain("No farm data leaves your browser during the free check.");
  });

  it("places operator credibility directly under the hero CTA", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const headerText = container.querySelector("header")?.textContent ?? "";

    expect(headerText).toContain("Founder proof");
    expect(headerText).toContain("founder-operated by Passive Print Labs LLC");
    expect(headerText).toContain("founder@traceready.online");
    expect(headerText).toContain("Built by a founder-side operator who has shipped");
    expect(headerText).toContain("open-source services, SaaS prototypes, Android wrappers, automation workflows");
    expect(headerText).toContain("regulated service operations");
    expect(headerText).toContain("not a mystery box with a checkout button");
    expect(headerText).not.toContain("teddyalston.com");
    expect(headerText).not.toContain("Orlando");
    expect(headerText).not.toContain("$1M");
    expect(headerText).not.toContain("500+");
    expect(headerText).not.toContain("theodore.alston@gmail.com");
    expect(headerText).toContain("deterministic checks");
    expect(headerText).toContain("not a legal certification");
    expect(headerText).toContain("Passive Print Labs LLC");
  });

  it("surfaces the public dataset audit on the main landing page", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";
    const proofLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("View public audit proof"),
    );

    expect(pageText).toContain("Public dataset proof");
    expect(pageText).toContain("57,658 public cocoa rows checked");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("57,658 rows without plot IDs");
    expect(pageText).toContain("57,658 rows without supplier identity");
    expect(pageText).toContain("not customer proof or legal certification");
    expect(proofLink?.getAttribute("href")).toBe("/proof/");
  });

  it("discloses the legal operator before a buyer opens Stripe checkout", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";
    const cleanupLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy 24-hour cleanup"),
    );
    const pilotLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Buy 5-file pilot"),
    );

    expect(pageText).toContain("TraceReady checkout is labeled as TraceReady");
    expect(pageText).toContain("operated by Passive Print Labs LLC");
    expect(pageText).toContain("Founder-operated cleanup desk");
    expect(pageText).toContain("Review order intake checklist");
    expect(cleanupLink?.getAttribute("href")).toBe("/checkout/cleanup/");
    expect(pilotLink?.getAttribute("href")).toBe("/checkout/pilot/");
  });

  it("offers a downloadable representative sample pack", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const samplePackLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download representative sample pack"),
    );

    expect(samplePackLink?.getAttribute("href")).toBe("/traceready-sample-output.zip");
    expect(container.textContent).toContain("not customer proof, transaction proof, buyer approval, or legal certification");
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
      "Use the order intake checklist to send the source file, receipt email, commodity, source country, deadline, and buyer requirements.",
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

  it("carries proof-led route attribution into copied buyer summaries", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.pushState(
      {},
      "",
      "/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );

    await act(async () => {
      root.render(<TraceReadyWorkbench />);
    });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const cleanCsv = `farm_id,supplier_name,country,commodity,batch_id,area_ha,latitude,longitude
QA-1,Ama Mensah,Ghana,coffee,LOT-QA,2.2,6.2031,-1.7082
`;
    const file = new File([cleanCsv], "qa-ready.csv", { type: "text/csv" });

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const copyButton = Array.from(container.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("Copy buyer summary"),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      copyButton?.click();
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Outreach route: b01-r06"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Outreach source: proof_led_batch_01"));
  });

  it("uses the KML sample to demonstrate detected cleanup work", async () => {
    await act(async () => {
      root.render(<TraceReadyWorkbench />);
    });

    const sampleKmlButton = Array.from(container.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("Sample KML"),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      sampleKmlButton?.click();
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("Selected: sample-coffee-export.kml");
    expect(pageText).toContain("Needs cleanup");
    expect(pageText).toContain("Issue evidence");
    expect(pageText).toContain("Plots over 4 hectares need polygon geometry");
    expect(pageText).not.toContain("No issues found in this file.");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("uses the GeoJSON sample to demonstrate detected cleanup work", async () => {
    await act(async () => {
      root.render(<TraceReadyWorkbench />);
    });

    const sampleGeoJsonButton = Array.from(container.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("Sample GeoJSON"),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      sampleGeoJsonButton?.click();
    });

    const pageText = container.textContent ?? "";

    expect(pageText).toContain("Selected: sample-cocoa-export.geojson");
    expect(pageText).toContain("Needs cleanup");
    expect(pageText).toContain("Issue evidence");
    expect(pageText).toContain("Plots over 4 hectares need polygon geometry");
    expect(pageText).not.toContain("No issues found in this file.");
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
