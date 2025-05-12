const bcrypt = require("bcryptjs");
const db = require("../../utils/db");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/tokenGenerate");

module.exports = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res
        .status(401)
        .json({ status: "error", message: "Email atau password salah" });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ status: "error", message: "Email atau password salah" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.status(200).json({
      status: "success",
      message: "Login berhasil",
      data: { accessToken, refreshToken },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat login",
      error: err.message,
    });
  }
};
