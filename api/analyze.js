
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  let data;

  try {
    // ✅ Body parse fix
    data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.log("GELEN DATA:", data);

  return res.status(200).json({
    success: true,
    message: "API düzgün çalışıyor ✅",
    received: data
  });
}
