import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateLaunchCheckout } from "./verify-launch.mjs";
import { checkoutOffer } from "./verify-sale-readiness.mjs";

describe("launch verifier route manifest", () => {
  it("checks the free issue-log triage route in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "FILE_TRIAGE_PAGE"');
    expect(script).toContain('path: "/file-triage/"');
    expect(script).toContain("Free issue-log triage");
    expect(script).toContain("Do not send raw farm coordinates first");
  });

  it("checks the public EUDR file-errors field note in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "FIELD_NOTE_EUDR_FILE_ERRORS_PAGE"');
    expect(script).toContain('path: "/field-notes/eudr-file-errors/"');
    expect(script).toContain("7 EUDR file errors that create buyer-review rework");
    expect(script).toContain("46,134 point-only plots over 4 hectares");
  });

  it("checks the public pilot evidence pack CTA in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "PUBLIC_COCOA_PILOT_CASE_PAGE"');
    expect(script).toContain('path: "/proof/public-cocoa-pilot/"');
    expect(script).toContain("Public cocoa pilot case");
    expect(script).toContain("Download evidence pack");
    expect(script).toContain("Download public pilot evidence pack");
    expect(script).toContain("/traceready-public-cocoa-pilot-pack.zip");
    expect(script).toContain("Messy public file in");
    expect(script).toContain("Exact issue counts out");
    expect(script).toContain("Cleaned pack boundary");
    expect(script).not.toContain("Format example pack");
  });

  it("checks the public pilot manifest in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "PUBLIC_COCOA_PILOT_MANIFEST"');
    expect(script).toContain('path: "/samples/traceready-public-cocoa-pilot/public-cocoa-pilot-pack-manifest.json"');
    expect(script).toContain('"packType": "public-data-pilot"');
    expect(script).toContain('"noRawCoordinates": true');
    expect(script).toContain('"sha256"');
  });

  it("checks the homepage public pilot proof strip in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");
    const appRootBlock = script.match(/label: "APP_ROOT"[\s\S]*?},\n  \{/)?.[0] ?? "";

    expect(appRootBlock).toContain("Try sample");
    expect(appRootBlock).toContain("See proof");
    expect(appRootBlock).toContain("One documented pilot");
    expect(appRootBlock).toContain("Messy file in. Exact issues found. Cleaned pack out.");
    expect(appRootBlock).toContain("46,134 over-4ha point-only plots");
    expect(appRootBlock).toContain("not a customer quote");
    expect(appRootBlock).toContain("checksum manifest");
    expect(appRootBlock).toContain("records ready for buyer handoff");
    expect(appRootBlock).toContain("Four clicks. No demo maze.");
    expect(appRootBlock).toContain("Read the blocker list");
    expect(appRootBlock).toContain("Start tutorial");
    expect(appRootBlock).toContain("Use the result");
    expect(appRootBlock).not.toContain("Cleanup-desk credibility");
    expect(appRootBlock).not.toContain("file-room brain and a launch checklist");
    expect(appRootBlock).not.toContain("spreadsheet bouncer");
  });

  it("checks the documented pilot route in live launch verification", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "PILOT_PROOF_PAGE"');
    expect(script).toContain('path: "/pilot-proof/"');
    expect(script).toContain("first anonymized case");
    expect(script).toContain("Email documented pilot request");
    expect(script).toContain("Permission boundary");
    expect(script).toContain("Can publish only with explicit yes");
    expect(script).toContain("Case capture packet");
    expect(script).toContain("Download pilot evidence template");
    expect(script).toContain("/traceready-documented-pilot-template.txt");
  });

  it("checks the paid-intake gate on checkout and order intake routes", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");

    expect(script).toContain('label: "CLEANUP_CHECKOUT_PAGE"');
    expect(script).toContain('label: "PILOT_CHECKOUT_PAGE"');
    expect(script).toContain('label: "ORDER_INTAKE_PAGE"');
    expect(script).toContain("Do not pay or send raw farm coordinates before scope confirmation");
    expect(script).toContain("Email scope request first");
    expect(script).toContain("evaluateLaunchCheckout");
    expect(script).toContain("HTTP_200_ALONE_IS_NOT_ACTIVATION_PROOF");
    expect(script).toContain("After scope confirmation and checkout");
  });

  it("checks that the proof page keeps cleanup scope-first instead of buy-first", () => {
    const script = fs.readFileSync("scripts/verify-launch.mjs", "utf8");
    const proofPageBlock = script.match(/label: "PROOF_PAGE"[\s\S]*?},\n  \{/)?.[0] ?? "";

    expect(proofPageBlock).toContain("Request scoped cleanup");
    expect(proofPageBlock).toContain("TraceReady confirms launch scope before raw coordinates or Stripe payment");
    expect(proofPageBlock).not.toContain("Buy 24-hour cleanup");
  });
});

describe("deployed checkout verification", () => {
  const expected = checkoutOffer("cleanup");
  const now = Date.parse("2026-10-02T18:00:00.000Z");
  const providerEvidence = { href: expected.stripeHref, title: expected.title, amount: 14900, currency: "usd", active: true, verifiedAt: new Date(now).toISOString(), verificationMethod: "rendered_stripe_checkout" };
  const enabledHtml = `<h1>${expected.title}</h1><p>${expected.price}</p><fieldset data-checkout-url="${expected.stripeHref}"><input type="checkbox" required></fieldset><a href="/order-intake/">Intake</a><a href="mailto:founder@traceready.online">Scope</a>`;
  const lockedHtml = '<a href="mailto:founder@traceready.online?subject=scope">Email scope request first</a>';

  it("requires enabled public handoff for an active released offer", () => {
    expect(evaluateLaunchCheckout(enabledHtml, { offer: "cleanup", providerEvidence, now }).ready).toBe(true);
    expect(evaluateLaunchCheckout(lockedHtml, { offer: "cleanup", providerEvidence, now }).ready).toBe(false);
  });

  it("permits a known inactive offer only while its payment action stays closed", () => {
    const inactiveEvidence = { ...providerEvidence, active: false };
    expect(evaluateLaunchCheckout(lockedHtml, { offer: "cleanup", providerEvidence: inactiveEvidence, now }).ready).toBe(true);
    expect(evaluateLaunchCheckout(enabledHtml, { offer: "cleanup", providerEvidence: inactiveEvidence, now }).ready).toBe(false);
  });

  it("does not treat missing activation evidence as a launched offer", () => {
    expect(evaluateLaunchCheckout(enabledHtml, { offer: "cleanup", now }).ready).toBe(false);
    expect(evaluateLaunchCheckout(lockedHtml, { offer: "cleanup", now }).ready).toBe(false);
  });

  it("supports explicit diagnostics of intentionally locked checkout", () => {
    expect(evaluateLaunchCheckout(lockedHtml, { offer: "cleanup", allowLockedCheckout: true, now }).ready).toBe(true);
  });
});
