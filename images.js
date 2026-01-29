// images.js
// Görsel (fotoğraf) sağlayıcıları için yapılandırma

// Öncelik sırası: Unsplash -> Pexels -> Pixabay -> Openverse -> Lorem Picsum
// Gerekli yerlerde kendi API anahtarlarını eklemelisin.
const UNSPLASH_ACCESS_KEY = ""; // https://unsplash.com/developers
const PEXELS_API_KEY = "";      // https://www.pexels.com/api/
const PIXABAY_API_KEY = "";     // https://pixabay.com/api/docs/
// Openverse için genelde API key gerekmez, ancak bir 'User-Agent' / 'Referer' politikasına dikkat edilmeli.

// Namaz vakitlerine göre varsayılan arama kelimeleri
function getImageQueryForPrayer(key, isRamadan) {
  if (isRamadan) {
    return "ramadan mosque lantern quran";
  }
  switch (key) {
    case "Fajr":
    case "Imsak":
      return "dawn mosque prayer";
    case "Dhuhr":
      return "noon mosque prayer";
    case "Asr":
      return "afternoon mosque prayer";
    case "Maghrib":
      return "sunset iftar mosque";
    case "Isha":
      return "night mosque prayer";
    default:
      return "mosque prayer";
  }
}

// Hızlı, anahtar gerektirmeyen placeholder arka plan (Lorem Picsum)
// Senkron çalışır; resolveInspirationVisual içinde de kullanılabilir.
function resolveInspirationVisual(key, isRamadan) {
  const seed = encodeURIComponent(getImageQueryForPrayer(key, isRamadan));
  // Seed tabanlı rastgele ama sabit tarzdaki görsel
  return `url("https://picsum.photos/seed/${seed}/960/480")`;
}

// Asenkron olarak gerçek fotoğraf API'lerinden birini dene
async function loadInspirationImageForKey(key, isRamadan, el) {
  const query = getImageQueryForPrayer(key, isRamadan);

  // Yardımcı: stil uygula
  const applyBg = (url) => {
    if (el && url) {
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  };

  // 1) Unsplash Random Photo API
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(
        "https://api.unsplash.com/photos/random?orientation=landscape&query=" +
          encodeURIComponent(query) +
          "&client_id=" +
          UNSPLASH_ACCESS_KEY
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.urls && data.urls.regular) {
          applyBg(data.urls.regular);
          return;
        }
      }
    } catch (e) {
      console.warn("Unsplash API failed", e);
    }
  }

  // 2) Pexels Search API
  if (PEXELS_API_KEY) {
    try {
      const res = await fetch(
        "https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=" +
          encodeURIComponent(query),
        {
          headers: {
            Authorization: PEXELS_API_KEY
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.photos && data.photos.length > 0) {
          const photo = data.photos[0];
          if (photo.src && (photo.src.landscape || photo.src.large)) {
            applyBg(photo.src.landscape || photo.src.large);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Pexels API failed", e);
    }
  }

  // 3) Pixabay Search API
  if (PIXABAY_API_KEY) {
    try {
      const res = await fetch(
        "https://pixabay.com/api/?image_type=photo&per_page=3&key=" +
          PIXABAY_API_KEY +
          "&q=" +
          encodeURIComponent(query)
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.hits && data.hits.length > 0) {
          const hit = data.hits[0];
          if (hit.largeImageURL) {
            applyBg(hit.largeImageURL);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Pixabay API failed", e);
    }
  }

  // 4) Openverse Image Search API (açık Creative Commons görseller)
  try {
    const res = await fetch(
      "https://api.openverse.engineering/v1/images?q=" +
        encodeURIComponent(query) +
        "&page_size=1"
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const item = data.results[0];
        if (item && item.url) {
          applyBg(item.url);
          return;
        }
      }
    }
  } catch (e) {
    console.warn("Openverse API failed", e);
  }

  // 5) Yedek: Lorem Picsum üzerinden random görsel
  const fallbackSeed = encodeURIComponent(query + "-" + Date.now());
  applyBg(`https://picsum.photos/seed/${fallbackSeed}/960/480`);
}
