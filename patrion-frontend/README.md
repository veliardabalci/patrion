# Patrion IoT Sensör İzleme Panosu

## Proje Hakkında
Patrion IoT Sensör İzleme Panosu, endüstriyel ortamlardaki sıcaklık ve nem gibi kritik parametreleri gerçek zamanlı olarak izleyen modern bir web uygulamasıdır. Bu uygulama, fabrikalar, depolar ve diğer sanayi tesislerindeki IoT sensörlerinden gelen verileri toplayarak, kullanıcı dostu bir arayüz üzerinden görselleştirmeyi sağlar.

## Özellikler

- **Gerçek Zamanlı Veri İzleme**: Socket.IO entegrasyonu ile sensör verilerini anlık olarak görüntüleme
- **Çoklu Sensör Tipleri**: Sıcaklık, nem ve kombine sensör tiplerini destekler
- **Grafik Görselleştirme**: Chart.js ile gelişmiş veri görselleştirme ve tarihsel veri analizi
- **Alarm Sistemi**: Kritik eşik değerlerini aşan sensörler için otomatik uyarı
- **Şirket Yönetimi**: Çoklu şirket desteği ile farklı lokasyonları izleme imkanı
- **Kullanıcı Yetkilendirme**: Role dayalı erişim kontrol sistemi

## Teknolojiler

- **Frontend**: React, Next.js, TypeScript

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak uygulamayı görüntüleyebilirsiniz.

### Docker ile Kurulum
1. Docker ile uygulamayı ayağa kaldırın:
   ```bash
   docker-compose up -d
   ```

2. Uygulama http://localhost:3000 adresinde çalışmaya başlayacaktır.

3. Docker loglarını kontrol etmek için:
   ```bash
   docker-compose logs -f
   ```

4. Uygulamayı durdurmak için:
   ```bash
   docker-compose down
   ```

### Ortam Değişkenleri

Docker ile çalıştırırken ortam değişkenlerini ayarlamak için `.env` dosyası oluşturun veya doğrudan `docker-compose.yml` dosyasını düzenleyin:

```
NEXT_PUBLIC_API_URL=http://api-server-adresi:port
NEXT_PUBLIC_WEBSOCKET_URL=ws://websocket-server-adresi:port
```

## Kullanım

1. Sisteme giriş yapın (admin veya şirket kullanıcısı olarak)
2. Dashboard üzerinden sensör verilerini gerçek zamanlı olarak izleyin
3. Sensör detay sayfalarında tarihsel veri grafiklerini görüntüleyin
4. Alarm durumundaki sensörleri kontrol edin