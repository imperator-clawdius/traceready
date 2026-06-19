import { describe, expect, it } from "vitest";
import {
  buildDirectOutreachEmailPayload,
  parseDirectOutreachPeople,
  parseDirectOutreachSendArgs,
  renderDirectOutreachPitch,
  runDirectOutreachEmailSend,
  selectDirectOutreachContact,
} from "./send-direct-outreach-email.mjs";

const CONTACTS_CSV = `priority,person_name,business,title_at_business,email,phone,phone_type,country,segment,why_this_person,source_url,source_notes,contact_route
1,Isabel Reimann,InterAmerican Coffee GmbH,Sustainability,isabel.reimann@nkg.coffee,+49 40 36123 334,direct,Germany,coffee importer,Best first formal target,https://interamericancoffee.de/hamburg/,Official team page,direct_person
2,Alec Oyhenart,Nordic Approach,Director of Operations,alec@nordicapproach.no,+47 910 01 244,direct,Norway,coffee importer,Operations owner,https://www.nordicapproach.no/contact,Official team page,direct_person
`;

describe("direct outreach email sender", () => {
  it("selects a contact by priority and builds the founder@ Brevo payload", () => {
    const contact = selectDirectOutreachContact(parseDirectOutreachPeople(CONTACTS_CSV), { priority: "1" });
    const payload = buildDirectOutreachEmailPayload(contact);

    expect(payload.sender).toEqual({ name: "TraceReady", email: "founder@traceready.online" });
    expect(payload.to).toEqual([{ name: "Isabel Reimann", email: "isabel.reimann@nkg.coffee" }]);
    expect(payload.subject).toBe("Quick EUDR file check before buyer review");
    expect(payload.textContent).toContain("Hi Isabel,");
    expect(payload.textContent).toContain("57,658 rows in");
    expect(payload.textContent).toContain("Coordinates do not leave the machine during the free check.");
    expect(payload.textContent).toContain("founder@traceready.online");
  });

  it("renders the formal pitch without personal biography details", () => {
    const contact = selectDirectOutreachContact(parseDirectOutreachPeople(CONTACTS_CSV), { email: "alec@nordicapproach.no" });
    const pitch = renderDirectOutreachPitch(contact);

    expect(pitch).toContain("Hi Alec,");
    expect(pitch).toContain("I run TraceReady");
    expect(pitch).not.toMatch(/teddyalston|personal|biography|resume/i);
  });

  it("defaults to dry-run and does not call the provider sender", async () => {
    const result = await runDirectOutreachEmailSend({
      csv: CONTACTS_CSV,
      args: { priority: "1" },
      sendEmail: async () => {
        throw new Error("provider should not be called for dry-run");
      },
    });

    expect(result.sent).toBe(false);
    expect(result.statusLine).toContain("DIRECT_OUTREACH_EMAIL_DRY_RUN=ready");
    expect(result.payload.to[0].email).toBe("isabel.reimann@nkg.coffee");
  });

  it("refuses a live send unless the confirmation email matches the selected contact", async () => {
    await expect(
      runDirectOutreachEmailSend({
        csv: CONTACTS_CSV,
        args: { priority: "1", send: true, confirmEmail: "wrong@nkg.coffee" },
        sendEmail: async () => ({ messageId: "should-not-send" }),
      }),
    ).rejects.toThrow("confirm-email must match isabel.reimann@nkg.coffee before sending");
  });

  it("sends through an injected provider only after explicit matching confirmation", async () => {
    const sentPayloads = [];
    const result = await runDirectOutreachEmailSend({
      csv: CONTACTS_CSV,
      args: { priority: "2", send: true, confirmEmail: "alec@nordicapproach.no" },
      sendEmail: async (payload) => {
        sentPayloads.push(payload);
        return { messageId: "<brevo-test-message>" };
      },
    });

    expect(sentPayloads).toHaveLength(1);
    expect(sentPayloads[0].to[0].email).toBe("alec@nordicapproach.no");
    expect(result.sent).toBe(true);
    expect(result.statusLine).toContain("DIRECT_OUTREACH_EMAIL_SENT=accepted");
    expect(result.providerResponse).toEqual({ messageId: "<brevo-test-message>" });
  });

  it("parses CLI flags for a guarded send", () => {
    expect(
      parseDirectOutreachSendArgs([
        "--contacts",
        "private/outreach-people-2026-06-18.csv",
        "--priority",
        "1",
        "--send",
        "--confirm-email",
        "isabel.reimann@nkg.coffee",
        "--evidence-output",
        "private/direct-outreach-send-p01.json",
      ]),
    ).toEqual({
      contactsPath: "private/outreach-people-2026-06-18.csv",
      priority: "1",
      email: null,
      send: true,
      confirmEmail: "isabel.reimann@nkg.coffee",
      evidenceOutputPath: "private/direct-outreach-send-p01.json",
    });
  });
});
