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
    const triageLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Request free issue-log triage"),
    );
    const fieldNoteLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Field note"),
    );
    const pilotProofLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Pilot proof"),
    );
    const cleanupSectionText = cleanupLink?.closest("section")?.textContent ?? "";

    expect(heading).toContain("Check a farm file before a buyer rejects it.");
    expect(headerText).toContain("Upload a farm file for free");
    expect(headerText).toContain("Try a sample file");
    expect(headerText).not.toContain("Buy cleanup");
    expect(uploadAction?.tagName).toBe("BUTTON");
    expect(cleanupSectionText).toContain("After the diagnosis");
    expect(cleanupSectionText).toContain("not ready to send raw coordinates");
    expect(triageLink?.getAttribute("href")).toBe("/file-triage/");
    expect(fieldNoteLink?.getAttribute("href")).toBe("/field-notes/eudr-file-errors/");
    expect(pilotProofLink?.getAttribute("href")).toBe("/pilot-proof/");
  });

  it("does not clip vertical page scrolling at the app shell", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const shellClasses = container.querySelector(".trace-botanical-shell")?.className.split(/\s+/) ?? [];

    expect(shellClasses).toContain("overflow-x-hidden");
    expect(shellClasses).not.toContain("overflow-hidden");
  });

  it("preserves outreach route attribution when a diagnosed visitor asks for free triage", () => {
    window.history.pushState(
      {},
      "",
      "/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );

    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const triageLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Request free issue-log triage"),
    );

    expect(triageLink?.getAttribute("href")).toBe(
      "/file-triage/?utm_source=proof_led_batch_01&utm_medium=outreach&utm_campaign=eudr_file_readiness&utm_content=b01-r06",
    );
  });

  it("leads with one real public-data pilot instead of fictional proof", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";
    const pilotCase = container.querySelector("#pilot-case")?.textContent ?? "";

    expect(pilotCase).toContain("Public-data pilot");
    expect(pilotCase).toContain("57,658 real cocoa rows checked; 0 were buyer-ready.");
    expect(pilotCase).toContain("public Colombian cocoa dataset");
    expect(pilotCase).toContain("did not invent missing IDs, suppliers, batches, or polygons");
    expect(pilotCase).toContain("46,134");
    expect(pilotCase).toContain("point-only plots over 4 ha");
    expect(pilotCase).toContain("missing plot IDs");
    expect(pilotCase).toContain("ready records");
    expect(pilotCase).toContain("Exact issue counts");
    expect(pilotCase).toContain("buyer/supplier follow-up list");
    expect(pilotCase).toContain("Download evidence pack");
    expect(pilotCase).not.toContain("fictional sample fixture");
    expect(pilotCase).not.toContain("Founder proof");
    expect(pageText).toContain("The free diagnosis stays in your browser.");
  });

  it("removes generic founder biography from the hero proof area", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const headerText = container.querySelector("header")?.textContent ?? "";

    expect(headerText).toContain("Public-data pilot");
    expect(headerText).toContain("Exact issue counts");
    expect(headerText).not.toContain("Founder proof");
    expect(headerText).not.toContain("founder-operated by Passive Print Labs LLC");
    expect(headerText).not.toContain("founder@traceready.online");
    expect(headerText).not.toContain("Small-team advantage");
    expect(headerText).not.toContain("regulated tax and advisory operations");
    expect(headerText).not.toContain("AI systems builds");
    expect(headerText).not.toContain("public and private product launches");
    expect(headerText).not.toContain("enough spreadsheet mileage");
    expect(headerText).not.toContain("No enterprise theater");
    expect(headerText).not.toContain("teddyalston.com");
    expect(headerText).not.toContain("Teddy");
    expect(headerText).not.toContain("Orlando");
    expect(headerText).not.toContain("$1M");
    expect(headerText).not.toContain("500+");
    expect(headerText).not.toContain("12+");
    expect(headerText).not.toContain("theodore.alston@gmail.com");
    expect(headerText).not.toContain("IRS");
    expect(headerText).not.toContain("Florida");
  });

  it("surfaces the public dataset audit on the main landing page", () => {
    act(() => {
      root.render(<TraceReadyWorkbench />);
    });

    const pageText = container.textContent ?? "";
    const proofLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("View pilot case"),
    );
    const evidencePackLink = Array.from(container.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Download evidence pack"),
    );

    expect(pageText).toContain("Public-data pilot");
    expect(pageText).toContain("57,658");
    expect(pageText).toContain("public cocoa rows checked");
    expect(pageText).toContain("57,658 real cocoa rows checked; 0 were buyer-ready.");
    expect(pageText).toContain("46,134 point-only plots over 4 hectares");
    expect(pageText).toContain("57,658 rows without plot IDs");
    expect(pageText).toContain("57,658 rows without supplier identity");
    expect(pageText).toContain("did not invent missing IDs, suppliers, batches, or polygons");
    expect(proofLink?.getAttribute("href")).toBe("/proof/public-cocoa-pilot/");
    expect(evidencePackLink?.getAttribute("href")).toBe("/traceready-public-cocoa-pilot-pack.zip");
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
    expect(pageText).toContain("TraceReady cleanup desk");
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
