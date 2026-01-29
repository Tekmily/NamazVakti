# 🌙 Namaz Vakitleri – Web Uygulaması (Klasörsüz Sürüm)

Bu proje, **dünyanın her yerinde** çalışabilen, konuma göre **güncel namaz vakitlerini**,  
**Hicrî tarih ve Ramazan bilgisini**, ayrıca **yıla ve konuma özel Ramazan imsakiyesini**  
gösteren modern bir **web tabanlı namaz vakitleri uygulamasıdır**.

Proje özellikle:
- 📱 iPhone / mobil tarayıcılar
- 🌍 Global kullanım
- 🇹🇷 Türkiye için **Diyanet hesaplama yöntemi**
- 🌐 Çoklu dil desteği (TR / EN / DE)

göz önünde bulundurularak hazırlanmıştır.

---

## 📁 Proje Yapısı (Alt Klasör YOK)

Tüm dosyalar **tek dizindedir**:

```
index.html
style.css
script.js
tr.json
en.json
de.json
README.md
```

> ❗ Alt klasör bulunmaz. GitHub Pages ve basit HTTP sunucular için uygundur.

---

## 🚀 Özellikler (Detaylı)

### 1️⃣ Konum Seçimi
Kullanıcı üç farklı yöntemle konum belirleyebilir:

#### 📍 Otomatik Konum
- Tarayıcı / iOS konum izni ister
- `navigator.geolocation` kullanır
- Başarılı olursa koordinatlar otomatik alınır

#### 🧮 Manuel Koordinat Girişi
- Enlem (Latitude)
- Boylam (Longitude)
- Google Maps’ten alınan koordinatlar girilebilir

#### 🔍 Yer İsmi ile Arama
- Örnek:  
  - `İstanbul, Türkiye`  
  - `Berlin, Germany`
- OpenStreetMap **Nominatim API** kullanılır
- Sonuçtan koordinatlar otomatik çıkarılır

Seçilen konum:
- Ekranda gösterilir
- Tarayıcı hafızasına (**localStorage**) kaydedilir
- Sayfa yeniden açıldığında otomatik yüklenir

---

### 2️⃣ Namaz Vakitleri (API Destekli)

Namaz vakitleri **AlAdhan Prayer Times API** üzerinden alınır.

#### 🇹🇷 Türkiye İçin
- **Diyanet İşleri Başkanlığı yöntemi** (method=13)

#### 🌍 Diğer Ülkeler İçin
- **Muslim World League** yöntemi (method=3)

Gösterilen vakitler:
- İmsak
- Sabah (Fajr)
- Güneş
- Öğle (Dhuhr)
- İkindi (Asr)
- Akşam (Maghrib)
- Yatsı (Isha)

Ek bilgiler:
- Miladi tarih
- Hicrî tarih
- Ramazan ayı otomatik tespiti 🌙

---

### 3️⃣ Ramazan İmsakiyesi (Yıla + Konuma Özel)

- Kullanıcı yıl seçebilir (örn. 2024, 2026)
- Seçili konum için:
  - Ramazan ayındaki **tüm günler**
  - Günlük:
    - İmsak
    - Sabah
    - Akşam
    - Yatsı
- Tablo halinde gösterilir
- AlAdhan **calendar API** kullanılır

---

### 4️⃣ Kur’an’dan Ayetli Hatırlatmalar

- Özlü söz yoktur ❌
- **Kur’an ayetlerinden kısa, ibadete teşvik eden mealler** kullanılır
- Her vakit için ayrı metinler bulunur
- Ramazan ayında özel ayetler gösterilir
- Ayetler:
  - Türkçe
  - İngilizce
  - Almanca  
  olarak **ayrı JSON dosyalarında** tutulur

---

### 5️⃣ Çoklu Dil Desteği 🌐

Desteklenen diller:
- 🇹🇷 Türkçe (`tr.json`)
- 🇬🇧 English (`en.json`)
- 🇩🇪 Deutsch (`de.json`)

Özellikler:
- Dil seçimi manuel veya otomatik
- Tarayıcı dili algılanır
- Dil değişince:
  - Arayüz
  - Namaz isimleri
  - Ayetler
  - Ramazan tablosu başlıkları  
  anında güncellenir

---

### 6️⃣ Otomatik Güncelleme
- Seçili konum varsa:
  - Namaz vakitleri **6 saatte bir otomatik yenilenir**
- Manuel “Yenile” butonu da vardır

---

## 🧪 Test & Çalıştırma

### Bilgisayarda Test (Önerilen)

```bash
cd proje-klasoru
python -m http.server 8000
```

Tarayıcıdan aç:
```
http://localhost:8000
```

> ⚠️ `file://` ile açılması önerilmez (JSON ve API istekleri kısıtlanabilir)

---

### iPhone / Mobil Kullanım

1. Projeyi GitHub’a yükle
2. GitHub Pages’i aktif et
3. Safari ile siteyi aç
4. “Ana Ekrana Ekle”  
5. Uygulama gibi kullan 📱

---

## 🔐 Gizlilik

- Konum bilgisi **sadece tarayıcı içinde** kullanılır
- Sunucuya veya üçüncü kişilere kaydedilmez
- localStorage sadece cihaz içindir

---

## 📚 Kullanılan Teknolojiler

- HTML5
- CSS3 (mobil uyumlu)
- Vanilla JavaScript
- AlAdhan API
- OpenStreetMap Nominatim API

---

## ⚠️ Yasal Not

- Namaz vakitleri **bilgilendirme amaçlıdır**
- Resmî vakitler için yerel müftülük veya Diyanet kaynakları esas alınmalıdır

---

## 👤 Geliştirme Amacı

Bu proje:
- Kişisel kullanım
- Eğitim
- Açık kaynak öğrenme

amaçlarıyla hazırlanmıştır.

Allah kabul etsin 🤲


## Kullanıcı Logları

Projede iki adet log dosyası vardır:

- `usage.txt`: İnsan tarafından okunabilir satır satır girişler
- `usage.log`: Her satırı JSON formatında detaylı log

Tarayıcıda çalışan uygulama, `/api/log-usage` adresine küçük JSON istekleri gönderir.
Bu istekler `server.js` içindeki Node.js/Express sunucusu tarafından karşılanır ve
log bilgileri bu iki dosyaya kaydedilir.

Sunucuyu başlatmak için:

```bash
npm install express
node server.js
```

Daha sonra uygulamaya `http://localhost:3000` adresinden ulaşabilirsiniz.
