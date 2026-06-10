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
});
