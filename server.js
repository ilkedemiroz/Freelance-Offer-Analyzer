/* =========================
   ENV
========================= */
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const PDFDocument = require("pdfkit");

/* =========================
   APP SETUP
========================= */
const app = express();
const PORT = 3000;

app.use(cors());

/* ⭐ ADDED – PDF / LARGE PAYLOAD FIX */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(express.static(path.join(__dirname, "public")));

console.log(
  "OPENAI KEY LOADED:",
  process.env.OPENAI_API_KEY ? "YES" : "NO"
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   CLIENT MESSAGE RISK HELPER (PATCH 2)
========================= */
function analyzeClientMessageRisk(message = "") {
  const text = message.toLowerCase();

  let riskSignals = 0;

  const patterns = [
    /asap/,
    /budget is tight/,
    /fixed budget/,
    /until it'?s perfect/,
    /multiple iterations/,
    /flexibility is important/,
  ];

  patterns.forEach(p => {
    if (p.test(text)) riskSignals++;
  });

  if (riskSignals >= 3) return "high";
  if (riskSignals === 2) return "medium";
  if (riskSignals === 1) return "medium";

  return "low";
}

/* =========================
   TIME RISK HELPER (PATCH 3)
========================= */

function analyzeTimeRisk(message = "") {
  const text = message.toLowerCase();

  if (/asap|urgent|immediately|as soon as possible/.test(text)) {
    return "high";
  }

  if (/quick turnaround|fast delivery/.test(text)) {
    return "medium";
  }

  return "low";
}
``


/* =========================
   ⭐ PATCH 3 – DECISION REASONS BUILDER
========================= */
function buildDecisionReasons(decision, risks) {
  const reasons = [];

  if (risks.client === "high") {
    reasons.push("Client expectations and constraints introduce coordination risk");
  }

  
if (risks.financial === "high") {
  reasons.push("Compensation is significantly below your acceptable rate");
}


  if (risks.scope === "high") {
    reasons.push("Project scope is insufficiently defined and may expand during delivery");
  }

  if (risks.revision === "high") {
    reasons.push("Unlimited or unclear revisions increase delivery uncertainty");
  }

  if (risks.time === "medium") {
    reasons.push("Delivery timeline expectations may be unrealistic");
  }

  if (risks.experience === "high") {
    reasons.push("Project complexity exceeds the current experience level");
  }

  if (decision === "REJECT" && reasons.length === 0) {
    reasons.push("Pricing is not sustainable for this engagement");
  }

  return reasons;
}

/* =========================
   PATCH 4 – RISK EXPLANATION BUILDER (NEW)
========================= */
function buildRiskExplanations(risks) {
  return {
    financial:
      risks.financial === "high"
        ? "The proposed budget does not align with sustainable pricing expectations"
        : "Pricing aligns with sustainable freelance rates",

    scope:
      risks.scope === "high"
        ? "Project scope is insufficiently defined, increasing the likelihood of additional unplanned work"
        : "Project scope appears sufficiently defined for estimation",

    revision:
      risks.revision === "high"
        ? "Unlimited or loosely defined revisions increase delivery uncertainty"
        : "Revision expectations appear limited and manageable",

    client:
      risks.client === "high"
        ? "Client communication indicates potentially demanding or rigid expectations"
        : risks.client === "medium"
        ? "Client profile suggests moderate coordination overhead"
        : "Client communication appears reasonable",

    time:
      risks.time === "medium"
        ? "Requested delivery timeline may require prioritization or trade-offs"
        : "Delivery timeline expectations appear reasonable",

    experience:
      risks.experience === "high"
        ? "Project complexity exceeds the stated experience level"
        : "Project complexity aligns with the stated experience level"
  };
}

/* =========================
   PATCH 5 – ACCEPTANCE PATH BUILDER
========================= */
function buildAcceptancePaths(risks, context = {}) {
  const primary = [];
  const secondary = [];

  /* =========================
     PRIMARY PATH 1
     Scope + Revision Control (Flexible Unlimited)
  ========================= */
  if (risks.scope === "high" || risks.revision === "high") {
    primary.push({
      type: "primary",
      id: "scope_revision_control",
      title: "Controlled scope & revision framework",
      summary: "Unlimited revisions can be acceptable when paired with clear scope boundaries, phased delivery, or time-boxed revision cycles.",
      steps: [
        "Define phase 1 deliverables with clear acceptance criteria",
        "Cap revisions per phase (e.g., 2 rounds included, additional paid)",
        "Agree on revision turnaround time (e.g., 48 hours max)"
      ]
    });
  }

  /* =========================
     PRIMARY PATH 2
     Experience → Phase Breakdown
  ========================= */
  if (risks.experience === "high") {
    primary.push({
      type: "primary",
      id: "experience_phasing",
      title: "Phase-based delivery aligned with experience level",
      summary: "Splitting the project into phases allows delivery of core value first while reducing complexity risk.",
      steps: [
        "Propose Phase 1: Core features only",
        "Phase 2: Advanced features after Phase 1 review",
        "Build in 1-2 week buffer between phases for learning"
      ]
    });
  }

  /* =========================
     PRIMARY PATH 3
     Budget–Scope Trade-off
  ========================= */
  if (risks.financial !== "low") {
    primary.push({
      type: "primary",
      id: "budget_scope_tradeoff",
      title: "Scope adjustment to match current budget",
      summary: "If the budget cannot increase, deliverables can be reduced or converted into optional paid add-ons.",
      steps: [
        "Identify core vs. optional features",
        "Propose core deliverables within budget",
        "Optional features become paid add-ons ($X per feature)"
      ]
    });
  }

  /* =========================
     SECONDARY PATHS
  ========================= */
  if (risks.time === "medium") {
    secondary.push({
      type: "secondary",
      id: "timeline_normalization",
      title: "Milestone-based timeline alignment",
      summary: "Replacing urgent or vague deadlines with milestone-based delivery reduces delivery pressure.",
      steps: [
        "Propose milestone dates instead of single deadline",
        "Milestone 1 (30%): Core structure – Day X",
        "Milestone 2 (70%): Full delivery – Day Y",
        "Final review: Day Z"
      ]
    });
  }

  if (risks.client !== "low") {
    secondary.push({
      type: "secondary",
      id: "communication_contract",
      title: "Clear acceptance criteria & communication rules",
      summary: "Defining acceptance criteria and communication boundaries reduces coordination risk.",
      steps: [
        "Define what 'done' means for each deliverable",
        "Set communication schedule (e.g., 2 syncs/week, async otherwise)",
        "Include revision rounds count and timeline in contract"
      ]
    });
  }

  return {
    primary: primary.slice(0, 3), // hard rule: max 3 primary
    secondary
  };
}


/* =========================
   CORE RULE ENGINE
========================= */
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

  let decision = "NEGOTIATE";
  let reason = "Offer requires clarification";
  let score = 50;
  let scoreLabel = "Borderline Offer";
  let rateZone = "unknown";

  /* =========================
     EARLY AMBIGUITY RETURNS
  ========================= */
  if (!hasValidHours) {
    return {
      decision: "NEGOTIATE",
      reason: "Estimated effort is not clearly defined",
      score: 50,
      scoreLabel: "Scope Unclear",
      effectiveRate: null,
      rateZone: "unknown",
      risks: {
        financial: "medium",
        scope: "high",
        revision: "medium",
        client: "medium",
        time: "medium",
        experience: "medium"
      }
    };
  }

  if (!hasValidPrice) {
    return {
      decision: "NEGOTIATE",
      reason: "Pricing is not clearly specified",
      score: 50,
      scoreLabel: "Pricing Unclear",
      effectiveRate: null,
      rateZone: "unknown",
      risks: {
        financial: "high",
        scope: "medium",
        revision: "medium",
        client: "medium",
        time: "medium",
        experience: "medium"
      }
    };
  }

  /* =========================
     RATE EVALUATION
  ========================= */
  const rejectFloor = idealMin * 0.5;

  if (effectiveRate < rejectFloor) {
    decision = "REJECT";
    score = 25;
    scoreLabel = "Poor Offer";
    rateZone = "very_low";
  } else if (effectiveRate < idealMin) {
    decision = "NEGOTIATE";
    score = 50;
    scoreLabel = "Borderline Offer";
    rateZone = "below_ideal";
  } else if (effectiveRate <= idealMax) {
    decision = "ACCEPT";
    score = 85;
    scoreLabel = "Strong Offer";
    rateZone = "ideal";
  } else {
    decision = "ACCEPT";
    score = 90;
    scoreLabel = "Excellent Offer";
    rateZone = "above_ideal";
  }

  /* =========================
     BASE RISK MODEL (PATCH 4 FOUNDATION)
  ========================= */
  const risks = {
    
financial: (() => {
  if (!effectiveRate) return "medium";

  if (effectiveRate < idealMin * 0.6) return "high";

  if (effectiveRate < idealMin) return "medium";

  return "low";
})(),


    // BACKWARD COMPATIBLE
   scope: (() => {
  const msg = (data.client_message || "").trim().toLowerCase();
  const genericJob =
    !data.job_type ||
    data.job_type.length < 10;

  const vaguePatterns = [
    /refine/,
    /details later/,
    /discuss later/,
    /we will define/,
    /scalable/,
    /flexible/,
    /evolve/,
    /iterate/
  ];

  const hasVagueSignal = vaguePatterns.some(p => p.test(msg));

  if (!msg) return "medium";
  if (msg.length < 150) return "medium";
  if (genericJob) return "medium";
  if (hasVagueSignal) return "medium";

  return "low";
})(),



    // PATCH 4 – REVISION SEPARATION
    revision: (() => {
  const msg = (data.client_message || "").toLowerCase();
  const rev = (data.revisions || "").toLowerCase();

  const strongSignals = [
    /unlimited/,
    /until it'?s perfect/,
    /until it feels right/,
    /multiple iterations/,
    /iterate/,
    /refine/,
  ];

  const hasStrongSignal = strongSignals.some(p => p.test(msg) || p.test(rev));

  if (hasStrongSignal) return "high";

  if (rev.includes("3") || rev.includes("2")) return "low";

  return "medium";
})(),

    client:
      ["startup", "early-stage startup", "solo founder"].includes(
        (data.client_type || "").toLowerCase()
      )
        ? "medium"
        : "low",

    time: "low",
    experience: "low"
  };

  /* =========================
     PATCH 2 – CLIENT MESSAGE RISK
  ========================= */
  const messageRisk = analyzeClientMessageRisk(data.client_message || "");
  const riskRank = { low: 1, medium: 2, high: 3 };

  if (riskRank[messageRisk] > riskRank[risks.client]) {
    risks.client = messageRisk;
  }

  /* =========================
     PATCH 3 – TIME RISK
  ========================= */
  const timeRiskFromMessage = analyzeTimeRisk(data.client_message || "");
  if (riskRank[timeRiskFromMessage] > riskRank[risks.time]) {
    risks.time = timeRiskFromMessage;
  }

/* =========================
   🔥 COMBINED RISK BOOST (GAME CHANGER)
========================= */

// Scope + Revision birlikteyse → scope HIGH
if (
  risks.scope !== "low" &&
  risks.revision === "high"
) {
  risks.scope = "high";
}

// Low price + vague scope → direkt reject baskısı
if (
  risks.financial === "high" &&
  risks.scope !== "low"
) {
  decision = "REJECT";
  score = 30;
  scoreLabel = "High Risk Offer";
}
``

const clearSignals = [
  /defined/,
  /final/,
  /fixed/,
  /exactly/,
  /X words/,
  /[0-9]+\s*words/,
  /[0-9]+\s*posts/,
  /delivery/,
];

const clearCount = clearSignals.filter(p => p.test(msg)).length;

if (clearCount >= 2 && risks.revision === "low") {
  risks.scope = "low";
}
  
  /* =========================
     EXPERIENCE MISMATCH
  ========================= */
  const isComplexProject =
    jobType.includes("complex") ||
    jobType.includes("saas") ||
    jobType.includes("dashboard");

  if (
    experienceLevel === "junior" &&
    isComplexProject &&
    hours >= 60
  ) {
    risks.experience = "high";

    if (decision === "ACCEPT") {
      decision = "NEGOTIATE";
      score = 45;
      scoreLabel = "High Complexity for Experience Level";
    }
  }

  /* =========================
     ACCEPT SAFETY CHECKS
  ========================= */
  if (decision === "ACCEPT" && (!hasScopeSignal || !hasRevisionPolicy)) {
    decision = "NEGOTIATE";
    score = 55;
    scoreLabel = "Needs Clarification";
  }

  if (decision === "ACCEPT" && risks.scope === "high") {
    decision = "NEGOTIATE";
    score = 55;
    scoreLabel = "Needs Clarification";
  }

  /* =========================
     PATCH 3 – BULLET REASONS
  ========================= */
  const decisionReasons = buildDecisionReasons(decision, risks);
  if (decisionReasons.length) {
    reason = decisionReasons.join(" • ");
  }

  /* =========================
     PATCH 4 – RISK EXPLANATIONS
  ========================= */
  const riskExplanations = buildRiskExplanations(risks);

  /* =========================
     PATCH 5 – ACCEPTANCE PATHS
  ========================= */
  const acceptancePaths = buildAcceptancePaths(risks, {
    decision,
    experienceLevel,
    rateZone
  });

  return {
    decision,
    reason,
    decision_reasons: decisionReasons,
    score,
    scoreLabel,
    effectiveRate,
    rateZone,
    risks,
    risk_explanations: riskExplanations,
    acceptance_paths: acceptancePaths,
    hasRevisionPolicy,
    hasScopeSignal,
    hasClientMessage,
    experienceLevel
  };
}

