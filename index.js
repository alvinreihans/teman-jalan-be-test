require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Database MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    secure: true,
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate JWT Token
const generateAccessToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.ACCESS_SECRET, { expiresIn: '2m' });
};
const generateRefreshToken = async (user) => {
    const refreshToken = jwt.sign(user, process.env.REFRESH_SECRET, { expiresIn: '4m' });
    await db.execute("INSERT INTO refresh_tokens (token, user_id) VALUES (?, ?)", [refreshToken, user.id]);
    return refreshToken;
};

// Middleware Authenticated Routes
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Endpoint register
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [existingUser] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "Email sudah digunakan",
                data: null,
                error: null
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword]);
        res.status(201).json({
            status: "success",
            message: "User berhasil didaftarkan",
            data: { email },
            error: null
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan saat registrasi",
            data: null,
            error: error.message
        });
    }
});

// Endpoint login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Cek apakah user ada di database
        const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "email atau password salah",
                data: null,
                error: null
            });
        }

        const user = users[0];

        // Verifikasi password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                status: "error",
                message: "email atau password salah",
                data: null,
                error: null
            });
        }

        const accessToken = await generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);
        

        res.status(200).json({
            status: "success",
            message: "Login berhasil",
            data: { accessToken, refreshToken },
            error: null
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan saat login",
            data: null,
            error: error.message
        });
    }
});

// Endpoint forgot password
app.post('/auth/forgot_password', async (req, res) => {
    const { email } = req.body;
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
        return res.status(404).json({
            status: "error",
            message: "Email tidak ditemukan",
            data: null,
            error: null
        });
    }
    const otp = generateOTP();
    await db.execute("INSERT INTO password_reset (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))", [email, otp]);
    let otphtml = fs.readFileSync(path.join(__dirname, 'otp.html'), 'utf8');
    otphtml = otphtml.replace('{{email}}', email).replace('{{otp}}', otp);
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Password OTP",
        html: otphtml
    }, (error, info) => {
        if (error) {
            res.status(500).json({
                status: "error",
                message: "Terjadi kesalahan saat mengirim OTP",
                data: null,
                error: error
            });
        } else {
            res.status(200).json({
                status: "success",
                message: "OTP telah dikirim ke email Anda",
                data: null,
                error: null
            });
        }
    });
});

// Endpoint reset password
app.post('/auth/reset_password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const [rows] = await db.execute("SELECT * FROM password_reset WHERE email = ? AND otp = ? AND expires_at > NOW()", [email, otp]);
        if (rows.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "OTP tidak valid atau telah kadaluarsa",
                data: null,
                error: null
            });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        await db.execute("DELETE FROM password_reset WHERE email = ?", [email]);

        res.status(200).json({
            status: "success",
            message: "Password berhasil diperbarui",
            data: null,
            error: null
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan saat mereset password",
            data: null,
            error: error.message
        });
    }
});


// Endpoint Refresh Token
app.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Refresh token undefined",
            data: null,
            error: null
        });
    }

    try {
        // Cek apakah refresh token ada di database
        const [tokens] = await db.execute("SELECT * FROM refresh_tokens WHERE token = ?", [refreshToken]);
        if (tokens.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "Refresh token tidak valid",
                data: null,
                error: null
            });
        }

        jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    status: "error",
                    message: "Refresh token kadaluwarsa",
                    data: null,
                    error: err.message
                });
            }

            const newAccessToken = generateAccessToken(user)

            res.status(200).json({
                status: "success",
                message: "Access token diperbarui",
                data: { accessToken: newAccessToken },
                error: null
            });
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan saat refresh token",
            data: null,
            error: error.message
        });
    }
});

// Endpoint Logout
app.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Access token atau refresh token tidak diberikan",
            data: null,
            error: null
        });
    }

    try {
        await db.execute("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

        res.status(200).json({
            status: "success",
            message: "Logout berhasil",
            data: null,
            error: null
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan saat logout",
            data: null,
            error: error.message
        });
    }
});

// Contoh Route yang Butuh Autentikasi
app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Akses halaman terproteksi berhasil",
        data: { user: req.user },
        error: null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});