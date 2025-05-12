const bcrypt = require("bcryptjs");
const db = require("../../utils/db");

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const isStrongPassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,16}$/;
  return regex.test(password);
};

module.exports = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: "error",
      message: "Format email tidak valid",
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      status: "error",
      message:
        "Password harus 8-16 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol",
    });
  }

  try {
    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Email sudah digunakan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute("INSERT INTO users (email, password) VALUES (?, ?)", [
      email,
      hashedPassword,
    ]);

    res.status(201).json({
      status: "success",
      message: "User berhasil didaftarkan",
      data: { email },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat registrasi",
      error: err.message,
    });
  }
};
