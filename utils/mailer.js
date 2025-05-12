const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true,
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpEmail = async (email, otp) => {
  const template = fs.readFileSync(
    path.join(__dirname, "otpmail.html"),
    "utf8"
  );
  const html = template.replace("{{email}}", email).replace("{{otp}}", otp);

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Password OTP",
    html,
  });
};

module.exports = {
  generateOTP,
  sendOtpEmail,
};
