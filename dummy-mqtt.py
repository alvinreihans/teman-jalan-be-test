import paho.mqtt.client as mqtt
import json
import random
import time

BROKER = "test.mosquitto.org"  # Ganti dengan alamat broker yang digunakan
PORT = 1883
TOPIC_BASE = "iot"

# List ID tongkat yang digunakan
stick_ids = ["stick_1", "stick_2", "stick_3", "stick_4"]

def generate_dummy_data(stick_id):
    """Membuat data dummy untuk dikirim ke broker MQTT"""
    data = {
        "id": stick_id,
        "distance": round(random.uniform(50, 200), 2),
        "water_level": round(random.uniform(0, 30), 2),
        "longitude": round(random.uniform(106.5, 107.5), 6),
        "latitude": round(random.uniform(-6.5, -6.0), 6),
        "emergency": random.choice([0, 1])
    }
    return json.dumps(data)

def publish_data(client):
    """Mengirimkan data dummy dari setiap tongkat"""
    for stick_id in stick_ids:
        topic = f"{TOPIC_BASE}/{stick_id}/data"
        message = generate_dummy_data(stick_id)
        client.publish(topic, message)
        print(f"Published to {topic}: {message}")

def on_connect(client, userdata, flags, rc):
    """Callback ketika terhubung ke broker"""
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print(f"Failed to connect, return code {rc}")

# Konfigurasi MQTT Client
client = mqtt.Client()
client.on_connect = on_connect
client.connect(BROKER, PORT, 60)

# Loop pengiriman data
while True:
    publish_data(client)
    time.sleep(2)  # Mengirim data setiap 2 detik
