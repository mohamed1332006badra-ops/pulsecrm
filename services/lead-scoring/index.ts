export interface ScoringFactor {
  factor: string;
  points: number;
  description: string;
}

export interface LeadScoreResult {
  score: number;
  reasons: ScoringFactor[];
}

export interface LeadScoringInput {
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  estimatedValue?: number | null;
  source?: string | null;
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "mail.ru",
  "aol.com",
]);

/**
 * Calculates a transparent, explainable lead score between 0 and 100
 * based on profile completeness, company presence, business domain, value, and source quality.
 */
export function calculateLeadScore(lead: LeadScoringInput): LeadScoreResult {
  const reasons: ScoringFactor[] = [];
  let score = 0;

  // 1. Phone number presence (+15)
  if (lead.phone && lead.phone.trim().length >= 7) {
    score += 15;
    reasons.push({
      factor: "phone_present",
      points: 15,
      description: "Direct phone number provided for outreach",
    });
  }

  // 2. Email verification and corporate domain (+15 base + 15 corporate)
  if (lead.email && lead.email.includes("@")) {
    score += 15;
    reasons.push({
      factor: "email_present",
      points: 15,
      description: "Valid contact email provided",
    });

    const domain = lead.email.split("@")[1]?.toLowerCase().trim();
    if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
      score += 15;
      reasons.push({
        factor: "business_email",
        points: 15,
        description: `Corporate email domain detected (${domain})`,
      });
    }
  }

  // 3. Organization / Company presence (+20)
  if (lead.companyName && lead.companyName.trim().length >= 2) {
    score += 20;
    reasons.push({
      factor: "company_present",
      points: 20,
      description: "Company or enterprise entity specified",
    });
  }

  // 4. Estimated deal value (+10 for >$10k, +20 for >$50k)
  const val = Number(lead.estimatedValue || 0);
  if (val >= 50000) {
    score += 20;
    reasons.push({
      factor: "high_deal_value",
      points: 20,
      description: "High deal value pipeline potential ($50,000+)",
    });
  } else if (val >= 10000) {
    score += 10;
    reasons.push({
      factor: "medium_deal_value",
      points: 10,
      description: "Medium deal value potential ($10,000 - $49,999)",
    });
  }

  // 5. Source quality (+15 for high intent web/landing page, +10 for direct ads)
  const source = lead.source?.toLowerCase().trim();
  if (source === "website" || source === "landing_page") {
    score += 15;
    reasons.push({
      factor: "high_intent_source",
      points: 15,
      description: "High intent inbound source (direct website / landing page)",
    });
  } else if (source === "google_ads" || source === "meta_ads") {
    score += 10;
    reasons.push({
      factor: "paid_ad_source",
      points: 10,
      description: "Paid acquisition campaign attribution",
    });
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    reasons,
  };
}