/* =========================
   CONFIDENCE HELPERS
========================= */
function buildConfidenceBreakdown(result) {
  const breakdown = [];

  breakdown.push("Base confidence applied");
  if (result.decision === "ACCEPT")
    breakdown.push("Decision outcome increases confidence");
  if (["ideal", "above_ideal"].includes(result.rateZone))
    breakdown.push("Hourly rate meets target range");
  if (result.risks.scope === "high")
    breakdown.push("Scope risk reduces confidence");
  if (result.risks.client !== "low")
    breakdown.push("Client communication introduces additional risk");
  if (result.risks.time === "medium")
    breakdown.push("Urgent timeline expectations reduce confidence");
  if (result.risks.experience === "high")
    breakdown.push("Project complexity exceeds experience level");

  return breakdown;
}

function buildConfidenceContext(result, confidence) {
  if (confidence >= 75) {
    return {
      label: "High confidence",
      context:
        "This offer aligns well with your pricing expectations and presents low overall risk."
    };
  }

  if (confidence >= 55) {
    return {
      label: "Moderate confidence",
      context:
        "The offer is viable, but unresolved scope, timeline, or experience-related factors require clarification before proceeding."
    };
  }

  return {
    label: "Low confidence",
    context:
      "Multiple risk factors reduce confidence, making this offer unfavorable without significant changes."
  };
}

