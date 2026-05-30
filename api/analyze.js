export default async function handler(req, res) {

  // ✅ Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  let data;

  try {
    data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  let decision = "NEGOTIATE";
  let reason = "Average offer";

  let rate = null;

  // ✅ Calculate hourly rate
  if (data.price && data.hours) {
    rate = data.price / data.hours;

    if (rate < 20) {
      decision = "REJECT";
      reason = "Hourly rate is too low";
    } else if (rate < 50) {
      decision = "NEGOTIATE";
      reason = "Negotiation recommended";
    } else {
      decision = "ACCEPT";
      reason = "Strong offer";
    }
  }

  // ✅ Risk analysis
  const risks = {
    financial: rate < 20 ? "high" : rate < 50 ? "medium" : "low",
    scope: data.project_type ? "low" : "high",
    client: data.client_type === "startup" ? "medium" : "low",
    time: "low"
  };

  // ✅ Confidence calculation
  const confidence = rate
    ? Math.min(90, Math.max(40, 60 + rate / 2))
    : 40;

  return res.status(200).json({
    success: true,

    decision: {
      value: decision,
      reason: reason
    },

    decision_reasons: [reason],

    offer_score: {
      value: rate ? Math.round(rate) : 50,
      label: "Calculated Offer"
    },

    financials: {
      effective_hourly_rate: rate,
      rate_zone: rate > 50 ? "high" : rate > 20 ? "medium" : "low"
    },

    pro_insights: {
      risks: risks
    },

    confidence_score: Math.round(confidence),
    confidence_label: "Moderate confidence",
    confidence_context: "Based on pricing, scope, and provided inputs",

    acceptance_paths: []
  });
}
