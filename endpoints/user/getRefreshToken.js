const jwt = require("jsonwebtoken");
const db = require("../../utils/db");
const { generateAccessToken } = require("../../utils/tokenGenerate");

module.exports = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token tidak ditemukan",
    });
  }

  try {
    const [tokens] = await db.execute(
      "SELECT * FROM refresh_tokens WHERE token = ?",
      [refreshToken]
    );

    if (tokens.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "Refresh token tidak valid",
      });
    }

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          status: "error",
          message: "Refresh token kadaluarsa",
          error: err.message,
        });
      }

      const { iat, exp, ...cleanUser } = user;

      const newAccessToken = generateAccessToken(cleanUser);

      res.status(200).json({
        status: "success",
        message: "Access token diperbarui",
        data: { accessToken: newAccessToken },
      });
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat refresh token",
      error: err.message,
    });
  }
};