function calculateConfidence(result) {
  let confidence = 60;

  if (result.decision === "ACCEPT") confidence += 15;
  if (["ideal", "above_ideal"].includes(result.rateZone)) confidence += 10;
  if (Object.values(result.risks).every(r => r === "low")) confidence += 10;
  if (result.risks.scope === "high") confidence -= 10;
  if (result.risks.scope === "medium") confidence -= 3;
  if (result.risks.client === "medium") confidence -= 3;
  if (result.risks.client === "high") confidence -= 15;
  if (result.risks.time === "medium") confidence -= 3;
  if (result.risks.experience === "high") confidence -= 15;

  return Math.max(25, Math.min(90, confidence));
}

/* =========================
   ANALYZE ENDPOINT
========================= */
app.post("/analyze", async (req, res) => {
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

  // 🔍 DEBUG – ACCEPTANCE PATHS
  console.log("ACCEPTANCE PATHS:", result.acceptance_paths);

  res.json({
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
    confidence_breakdown: buildConfidenceBreakdown(result),
    pro_insights: {
      risks: result.risks,
      risk_explanations: result.risk_explanations
    },
    acceptance_requirements: [
      result.risks.financial !== "low" ? "Increase project budget" : null,
      result.risks.revision === "high" ? "Define clear revision limits" : null,
      result.risks.client === "high"
        ? "Clarify expectations, timeline, and budget constraints before proceeding"
        : null,
      result.risks.time === "medium"
        ? "Align delivery timeline with realistic expectations"
        : null,
      result.risks.experience === "high"
        ? "Reduce scope or split project into phases appropriate for experience level"
        : null,
      !result.hasRevisionPolicy ? "Specify revision policy" : null,
      !result.hasScopeSignal ? "Provide clearer project scope" : null,
      !result.hasClientMessage ? "Request a more detailed client brief" : null
    ].filter(Boolean),
    ai,
    auto_negotiation: autoNegotiation
  });
});

