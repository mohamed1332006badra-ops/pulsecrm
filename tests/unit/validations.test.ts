import { describe, it, expect } from "vitest";
import {
  createContactSchema,
  createDealSchema,
  webhookLeadPayloadSchema,
  aiAnalysisOutputSchema,
} from "@/lib/validations";

describe("Validation Schemas Unit Tests", () => {
  describe("createContactSchema", () => {
    it("accepts valid contact attributes", () => {
      const valid = {
        name: "Ahmed Soliman",
        email: "ahmed@cairoheavy.com",
        phone: "+201004567890",
        company_name: "Cairo Heavy Equipment",
        status: "new",
      };
      const result = createContactSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const invalid = {
        email: "ahmed@cairoheavy.com",
      };
      const result = createContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects malformed email format", () => {
      const invalid = {
        name: "Ahmed",
        email: "not-an-email",
      };
      const result = createContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createDealSchema", () => {
    it("validates deal title, UUIDs, and numeric value", () => {
      const valid = {
        title: "Excavator Procurement",
        contact_id: "55555555-5555-5555-5555-000000000001",
        pipeline_stage_id: "33333333-3333-3333-3333-000000000001",
        value: 125000,
        currency: "USD",
      };
      const result = createDealSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID identifiers for contact_id", () => {
      const invalid = {
        title: "Deal",
        contact_id: "non-uuid",
        pipeline_stage_id: "33333333-3333-3333-3333-000000000001",
      };
      const result = createDealSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("webhookLeadPayloadSchema", () => {
    it("parses valid inbound lead payload", () => {
      const valid = {
        name: "Mona El-Gammal",
        phone: "+201023345566",
        email: "mona@nilevalves.eg",
        companyName: "Nile Industrial Valves",
        estimatedValue: 48000,
        source: "website",
      };
      const result = webhookLeadPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimatedValue).toBe(48000);
      }
    });

    it("rejects payload missing required phone number", () => {
      const invalid = {
        name: "Mona",
      };
      const result = webhookLeadPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("aiAnalysisOutputSchema", () => {
    it("validates structured AI copilot output schema", () => {
      const valid = {
        summary: "Customer agreed to proposal terms with minor revisions.",
        sentiment: "positive",
        urgencyLevel: "high",
        actionItems: [
          {
            task: "Send revised commercial offer",
            priority: "high",
            dueInDays: 2,
          },
        ],
        keyObjections: ["Payment terms 30 days vs 60 days"],
      };
      const result = aiAnalysisOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid sentiment or urgency enum values", () => {
      const invalid = {
        summary: "Meeting notes",
        sentiment: "super-happy", // Invalid enum
        urgencyLevel: "critical", // Invalid enum
        actionItems: [],
        keyObjections: [],
      };
      const result = aiAnalysisOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
