const jwt = require("jsonwebtoken");
const db = require("./db");

const generateAccessToken = (user) => {
  const { iat, exp, ...payload } = user;
  return jwt.sign(payload, process.env.ACCESS_SECRET, { expiresIn: "1d" });
};

const generateRefreshToken = async (user) => {
  const { iat, exp, ...payload } = user;
  const token = jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await db.execute(
    "INSERT INTO refresh_tokens (token, user_id) VALUES (?, ?)",
    [token, user.id]
  );

  return token;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
