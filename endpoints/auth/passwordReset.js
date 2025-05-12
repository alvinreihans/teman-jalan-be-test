const bcrypt = require("bcryptjs");
const db = require("../../utils/db");

const isStrongPassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,16}$/;
  return regex.test(password);
};

module.exports = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      status: "error",
      message: "Email, OTP, dan password baru harus diisi",
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      status: "error",
      message:
        "Password harus 8-16 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM password_reset WHERE email = ? AND otp = ? AND expires_at > NOW()",
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "OTP tidak valid atau telah kadaluarsa",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute("UPDATE users SET password = ? WHERE email = ?", [
      hashed,
      email,
    ]);
    await db.execute("DELETE FROM password_reset WHERE email = ?", [email]);

    res.status(200).json({
      status: "success",
      message: "Password berhasil diperbarui",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Gagal reset password",
      error: err.message,
    });
  }
};
