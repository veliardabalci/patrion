#!/bin/bash

# MQTT TLS bağlantısı test scripti

echo "Testing MQTT over TLS connection..."

# TLS/SSL ile subscribe
echo "Subscribing to test topic with TLS/SSL..."
mosquitto_sub -h mosquitto -p 8883 --cafile /mosquitto/certs/mqtt-broker.crt \
  --cert /mosquitto/certs/mqtt-broker.crt --key /mosquitto/certs/mqtt-broker.key \
  -t "patrion/test" -v &

# Arka plan işleminin PID'ini al
SUB_PID=$!

# Biraz bekle
sleep 2

# TLS/SSL ile publish
echo "Publishing test message with TLS/SSL..."
mosquitto_pub -h mosquitto -p 8883 --cafile /mosquitto/certs/mqtt-broker.crt \
  --cert /mosquitto/certs/mqtt-broker.crt --key /mosquitto/certs/mqtt-broker.key \
  -t "patrion/test" -m "TLS Test Message"

# Biraz daha bekle mesajın alınması için
sleep 2

# Abone olan işlemi sonlandır
kill $SUB_PID

echo "Test completed! If a message was received, TLS is working correctly." 