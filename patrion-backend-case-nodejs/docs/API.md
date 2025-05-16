# API Endpoints Dokümantasyonu

Bu dokümantasyon, Patrion IoT sensör izleme platformunun REST API endpointleri hakkında detaylı bilgi sunar.

## Kimlik Doğrulama

API endpointlerinin çoğu kimlik doğrulama gerektirmektedir. Kimlik doğrulama JWT (JSON Web Token) tabanlıdır.

### Kimlik Doğrulama İşlemi

1. Kullanıcı `/auth/login` endpointi ile giriş yapar ve token alır
2. Her istek için `Authorization` başlığında token gönderilir: `Bearer <token>`
3. Token'ın süresi dolduğunda `/auth/refresh` endpointi ile yenilenir

### Kimlik Doğrulama Yanıt Kodları

- `200 OK`: Başarılı kimlik doğrulama
- `401 Unauthorized`: Geçersiz token veya token eksik
- `403 Forbidden`: Yetkilendirme hatası (rol bazlı erişim)

## API Endpoint Grupları

API'ler şu ana kategorilere ayrılmıştır:

1. **Auth**: Kimlik doğrulama ve token işlemleri
2. **Users**: Kullanıcı yönetimi 
3. **Companies**: Şirket yönetimi
4. **Sensors**: Sensör ve sensör verisi yönetimi

---

## Auth Endpoints

### POST /auth/login

Kullanıcı girişi yapar ve JWT token döndürür.

**İstek:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Yanıt:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "User",
    "companyId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### POST /auth/refresh

Yeni bir access token almak için kullanılır.

**İstek:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Yanıt:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/register

Yeni kullanıcı kaydı yapar.

**İstek:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "role": "User",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

---

## Users Endpoints

### GET /users

Tüm kullanıcıları listeler. (SystemAdmin yetkisi gerektirir)

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Admin",
    "role": "SystemAdmin",
    "companyId": null,
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "company@example.com",
    "firstName": "Company",
    "lastName": "Admin",
    "role": "CompanyAdmin",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
]
```

### GET /users/:id

Belirli bir kullanıcının detaylarını getirir.

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Test",
  "lastName": "User",
  "role": "User",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

### GET /users/me

Giriş yapmış kullanıcının profilini getirir.

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Test",
  "lastName": "User",
  "role": "User",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

### POST /users

Yeni bir kullanıcı oluşturur.

**İstek:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "role": "User",
  "companyId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "role": "User",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

### POST /users/admin-create

Admin kullanıcı oluşturur (SystemAdmin veya CompanyAdmin rolü gerekir).

**İstek:**

```json
{
  "email": "newadmin@example.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "Admin",
  "role": "CompanyAdmin",
  "companyId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "email": "newadmin@example.com",
  "firstName": "New",
  "lastName": "Admin",
  "role": "CompanyAdmin",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

### GET /users/company/:companyId

Belirli bir şirkete ait kullanıcıları listeler.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "company@example.com",
    "firstName": "Company",
    "lastName": "Admin",
    "role": "CompanyAdmin",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "user@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "User",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
]
```

---

## Companies Endpoints

### GET /companies

Tüm şirketleri listeler.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Test Company",
    "description": "A test company",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Another Company",
    "description": "Another test company",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
]
```

### GET /companies/:id

Belirli bir şirketin detaylarını getirir.

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Test Company",
  "description": "A test company",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z",
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "email": "user@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "User"
    }
  ],
  "sensors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "sensorId": "temp_sensor_01",
      "name": "Temperature Sensor 1",
      "type": "temperature"
    }
  ]
}
```

### GET /companies/my-company

Giriş yapan CompanyAdmin'in şirketini getirir.

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Test Company",
  "description": "A test company",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z",
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "email": "user@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "User"
    }
  ],
  "sensors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "sensorId": "temp_sensor_01",
      "name": "Temperature Sensor 1",
      "type": "temperature"
    }
  ]
}
```

### GET /companies/my-company/dashboard

Şirket gösterge paneli bilgilerini getirir.

**Yanıt:**

```json
{
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Test Company"
  },
  "stats": {
    "userCount": 5,
    "sensorCount": 10,
    "activeSensorCount": 8
  },
  "recentData": [
    {
      "sensorId": "temp_sensor_01",
      "name": "Temperature Sensor 1",
      "timestamp": 1673784060,
      "data": {
        "temperature": 24.7
      }
    }
  ]
}
```

### POST /companies

Yeni bir şirket oluşturur.

**İstek:**

```json
{
  "name": "New Company",
  "description": "A new company"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "New Company",
  "description": "A new company",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

---

## Sensors Endpoints

### GET /sensors

Tüm sensörleri listeler.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "sensorId": "temp_sensor_01",
    "name": "Temperature Sensor 1",
    "description": "Office temperature sensor",
    "type": "temperature",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "sensorId": "humidity_sensor_01",
    "name": "Humidity Sensor 1",
    "description": "Office humidity sensor",
    "type": "humidity",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
]
```

