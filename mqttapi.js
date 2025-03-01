require("dotenv").config();
const express = require("express");
const mqtt = require("mqtt");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

// Konfigurasi koneksi database MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database.");
  }
});

// Koneksi ke broker MQTT
const MQTT_BROKER = "mqtt://test.mosquitto.org";
const client = mqtt.connect(MQTT_BROKER);

const TOPIC_BASE = "iot/+/data"; // Subscribe ke semua tongkat

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
  client.subscribe(TOPIC_BASE, (err) => {
    if (err) {
      console.error("Subscribe error:", err);
    } else {
      console.log(`Subscribed to topic: ${TOPIC_BASE}`);
    }
  });
});

// Menangani pesan yang diterima dari MQTT
client.on("message", (topic, message) => {
  console.log(`Received message on topic: ${topic}`);
  try {
    const data = JSON.parse(message.toString());
    const stick_id = topic.split("/")[1]; // Ambil ID stick dari topik

    const { distance, water_level, longitude, latitude, emergency } = data;

    console.log(`Received data from ${stick_id}:`, data);

    // Simpan ke database
    const insertData = `INSERT INTO stick_data (stick_id, distance, water_level, longitude, latitude, emergency) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(
      insertData,
      [stick_id, distance, water_level, longitude, latitude, emergency],
      (err) => {
        if (err) {
          console.error("Data insert error:", err);
        } else {
          console.log("Data inserted successfully.");
        }
      }
    );
    const insertLatestData = `INSERT INTO latest_stick_data (stick_id, distance, water_level, longitude, latitude, emergency) 
          VALUES (?, ?, ?, ?, ?, ?) 
          ON DUPLICATE KEY UPDATE 
          distance = VALUES(distance), 
          water_level = VALUES(water_level), 
          longitude = VALUES(longitude), 
          latitude = VALUES(latitude), 
          emergency = VALUES(emergency), 
          last_updated = CURRENT_TIMESTAMP;
          `;
    db.query(
      insertLatestData,
      [stick_id, distance, water_level, longitude, latitude, emergency],
      (err) => {
        if (err) {
          console.error("Latest data insert error:", err);
        } else {
          console.log("Latest data inserted successfully.");
        }
      }
    );
  } catch (error) {
    console.error("Error parsing MQTT message:", error);
  }
});

// API endpoint untuk melihat data dari database
app.get("/data", (req, res) => {
  const query = "SELECT * FROM stick_data ORDER BY timestamp DESC";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Database query error" });
    } else {
      res.json(results);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
