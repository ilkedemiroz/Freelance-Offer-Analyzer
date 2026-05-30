const form = document.getElementById("jobForm");
const loading = document.getElementById("loadingState");

const decisionCard = document.getElementById("decisionCard");
const scoreCard = document.getElementById("scoreCard");
const rateCard = document.getElementById("rateCard");
const riskCard = document.getElementById("riskCard");
const confidenceCard = document.getElementById("confidenceCard");
const simulatorCard = document.getElementById("simulatorCard");
const aiCard = document.getElementById("aiCard");
const downloadBtn = document.getElementById("downloadPdfBtn");

const riskDescriptions = {
  financial: {
    low: "Payment level is acceptable for this engagement.",
    medium: "Compensation is acceptable but leaves little margin.",
    high: "Compensation is too low for the expected effort."
  },
  scope: {
    low: "Project scope appears manageable.",
    medium: "Scope has some unclear areas.",
    high: "Unlimited revisions significantly increase scope creep risk."
  },
  revision: {
    low: "Revision policy appears reasonable.",
    medium: "Revision expectations may require clarification.",
    high: "Unlimited revisions significantly increase delivery risk."
  },
  client: {
    low: "Client profile appears reliable.",
    medium: "Early-stage clients often require tighter agreements.",
    high: "Client signals increased coordination risk."
  },
  time: {
    low: "Timeline expectations are reasonable.",
    medium: "Timeline may be optimistic or unclear.",
    high: "Deadline pressure may affect quality."
  },
  experience: {
    low: "Project complexity appears manageable for your experience level.",
    medium: "Some aspects may stretch current experience.",
    high: "Project complexity exceeds the current experience level."
  }
};

let basePayload = null;

form.addEventListener("submit", async e => {
  e.preventDefault();

  document.querySelectorAll(".acceptance-card").forEach(el => el.remove());

  [
    decisionCard,
    scoreCard,
    rateCard,
    riskCard,
    confidenceCard,
    simulatorCard,
    aiCard
  ].forEach(el => {
    el.innerHTML = "";
    el.classList.remove("hidden");
  });

  simulatorCard.classList.add("hidden");
  loading.classList.remove("hidden");
  downloadBtn.classList.add("hidden");

  basePayload = {
    job_type: job_type?.value || "",
    hours: hours?.value || "",
    price: price?.value || "",
    ideal_rate_min: ideal_rate_min?.value || "",
    ideal_rate_max: ideal_rate_max?.value || "",
    client_type: client_type?.value || "",
    revisions: revisions?.value || "",
    experience_level: experience_level?.value || "",
    client_message: client_message?.value || ""
  };

  let result;

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload)
    });

    result = await res.json();