### GET /sensors/registry

Erişim izni olan tüm sensörleri listeler.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "sensorId": "temp_sensor_01",
    "name": "Temperature Sensor 1",
    "description": "Office temperature sensor",
    "type": "temperature",
    "companyId": "550e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z"
  }
]
```

### GET /sensors/registry/:id

Belirli bir sensörü getirir.

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "sensorId": "temp_sensor_01",
  "name": "Temperature Sensor 1",
  "description": "Office temperature sensor",
  "type": "temperature",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Test Company"
  },
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

### GET /sensors/:sensorId/latest

Sensörün en son verilerini getirir.

**Query Parametreleri:**
- `limit` - Kaç veri noktası getirileceği (varsayılan: 10)

**Yanıt:**

```json
{
  "sensor": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "sensorId": "temp_sensor_01",
    "name": "Temperature Sensor 1",
    "type": "temperature"
  },
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "timestamp": 1673784060,
      "temperature": 24.7,
      "humidity": 45.5,
      "createdAt": "2023-01-15T12:01:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440102",
      "timestamp": 1673784000,
      "temperature": 24.5,
      "humidity": 45.2,
      "createdAt": "2023-01-15T12:00:00.000Z"
    }
  ]
}
```

### GET /sensors/:sensorId/range

Belirli bir zaman aralığında sensör verilerini getirir.

**Query Parametreleri:**
- `startDate` - Başlangıç tarihi (ISO formatı)
- `endDate` - Bitiş tarihi (ISO formatı)

**Yanıt:**

```json
{
  "sensor": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "sensorId": "temp_sensor_01",
    "name": "Temperature Sensor 1",
    "type": "temperature"
  },
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "timestamp": 1673784000,
      "temperature": 24.5,
      "humidity": 45.2,
      "createdAt": "2023-01-15T12:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440102",
      "timestamp": 1673784060,
      "temperature": 24.7,
      "humidity": 45.5,
      "createdAt": "2023-01-15T12:01:00.000Z"
    }
  ]
}
```

### POST /sensors

Yeni bir sensör oluşturur.

**İstek:**

```json
{
  "sensorId": "pressure_sensor_01",
  "name": "Pressure Sensor 1",
  "description": "Factory pressure sensor",
  "type": "pressure",
  "companyId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "sensorId": "pressure_sensor_01",
  "name": "Pressure Sensor 1",
  "description": "Factory pressure sensor",
  "type": "pressure",
  "companyId": "550e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z"
}
```

---

## Sensor Access Control Endpoints

### GET /sensors/access/user/:userId

Kullanıcının erişimi olan sensörleri getirir.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440201",
    "sensorId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "canView": true,
    "description": "Access for data analysis",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z",
    "sensor": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "sensorId": "temp_sensor_01",
      "name": "Temperature Sensor 1",
      "type": "temperature"
    }
  }
]
```

### GET /sensors/access/sensor/:sensorId

Sensöre erişimi olan kullanıcıları getirir.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440201",
    "sensorId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "canView": true,
    "description": "Access for data analysis",
    "createdAt": "2023-01-15T12:00:00.000Z",
    "updatedAt": "2023-01-15T12:00:00.000Z",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "email": "user@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "User"
    }
  }
]
```

### GET /sensors/my-access

Mevcut kullanıcının erişimi olan sensörleri getirir.

**Yanıt:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440201",
    "sensorId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "canView": true,
    "sensor": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "sensorId": "temp_sensor_01",
      "name": "Temperature Sensor 1",
      "type": "temperature",
      "companyId": "550e8400-e29b-41d4-a716-446655440002",
      "company": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Test Company"
      }
    }
  }
]
```

### POST /sensors/access

Sensör erişimi ekler.

**İstek:**

```json
{
  "sensorId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440003",
  "canView": true,
  "description": "Access for data analysis"
}
```

**Yanıt:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440201",
  "sensorId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440003",
  "canView": true,
  "description": "Access for data analysis",
  "createdAt": "2023-01-15T12:00:00.000Z",
  "updatedAt": "2023-01-15T12:00:00.000Z",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Rate Limiting

API, aşırı kullanımını önlemek için hız sınırlama uygulanmıştır:

- Dakikada maksimum 100 istek
- Limit aşıldığında 429 status kodu döner
- HTTP başlıklarında kalan limit bilgisi yer alır:
  - `x-ratelimit-limit`: 100
  - `x-ratelimit-remaining`: kalan istek sayısı
  - `x-ratelimit-reset`: sıfırlanma süresi (saniye) 