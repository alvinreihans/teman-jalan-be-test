require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mqttHandler = require("./mqtt/mqttHandler");
const authenticateToken = require("./utils/tokenAuthenticate");

// Middleware global
app.use(express.json());
app.use(cors());

// AUTH ENDPOINTS
app.post("/auth/register", require("./endpoints/auth/register"));
app.post("/auth/login", require("./endpoints/auth/login"));
app.post("/auth/forgot_password", require("./endpoints/auth/passwordForget"));
app.post("/auth/reset_password", require("./endpoints/auth/passwordReset"));
app.post("/auth/logout", require("./endpoints/auth/logout"));

// USER ENDPOINTS
app.post("/user/refresh", require("./endpoints/user/getRefreshToken"));
app.put(
  "/user/update-stickid",
  authenticateToken,
  require("./endpoints/user/updateWatchlist")
);
// app.get(
//   "/user/protected",
//   authenticateToken,
//   require("./endpoints/user/protected")
// );

// STICK DATA ENDPOINTS
app.get(
  "/data/:stick_id/latest",
  authenticateToken,
  require("./endpoints/stick/getLatestStickData")
);
app.get(
  "/data/:stick_id/history",
  authenticateToken,
  require("./endpoints/stick/getStickHistory")
);

// MQTT Data Subscriber
mqttHandler.init();

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
