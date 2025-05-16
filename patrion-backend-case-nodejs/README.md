# Patrion Backend Case - NestJS

Bu proje, NestJS, TypeScript, PostgreSQL ve Fastify kullanılarak oluşturulmuş bir IoT sensör izleme platformu backend uygulamasıdır. Sistemde şirket-kullanıcı ilişkisi, rol tabanlı yetkilendirme, gerçek zamanlı sensör verisi izleme ve güvenli MQTT iletişimi bulunmaktadır.

## Özellikler

- NestJS ve TypeScript ile geliştirilmiş REST API
- Fastify HTTP adaptörü
- PostgreSQL veritabanı ve TypeORM
- JWT tabanlı kimlik doğrulama
- Rate Limiting (dakikada 100 istek)
- WebSocket desteği ile gerçek zamanlı sensör verileri
- MQTT broker ile güvenli TLS/SSL iletişimi
- Rol tabanlı yetkilendirme (SystemAdmin, CompanyAdmin, User)
- Şirket bazlı sensör yönetimi
- Docker ve Docker Compose ile kolay kurulum

## Dokümantasyon

Detaylı dokümantasyon için aşağıdaki bağlantıları kullanabilirsiniz:

- [API Endpoints Dokümantasyonu](docs/API.md) - Tüm API endpoints, istek/yanıt örnekleri ve kullanım detayları
- [Mimari Tasarım Dokümantasyonu](docs/ARCHITECTURE.md) - Sistem mimarisi, katmanlar ve tasarım prensipleri
- [Deployment Rehberi](docs/DEPLOYMENT.md) - Kurulum, yapılandırma ve ürün ortamına dağıtım adımları 
- [WebSocket API ve Gerçek Zamanlı İletişim](docs/WEBSOCKET.md) - WebSocket kullanımı ve gerçek zamanlı veri akışı

## Sistem Mimarisi

Bu IoT platformu aşağıdaki bileşenlerden oluşmaktadır:

1. **NestJS API Servisi**: REST API ve WebSocket
2. **PostgreSQL**: Kullanıcı, şirket, sensör ve veri depolama 
3. **Eclipse Mosquitto**: MQTT broker 
4. **MQTT Explorer**: Broker üzerindeki mesajları izlemek için web arayüzü

## Kurulum

### Docker ile Kurulum

1. Depoyu klonlayın:

```bash
git clone <repo-url>
cd patrion-backend-case-nodejs
```

2. SSL sertifikalarını oluşturun:

```bash
mkdir -p ssl
openssl req -new -x509 -days 365 -nodes -out ssl/mqtt-broker.crt -keyout ssl/mqtt-broker.key -subj "/CN=localhost"
```

3. Docker Compose ile servisleri başlatın:

```bash
docker-compose up -d
```
4. Dummy Data oluşturmak için 

```bash
docker exec -it patrion_mosquitto_client /bin/sh -c "cd /mqtt-scripts && chmod +x simulate-sensor.sh && sh simulate-sensor.sh"
```

## Rol Bazlı Erişim Kontrolü

Sistemde 3 farklı kullanıcı rolü vardır:

- **SystemAdmin**: 
  - Tüm şirketleri ve kullanıcıları yönetebilir
  - Tüm sensörlere erişebilir
  - Yeni şirket ekleyebilir
  - Her şirkete kullanıcı atayabilir

- **CompanyAdmin**: 
  - Kendi şirketindeki kullanıcıları yönetebilir
  - Şirketine ait sensörleri yönetebilir
  - Kullanıcılara sensör erişimi tanımlayabilir
  - API veya WebSocket üzerinden sensör verilerini izleyebilir

- **User**: 
  - Erişim izni verilen sensörleri izleyebilir
  - Sensör bazlı erişim izni

## WebSocket Kimlik Doğrulama ve Erişim Kontrolü

WebSocket bağlantıları JWT token ile güvence altına alınmıştır. Bağlantı sırasında:

1. İstemci `socket.io` kullanarak bağlantı yapar ve JWT token'ı gönderir
2. Token doğrulanır ve kullanıcı nesnesi socket 'data' nesnesine eklenir
3. Rol tabanlı erişim kontrolü sensör aboneliklerinde uygulanır
4. Kullanıcının erişim yetkisi değiştiğinde abonelik durumu güncellenir

## MQTT ve TLS/SSL Güvenliği

MQTT broker üzerindeki iletişim TLS/SSL ile şifrelenerek güvence altına alınmıştır:

- 1883 portu: Standard MQTT
- 8883 portu: TLS/SSL üzerinden MQTT 
- 9001 portu: WebSockets 

