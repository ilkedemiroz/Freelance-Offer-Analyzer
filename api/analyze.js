import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ BURAYA server.js'ten şunları da ekle:
// analyzeOffer
// calculateConfidence
// buildConfidenceContext
// buildConfidenceBreakdown

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const data = req.body;

  const result = analyzeOffer(data);
  const confidence = calculateConfidence(result);
  const confidenceMeta = buildConfidenceContext(result, confidence);

  let ai = null;
  let autoNegotiation = null;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "JSON only. No extra text." },
        {
          role: "user",
          content: `
Decision: ${result.decision}
Reason: ${result.reason}
Rate: ${result.effectiveRate}

TASK:
Return JSON:
{
  "explanation": "...",
  "decision_context": ["...", "..."],
  "client_message": "...",
  "auto_negotiation": {
    "soft": "...",
    "balanced": "...",
    "firm": "..."
  }
}
`
        }
      ]
    });

    ai = JSON.parse(completion.choices[0].message.content);

    if (result.decision === "NEGOTIATE" && ai.auto_negotiation) {
      autoNegotiation = ai.auto_negotiation;
    }

  } catch (err) {
    console.error("AI ERROR:", err.message);
  }

  return res.status(200).json({
    success: true,
    decision: { value: result.decision, reason: result.reason },
    decision_reasons: result.decision_reasons,
    acceptance_paths: result.acceptance_paths,
    offer_score: { value: result.score, label: result.scoreLabel },
    financials: {
      effective_hourly_rate: result.effectiveRate,
      rate_zone: result.rateZone
    },
    confidence_score: confidence,
    confidence_label: confidenceMeta.label,
    confidence_context: confidenceMeta.context,
    confidence_breakdown

    
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const data = req.body;

  console.log("GELEN DATA:", data);

  return res.status(200).json({
    success: true,
    message: "API %100 çalışıyor",
    received: data
  });
}
