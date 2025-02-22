require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

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

// Generate JWT Token
const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.ACCESS_SECRET, { expiresIn: '2m' });
};

const generateRefreshToken = async (user) => {
    const refreshToken = jwt.sign(user, process.env.REFRESH_SECRET, { expiresIn: '4m' });
    await db.execute("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))", [user.id, refreshToken]);
    return refreshToken;
};

// Endpoint Registrasi
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [existingUser] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({
                status: "error",
                message: "Username sudah digunakan",
                data: null,
                error: null
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
        res.status(201).json({
            status: "success",
            message: "User berhasil didaftarkan",
            data: { username },
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

// Endpoint Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Cek apakah user ada di database
        const [users] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
        if (users.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Username atau password salah",
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
                message: "Username atau password salah",
                data: null,
                error: null
            });
        }

        // Generate token
        const accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        // Simpan refresh token ke database
        await db.execute("INSERT INTO refresh_tokens (token, user_id) VALUES (?, ?)", [refreshToken, user.id]);

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


// Endpoint Refresh Token
app.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Refresh token tidak diberikan",
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

            const newAccessToken = jwt.sign({ id: user.id }, process.env.ACCESS_SECRET, { expiresIn: '15m' });

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
    const { accessToken, refreshToken } = req.body;

    if (!accessToken ||!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Access token atau refresh token tidak diberikan",
            data: null,
            error: null
        });
    }

    try {
        await db.execute("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

        jwt.verify(accessToken, process.env.ACCESS_SECRET, (err, decoded) => {
            if (!err) {
                const expiresAt = new Date(decoded.exp * 1000); // Convert ke datetime
                db.execute("INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)", [accessToken, expiresAt]);
            }
        });

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


// Middleware Authenticated Routes
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    // Periksa apakah token ada di blocklist
    const [rows] = await db.execute("SELECT * FROM token_blacklist WHERE token = ?", [token]);
    if (rows.length > 0) return res.sendStatus(403); // Token telah di-blacklist

    jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
;

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