decisionCard.innerHTML = `
  <p style="font-size:20px;">
    ${result.decision}
  </p>
`;

    
    // 🔍 DEBUG – KORUNDU
    console.log("ACCEPTANCE PATHS:", result.acceptance_paths);

  } catch {
    loading.classList.add("hidden");
    decisionCard.innerHTML =
      `<p class="text-red-600">Server error. Please try again.</p>`;
    return;
  }

  loading.classList.add("hidden");

  /* =====================
     DECISION
  ====================== */
  const decisionValue = result?.decision?.value || "NEGOTIATE";
  const decisionReason = result?.decision?.reason || "No explanation provided.";

  const decisionColor =
    decisionValue === "ACCEPT"
      ? "border-green-500 bg-green-50"
      : decisionValue === "NEGOTIATE"
      ? "border-yellow-400 bg-yellow-50"
      : "border-red-500 bg-red-50";

  decisionCard.innerHTML = `
    <div class="border-l-4 ${decisionColor} p-4 rounded-xl">
      <h2 class="text-xl font-semibold">${decisionValue}</h2>
      <p class="mt-1">${decisionReason}</p>
    </div>
  `;

  /* =====================
     SCORE
  ====================== */
  scoreCard.innerHTML = `
    <strong>${result?.offer_score?.value ?? "-"}</strong>
    – ${result?.offer_score?.label ?? "Unknown"}
  `;

  /* =====================
     RATE
  ====================== */
  const rate = result?.financials?.effective_hourly_rate;

  rateCard.innerHTML = `
    <p class="text-2xl font-semibold">
      ${
        typeof rate === "number"
          ? `$${rate.toFixed(2)} / hour`
          : "Hourly rate not available"
      }
    </p>
    <p class="text-sm text-gray-500">Based on provided inputs</p>
  `;

  /* =====================
     RISKS
  ====================== */
  const risks =
    result?.pro_insights?.risks ?? {
      financial: "unknown",
      scope: "unknown",
      client: "unknown",
      time: "unknown"
    };

  riskCard.innerHTML = `
    <h4 class="font-semibold mb-3">Risk overview</h4>
    <ul class="space-y-3 text-sm">
      ${Object.entries(risks)
        .map(([key, level]) => `
          <li>
            <strong>${key.toUpperCase()}</strong> — ${level}<br/>
            <span class="text-gray-600">
              ${riskDescriptions[key]?.[level] || "No details available."}
            </span>
          </li>
        `)
        .join("")}
    </ul>
  `;

  /* =====================
     CONFIDENCE
  ====================== */
  const confidenceValue = result?.confidence_score ?? 0;

  let confidenceLabel = "Low confidence";
  let confidenceContext =
    "This offer carries notable uncertainty and may require significant clarification.";

  if (confidenceValue >= 80) {
    confidenceLabel = "High confidence";
    confidenceContext =
      "The offer is well-aligned with your expectations and carries minimal risk.";
  } else if (confidenceValue >= 60) {
    confidenceLabel = "Moderate confidence";
    confidenceContext =
      "The offer is viable, but some factors require clarification before proceeding.";
  }

  confidenceCard.innerHTML = `
    <h4 class="font-semibold mb-2">Confidence score</h4>
    <p class="text-2xl font-semibold">${confidenceValue}%</p>
    <p class="text-sm text-gray-500">
      Based on rules, risks, and experience level
    </p>

    <div class="mt-3 text-sm">
      <strong>${confidenceLabel}</strong><br/>
      <span class="text-gray-600">${confidenceContext}</span>
    </div>
  `;

  /* =====================
     ACCEPTANCE REQUIREMENTS
  ====================== */
  if (result?.acceptance_requirements?.length) {
    confidenceCard.insertAdjacentHTML(
      "afterend",
      `
      <div class="card acceptance-card">
        <h4 class="font-semibold mb-2">To accept this offer</h4>
        <ul class="list-disc pl-5 text-sm space-y-1">
          ${result.acceptance_requirements.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </div>
      `
    );
  }

  /* =====================
     PATCH 5 – ACCEPTANCE PATHS
  ====================== */
  if (result?.acceptance_paths?.length) {
    confidenceCard.insertAdjacentHTML(
      "afterend",
      `
      <div class="card acceptance-card">
        <h4 class="font-semibold mb-3">What would make this ACCEPT?</h4>
        ${result.acceptance_paths
          .map(
            path => `
            <div class="mb-4 p-3 border rounded-xl ${
              path.type === "primary"
                ? "border-green-400 bg-green-50"
                : "border-gray-300 bg-gray-50"
            }">
              
<strong>${path.title}</strong>
<p class="text-sm text-gray-700">${path.description || ""}</p>
              <ul class="list-disc pl-5 text-sm text-gray-600">
                ${(path.steps || []).map(s => `<li>${s}</li>`).join("")}
              </ul>
            </div>
          `
          )
          .join("")}
      </div>
      `
    );
  }

  /* =====================
     AI / CLIENT MESSAGE
  ====================== */
  const explanation =
    typeof result?.ai?.explanation === "string"
      ? result.ai.explanation
      : "You can use the message below to clarify scope, pricing, or next steps with the client.";

  const clientMessage =
    typeof result?.ai?.client_message === "string"
      ? result.ai.client_message
      : "";

  aiCard.innerHTML = `
    <p class="mb-4">${explanation}</p>
    <textarea id="clientMessage"
      class="w-full border rounded-xl p-3 mb-3"
      rows="4">${clientMessage}</textarea>
    <button id="copyBtn" class="text-sm text-blue-600 hover:underline">
      Copy message
    </button>
  `;

  document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(
      document.getElementById("clientMessage").value
    );
  };

  downloadBtn.classList.remove("hidden");
});

/* =====================
   PDF DOWNLOAD
===================== */
downloadBtn.onclick = async () => {
  try {
    const res = await fetch("/download-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload)
    });

    if (!res.ok) {
      alert("PDF could not be generated");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "freelance-offer-analysis.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF DOWNLOAD ERROR:", err);
    alert("PDF yüklenemedi");
  }
};
