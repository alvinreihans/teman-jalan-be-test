const db = require("../../utils/db");

module.exports = async (req, res) => {
  const { stick_ids } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(stick_ids)) {
    return res.status(400).json({
      status: "error",
      message: "stick_ids harus berupa array",
    });
  }

  try {
    const stickIdsJson = JSON.stringify(stick_ids);
    await db.execute("UPDATE users SET stick_ids = ? WHERE id = ?", [
      stickIdsJson,
      userId,
    ]);

    res.status(200).json({
      status: "success",
      message: "stick_ids berhasil diperbarui",
      data: { stick_ids },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Gagal memperbarui stick_ids",
      error: err.message,
    });
  }
};
