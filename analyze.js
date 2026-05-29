export default function handler(req, res) {

  if (req.method === "POST") {

    const data = req.body;

    // BURAYA analiz kodun gelecek (şimdilik test)
    console.log(data);

    res.status(200).json({
      message: "Analiz başarılı ✅",
      gelenVeri: data
    });

  } else {
    res.status(405).json({
      error: "Sadece POST isteği kabul edilir"
    });
  }

}
