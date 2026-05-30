// ✅ ANALYZE ENGINE
function analyzeOffer(data) {

  const hours = Number(data.hours);
  const price = Number(data.price);

  const hasValidHours = Number.isFinite(hours) && hours > 0;
  const hasValidPrice = Number.isFinite(price) && price > 0;

  const rate = hasValidHours && hasValidPrice
    ? price / hours
    : null;

  let decision = "NEGOTIATE";
  let reason = "Average offer";

  if (rate !== null) {
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

  const acceptance_paths = [];

  if (rate !== null && rate < 50) {
    acceptance_paths.push({
      title: "Adjust pricing or scope",
      description: "Consider increasing the budget or reducing deliverables."
    });
  }

  if (data.revisions && String(data.revisions).includes("unlimited")) {
    acceptance_paths.push({
      title: "Limit revision rounds",
      description: "Set a clear revision limit to avoid scope creep."
    });
  }

  if (data.client_type === "startup") {
    acceptance_paths.push({
      title: "Define clear milestones",
      description: "Split the project into milestones with approval steps."
    });
  }


return {
  decision,
  reason,

  score: rate ? Math.round(rate) : 50,
  scoreLabel: "Calculated Offer",

  effectiveRate: rate,
  rateZone: rate > 50 ? "high" : rate > 20 ? "medium" : "low",

  risks: {
    financial: rate < 20 ? "high" : rate < 50 ? "medium" : "low",
    scope: data.project_type ? "low" : "high",
    client: data.client_type === "startup" ? "medium" : "low",
    time: "low"
  },

  // ✅ SADECE BİR TANE OLSUN
  acceptance_paths
};

}


// ✅ API HANDLER
export default async function handler(req, res) {

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

  // ✅ burada çağırıyoruz
  const result = analyzeOffer(data);

  return res.status(200).json({
    success: true,

    decision: {
      value: result.decision,
      reason: result.reason
    },

    decision_reasons: [result.reason],

    offer_score: {
      value: result.score,
      label: result.scoreLabel
    },

    financials: {
      effective_hourly_rate: result.effectiveRate,
      rate_zone: result.rateZone
    },

    pro_insights: {
      risks: result.risks
    },

    confidence_score: result.score,
    confidence_label: "Calculated",
    confidence_context: "Based on analysis",

    acceptance_paths: result.acceptance_paths
  });
}
