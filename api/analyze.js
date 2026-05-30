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

  let decision = "NEGOTIATE";
  let reason = "Orta seviyede teklif";

  if (data.price && data.hours) {
    const rate = data.price / data.hours;

    if (rate < 20) {
      decision = "REJECT";
      reason = "Saatlik ücret çok düşük";
    } else if (rate < 50) {
      decision = "NEGOTIATE";
      reason = "Pazarlık yapılabilir";
    } else {
      decision = "ACCEPT";
      reason = "İyi teklif";
    }
  }

  return res.status(200).json({
    success: true,
    decision: {
      value: decision,
      reason: reason
    }
  });
}
