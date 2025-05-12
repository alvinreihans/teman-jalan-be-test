const db = require("../../utils/db");

module.exports = async (req, res) => {
  const { stick_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({
      status: "error",
      message:
        "start_date dan end_date harus disediakan dalam format YYYY-MM-DD",
    });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT * FROM stick_data 
      WHERE stick_id = ? 
        AND DATE(timestamp) BETWEEN ? AND ?
      ORDER BY timestamp ASC
      `,
      [stick_id, start_date, end_date]
    );

    res.status(200).json({
      status: "success",
      message: "Riwayat data berhasil diambil",
      data: rows,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengambil riwayat data",
      error: err.message,
    });
  }
};