/* =========================
   PDF EXPORT ENDPOINT
========================= */
app.post("/download-pdf", async (req, res) => {
  try {
    const data = req.body;

    const result = analyzeOffer(data);
    const confidence = calculateConfidence(result);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=freelance-offer-analysis.pdf"
    );

    doc.pipe(res);

    doc.fontSize(20).text("Freelance Offer Analysis", { align: "center" }).moveDown(1.5);
    doc.fontSize(14).text(`Decision: ${result.decision}`).moveDown(0.5);
    doc.fontSize(11).text(result.reason).moveDown(1);

    doc.fontSize(13).text("Financials").moveDown(0.5);
    doc.fontSize(11).text(
      `Effective hourly rate: ${
        result.effectiveRate ? `$${result.effectiveRate.toFixed(2)} / hour` : "Not available"
      }`
    ).moveDown(1);

    doc.fontSize(13).text("Risk Overview").moveDown(0.5);
    Object.entries(result.risks).forEach(([k, v]) => {
      doc.fontSize(11).text(`- ${k}: ${v}`);
    });

    doc.fontSize(13).text("Confidence Score").moveDown(0.5);
    doc.fontSize(11).text(`${confidence}%`).moveDown(1);

    doc.fontSize(9).fillColor("gray").text(
      "Generated by Freelance Offer Analyzer",
      { align: "center" }
    );

    doc.end();

  } catch (err) {
    console.error("PDF ERROR:", err.message);
    res.status(500).send("PDF generation failed");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});