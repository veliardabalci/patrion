#!/bin/sh

INTERVAL=60
SENSOR_1="temp_sensor_01"
SENSOR_2="temp_sensor_02"
SENSOR_3="temp_sensor_03"
SENSOR_4="patrion_temp_sensor_01"

echo "Sensör simülasyonu başlatılıyor: $SENSOR_1 $SENSOR_2 $SENSOR_3 $SENSOR_4"
echo "Her $INTERVAL saniyede bir veri gönderilecek"
echo "Durdurmak için CTRL+C'ye basın"

# Gaussian benzeri rastgele sayı üret (ortalama, sapma, min, max)
generate_random() {
  MEAN=$1
  STD=$2
  MIN=$3
  MAX=$4
  VALUE=$(awk -v mean=$MEAN -v std=$STD -v min=$MIN -v max=$MAX '
    BEGIN {
      # Box-Muller transform
      srand();
      u1 = rand(); u2 = rand();
      z = sqrt(-2 * log(u1)) * cos(2 * 3.14159 * u2);
      val = mean + z * std;
      if (val < min) val = min;
      if (val > max) val = max;
      printf "%.1f", val;
    }
  ')
  echo $VALUE
}

while true; do
  for SENSOR_ID in "$SENSOR_1" "$SENSOR_2" "$SENSOR_3" "$SENSOR_4"; do
    TIMESTAMP=$(date +%s)

    case "$SENSOR_ID" in
      "$SENSOR_1")
        TEMPERATURE=$(generate_random 26 2 20 32)
        HUMIDITY=$(generate_random 55 5 45 70)
        ;;
      "$SENSOR_2")
        TEMPERATURE=$(generate_random 25 2 20 32)
        HUMIDITY=$(generate_random 68 2 65 75)
        ;;
      "$SENSOR_3")
        TEMPERATURE=$(generate_random 66 3 60 70)
        HUMIDITY=$(generate_random 50 4 45 60)
        ;;
      "$SENSOR_4")
        TEMPERATURE=$(generate_random 26 2 20 32)
        HUMIDITY=$(generate_random 55 5 45 70)
        ;;
    esac

    JSON="{\"sensor_id\":\"$SENSOR_ID\",\"timestamp\":$TIMESTAMP,\"temperature\":$TEMPERATURE,\"humidity\":$HUMIDITY}"
    echo "[$SENSOR_ID] Sensör verisi gönderiliyor: $JSON"

    mosquitto_pub -h mosquitto -t "patrion/sensors/$SENSOR_ID" -m "$JSON"
    sleep 0.5
  done

  echo "------- $INTERVAL saniye bekleniyor -------"
  sleep $INTERVAL
done
