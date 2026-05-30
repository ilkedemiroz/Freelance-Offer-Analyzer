function analyzeOffer(data) {
  const hours = Number(data.hours);
  const price = Number(data.price);

  const idealMin = Number(data.ideal_rate_min) || 40;
  const idealMax = Number(data.ideal_rate_max) || 80;

  const experienceLevel = (data.experience_level || "").toLowerCase();
  const jobType = (data.job_type || "").toLowerCase();

  const hasValidHours = Number.isFinite(hours) && hours > 0;
  const hasValidPrice = Number.isFinite(price) && price > 0;

  const effectiveRate =
    hasValidHours && hasValidPrice ? price / hours : null;

  const hasRevisionPolicy =
    typeof data.revisions === "string" &&
    data.revisions.trim().length > 0;

  const hasClientMessage =
    typeof data.client_message === "string" &&
    data.client_message.trim().length >= 50;

  const hasScopeSignal =
    typeof data.job_type === "string" &&
    data.job_type.trim().length > 0 &&
    hasClientMessage;

  
const result = analyzeOffer(data);
``
  let reason = "Offer requires clarification";
  let score = 50;
  let scoreLabel = "Borderline Offer";
  let rateZone = "unknown";




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
  value: result.decision,
  reason: result.reason
},

decision_reasons: result.decision_reasons,

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
