import { describe, it, expect } from "vitest";
import { calculateLeadScore } from "@/services/lead-scoring";

describe("Explainable Lead Scoring Model Unit Tests", () => {
  it("awards points for phone, company, and corporate email domain", () => {
    const lead = {
      phone: "+201004567890",
      companyName: "Cairo Heavy Equipment",
      email: "ahmed@cairoheavy.com",
    };

    const result = calculateLeadScore(lead);

    // +15 (phone) + 20 (company) + 15 (email present) + 15 (business domain) = 65
    expect(result.score).toBe(65);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factor: "phone_present", points: 15 }),
        expect.objectContaining({ factor: "company_present", points: 20 }),
        expect.objectContaining({ factor: "email_present", points: 15 }),
        expect.objectContaining({ factor: "business_email", points: 15 }),
      ])
    );
  });

  it("does not award corporate domain bonus for generic free email providers", () => {
    const lead = {
      email: "ahmed@gmail.com",
    };

    const result = calculateLeadScore(lead);
    // +15 for email present, 0 for business domain
    expect(result.score).toBe(15);
    expect(result.reasons.some((r) => r.factor === "business_email")).toBe(false);
  });

  it("awards high value deal bonus and source bonus", () => {
    const lead = {
      phone: "+971501234567",
      companyName: "Gulf Petrochemical Corp",
      email: "procurement@gulfpetro.com",
      estimatedValue: 120000,
      source: "website",
    };

    const result = calculateLeadScore(lead);
    // 15 (phone) + 20 (company) + 15 (email) + 15 (domain) + 20 (high value >= $50k) + 15 (website source) = 100
    expect(result.score).toBe(100);
    expect(result.reasons.some((r) => r.factor === "high_deal_value")).toBe(true);
    expect(result.reasons.some((r) => r.factor === "high_intent_source")).toBe(true);
  });

  it("returns 0 and empty reasons when lead has no qualifiers", () => {
    const lead = {};
    const result = calculateLeadScore(lead);
    expect(result.score).toBe(0);
    expect(result.reasons.length).toBe(0);
  });
});