SSL/TLS yapılandırması:
- Self-signed sertifikalar (geliştirme ortamı için)

## Sensör Erişim Sistemi

Sistemde many-to-many ilişkisiyle esnek bir sensör erişim sistemi uygulanmıştır:

- SensorUserAccess entity ile kullanıcı ve sensör arasında ilişki kurulur
- Her kullanıcı için farklı sensörlere erişim izinleri tanımlanabilir:
  - canView: Sensör verisini görüntüleme


## Rate Limiting

API aşırı kullanımını önlemek için rate limiting uygulanmıştır:

- @fastify/rate-limit kütüphanesi kullanılmıştır
- Dakikada maksimum 100 istek
- Limit aşımında 429 status kodu döner
- HTTP başlıklarında kalan limit bilgisi sunulur:
  - x-ratelimit-limit: 100
  - x-ratelimit-remaining: kalan istek sayısı
  - x-ratelimit-reset: sıfırlanma süresi (saniye)

## API Endpoints

### Auth

- `POST /auth/login` - Kullanıcı girişi
- `POST /auth/register` - Yeni kullanıcı kaydı
- `POST /auth/refresh` - JWT token yenileme
- `POST /auth/logout` - Kullanıcı çıkışı
- `GET /users/me` - Giriş yapmış kullanıcının profilini getir

### Users

- `GET /users` - Tüm kullanıcıları listele (SystemAdmin)
- `GET /users/:id` - Belirli bir kullanıcıyı getir
- `POST /users` - Yeni kullanıcı oluştur (SystemAdmin, CompanyAdmin)
- `POST /users/admin-create` - Yeni admin kullanıcı oluştur (SystemAdmin, CompanyAdmin)
- `PATCH /users/:id` - Kullanıcı bilgilerini güncelle
- `DELETE /users/:id` - Kullanıcı sil
- `GET /users/company/:companyId` - Şirkete ait kullanıcıları listele

### Companies

- `GET /companies` - Tüm şirketleri listele (SystemAdmin)
- `GET /companies/:id` - Belirli bir şirketi getir
- `GET /companies/my-company` - Giriş yapan CompanyAdmin'in şirketini getir
- `GET /companies/my-company/dashboard` - Şirket gösterge paneli bilgilerini getir
- `POST /companies` - Yeni şirket oluştur (SystemAdmin)
- `PATCH /companies/:id` - Şirket bilgilerini güncelle
- `PATCH /companies/my-company` - CompanyAdmin'in kendi şirket bilgilerini güncellemesi
- `DELETE /companies/:id` - Şirket sil

### Sensors

- `GET /sensors` - Tüm sensörleri listele (SystemAdmin, CompanyAdmin)
- `GET /sensors/registry` - Erişim izni olan tüm sensörleri listele
- `GET /sensors/registry/:id` - Belirli bir sensörü getir
- `GET /sensors/:sensorId/latest` - Sensörün en son verilerini getir
- `GET /sensors/:sensorId/range` - Belirli bir zaman aralığında sensör verilerini getir
- `POST /sensors` - Yeni sensör oluştur
- `PUT /sensors/registry/:id` - Sensör bilgilerini güncelle
- `DELETE /sensors/registry/:id` - Sensör sil

### Sensor Access Control

- `POST /sensors/access` - Sensör erişimi ekle
- `DELETE /sensors/access` - Sensör erişimi kaldır
- `GET /sensors/access/user/:userId` - Kullanıcının erişimi olan sensörleri getir
- `GET /sensors/access/sensor/:sensorId` - Sensöre erişimi olan kullanıcıları getir
- `GET /sensors/access/check/:sensorId/:userId` - Erişim kontrolü yap
- `GET /sensors/my-access` - Giriş yapan kullanıcının erişimi olan sensörleri getir

## WebSocket Events

- `sensors-registry` - Tüm erişilebilir sensör listesi
- `subscribe-sensor` - Sensör aboneliği
- `unsubscribe-sensor` - Sensör aboneliğini iptal et
- `get-sensor-data` - Sensör verilerini getir
- `sensor-data-{sensorId}` - Belirli bir sensörün verileri
- `sensor-status-{sensorId}` - Belirli bir sensörün durumu
- `subscription-revoked` - Abonelik iptal bildirimi

## Teknolojiler

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Fastify (HTTP framework)
- Socket.IO (WebSockets)
- MQTT.js (MQTT client)
- Eclipse Mosquitto (MQTT broker)
- JWT (JSON Web Token)
- Docker & Docker Compose
