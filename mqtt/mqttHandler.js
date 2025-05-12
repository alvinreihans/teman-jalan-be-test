const mqtt = require("mqtt");
const db = require("../utils/db");

const MQTT_BROKER = "mqtt://test.mosquitto.org"; // Ganti jika pakai broker lain
const TOPIC_BASE = "iot/+/data"; // contoh: iot/stick123/data

const init = () => {
  const client = mqtt.connect(MQTT_BROKER);

  client.on("connect", () => {
    console.log("MQTT terhubung");
    client.subscribe(TOPIC_BASE, (err) => {
      if (err) {
        console.error("Gagal subscribe:", err.message);
      } else {
        console.log(`Subscribed to topic: ${TOPIC_BASE}`);
      }
    });
  });

  client.on("message", async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const stick_id = topic.split("/")[1];
      const { distance, water_level, longitude, latitude, emergency } = data;

      await db.execute(
        `INSERT INTO stick_data (stick_id, distance, water_level, longitude, latitude, emergency)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stick_id, distance, water_level, longitude, latitude, emergency]
      );

      await db.execute(
        `INSERT INTO latest_stick_data (stick_id, distance, water_level, longitude, latitude, emergency)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           distance = VALUES(distance),
           water_level = VALUES(water_level),
           longitude = VALUES(longitude),
           latitude = VALUES(latitude),
           emergency = VALUES(emergency),
           last_updated = CURRENT_TIMESTAMP`,
        [stick_id, distance, water_level, longitude, latitude, emergency]
      );

      console.log(`Data dari ${stick_id} disimpan.`);
    } catch (err) {
      console.error("Gagal parsing atau menyimpan data MQTT:", err.message);
    }
  });
};

module.exports = { init };
