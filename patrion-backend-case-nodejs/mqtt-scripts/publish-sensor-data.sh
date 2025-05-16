#!/bin/bash

if [ -z "$1" ]; then
  SENSOR_ID="temp_sensor_01"
else
  SENSOR_ID=$1
fi

if [ -z "$2" ]; then
  COMPANY_ID="default-company"
else
  COMPANY_ID=$2
fi

# Anlık zaman (unix timestamp)
TIMESTAMP=$(date +%s)

# Rastgele sıcaklık ve nem değerleri üret
TEMPERATURE=$(awk -v min=20 -v max=30 'BEGIN{srand(); print min+rand()*(max-min)}')
HUMIDITY=$(awk -v min=40 -v max=80 'BEGIN{srand(); print min+rand()*(max-min)}')

# İki ondalık basamağa yuvarla
TEMPERATURE=$(printf "%.2f" $TEMPERATURE)
HUMIDITY=$(printf "%.2f" $HUMIDITY)

# JSON mesajı oluştur
JSON="{\"sensor_id\":\"$SENSOR_ID\",\"company_id\":\"$COMPANY_ID\",\"timestamp\":$TIMESTAMP,\"temperature\":$TEMPERATURE,\"humidity\":$HUMIDITY}"

echo "Sensör verisi gönderiliyor: $JSON"

# MQTT'ye gönder
mosquitto_pub -h mosquitto -t "patrion/sensors/$SENSOR_ID" -m "$JSON"

echo "Veri gönderildi!" 