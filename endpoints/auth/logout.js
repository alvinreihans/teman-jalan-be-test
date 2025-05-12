const db = require("../../utils/db");

module.exports = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(400)
      .json({ status: "error", message: "Refresh token tidak diberikan" });
  }

  try {
    await db.execute("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);
    res.status(200).json({
      status: "success",
      message: "Logout berhasil",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat logout",
      error: err.message,
    });
  }
};
