const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak ditemukan",
    });
  }

  jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: "error",
        message: "Token tidak valid atau kadaluarsa",
      });
    }
    req.user = user;
    next();
  });
};
