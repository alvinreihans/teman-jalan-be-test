const db = require("../../utils/db");

module.exports = async (req, res) => {
  const { stick_id } = req.params;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM latest_stick_data WHERE stick_id = ?",
      [stick_id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Stick tidak ditemukan" });
    }

    res.status(200).json({
      status: "success",
      message: "Data stick terbaru ditemukan",
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil data",
      error: err.message,
    });
  }
};
