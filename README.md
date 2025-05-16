# Patrion Case

Docker kullanarak tüm sistemi kolayca çalıştırabilirsiniz.

## Gereksinimler

- Docker ve Docker Compose
- Git

## Kurulum

Projeyi klonlayın:
```bash
git clone https://github.com/veliardabalci/patrion.git
cd patrion
```

## Projeyi Çalıştırma

Tüm servisleri tek bir komutla başlatın:

```bash
docker-compose up -d
```

Bu komut aşağıdaki servisleri başlatacaktır:
- Frontend (http://localhost:3000)
- Backend API (http://localhost:3001)
- PostgreSQL veritabanı
- MQTT Broker (Mosquitto)
- MQTT Explorer (http://localhost:4000)

## Servislere Erişim

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MQTT Explorer**: http://localhost:4000
- **PostgreSQL**: localhost:5432
  - Kullanıcı: postgres
  - Şifre: postgres
  - Veritabanı: patrion_case_study

## Logları İzleme

Tüm servislerin loglarını görüntülemek için:

```bash
docker-compose logs -f
```

Belirli bir servisin loglarını görüntülemek için:

```bash
docker-compose logs -f [servis-adı]
```

Örnek:
```bash
docker-compose logs -f patrion-frontend
docker-compose logs -f api
```

## Servisleri Durdurma

Tüm servisleri durdurmak için:

```bash
docker-compose down
```

## MQTT Kullanımı

Dummy data oluşturmayı başlatmak için:

```bash
docker exec -it patrion_mosquitto_client /bin/sh -c "cd /mqtt-scripts && chmod +x simulate-sensor.sh && sh simulate-sensor.sh"
```

## Sorun Giderme

1. **Frontend API'ye bağlanamıyor**: 
   - API servisinin çalışıp çalışmadığını kontrol edin: `docker-compose ps`
   - API loglarını kontrol edin: `docker-compose logs api`

2. **Veritabanı bağlantı hatası**:
   - PostgreSQL servisinin çalışıp çalışmadığını kontrol edin: `docker-compose ps`
   - PostgreSQL loglarını kontrol edin: `docker-compose logs postgres`

3. **MQTT bağlantı sorunları**:
   - Mosquitto servisinin çalışıp çalışmadığını kontrol edin: `docker-compose ps`
   - Mosquitto loglarını kontrol edin: `docker-compose logs mosquitto` 