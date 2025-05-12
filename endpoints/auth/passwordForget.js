const db = require("../../utils/db");
const { generateOTP, sendOtpEmail } = require("../../utils/mailer");

module.exports = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Email tidak ditemukan" });
    }

    const otp = generateOTP();

    await db.execute(
      "INSERT INTO password_reset (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))",
      [email, otp]
    );

    await sendOtpEmail(email, otp);

    res.status(200).json({
      status: "success",
      message: "OTP telah dikirim ke email Anda",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Gagal mengirim OTP",
      error: err.message,
    });
  }
};
