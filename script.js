// === Global State ===
let lastCoords = null;
let lastIsRamadan = false;
let lastTimings = null;
let lastRamadanRows = null;

let currentLanguageCode = "tr";
let notificationsEnabled = false;
let notifImsak10Sent = false;
let notifIftar10Sent = false;

let currentLanguageData = null;

const SUPPORTED_LANGS = ["tr","en","de","ar","es","fr","ru","pt","hi","zh"];

async function collectClientInfo() {
  let geo = null;
  if ("geolocation" in navigator) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000
        });
      });
      geo = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        source: "browser"
      };
    } catch (e) {
      // izin verilmemiş olabilir, önemli değil
    }
  }

  const ua = navigator.userAgent || "";
  const lang = navigator.language || "";

  return {
    timestamp: new Date().toISOString(),
    userAgent: ua,
    language: lang,
    geo
  };
}

async function logUsageToServer(extra) {
  try {
    const baseInfo = await collectClientInfo();
    const payload = Object.assign({}, baseInfo, extra || {});

    await fetch("/api/log-usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("Log gönderilemedi", e);
  }
}



let countdownIntervalId = null;

function tickCurrentTime() {
  const el = document.getElementById("current-time-display");
  if (!el) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  el.textContent = `${hh}:${mm}:${ss}`;
}

setInterval(tickCurrentTime, 1000);



function clearCountdown() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}





function updateRamadanCountdown() {
  if (!lastIsRamadan || !lastTimings || !lastTimings.timings) return;

  const now = new Date();
  const t = lastTimings.timings;

  const imsakEl = document.getElementById("ramadan-imsak-countdown");
  const iftarEl = document.getElementById("ramadan-iftar-countdown");

  const imsakDate = parseTimingToDate(now, t.Imsak);
  const iftarDate = parseTimingToDate(now, t.Maghrib);

  const formatMin = (ms) => {
    if (ms <= 0) return "0 dk";
    return Math.ceil(ms / 60000) + " dk";
  };

  if (imsakEl) {
    if (imsakDate && imsakDate > now) {
      imsakEl.textContent = "İmsak vaktine " + formatMin(imsakDate - now) + " kaldı";
    } else {
      imsakEl.textContent = "İmsak vakti girdi";
    }
  }

  if (iftarEl) {
    if (iftarDate && iftarDate > now) {
      iftarEl.textContent = "İftar vaktine " + formatMin(iftarDate - now) + " kaldı";
    } else {
      iftarEl.textContent = "İftar vakti girdi";
    }
  }
}

function updateCountdownDisplay(currentSegment, nextSegment, remainingMs) {
  const el = document.getElementById("countdown-text");
  if (!el) return;

  const now = new Date();

  // Ramazan için özel: sahur (imsak) ve iftar sürelerini birlikte göster
  if (lastIsRamadan && lastTimings && lastTimings.timings) {
    const t = lastTimings.timings;
    const today = new Date();
    const imsakDate = parseTimingToDate(today, t.Imsak);
    const maghribDate = parseTimingToDate(today, t.Maghrib);

    let remImsak = imsakDate ? imsakDate - now : null;
    let remIftar = maghribDate ? maghribDate - now : null;

    const formatRemain = (ms) => {
      if (ms == null) return "";
      if (ms <= 0) return "0:00:00";
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const ss = String(s).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    };

    let line = "";

    if (remImsak != null && remImsak > 0) {
      const tpl = getUI("ramadanImsakInTime") || "İmsak vaktine {time} kaldı";
      line += tpl.replace("{time}", formatRemain(remImsak));
    } else if (imsakDate) {
      line += getUI("ramadanImsakStarted") || "İmsak vakti girdi";
    }

    if (remIftar != null && remIftar > 0) {
      const tpl2 = getUI("ramadanIftarInTime") || "İftara {time} kaldı";
      const part = tpl2.replace("{time}", formatRemain(remIftar));
      line += (line ? " • " : "") + part;
    } else if (maghribDate) {
      const started = getUI("ramadanIftarStarted") || "İftar vakti girdi";
      line += (line ? " • " : "") + started;
    }

    // Üstteki genel geri sayım paneli için tam saat formatı
    el.textContent = line || (getUI("countdownFinished") || "Bugün için vakit kalmadı");

    // Ramazan bölümündeki yerel geri sayım için dakika bazlı metin
    const ramadanEl = document.getElementById("ramadan-countdown-text");
    if (ramadanEl) {
      let minuteLine = "";
      if (remImsak != null && remImsak > 0) {
        const minsImsak = Math.ceil(remImsak / 60000);
        const tplMinImsak =
          getUI("ramadanImsakInMinutes") || "İmsak vaktine {minutes} dakika kaldı";
        minuteLine += tplMinImsak.replace("{minutes}", String(minsImsak));
      } else if (imsakDate) {
        minuteLine += getUI("ramadanImsakStarted") || "İmsak vakti girdi";
      }
      if (remIftar != null && remIftar > 0) {
        const minsIftar = Math.ceil(remIftar / 60000);
        const tplMinIftar =
          getUI("ramadanIftarInMinutes") || "İftar vaktine {minutes} dakika kaldı";
        const partMin = tplMinIftar.replace("{minutes}", String(minsIftar));
        minuteLine += (minuteLine ? " • " : "") + partMin;
      } else if (maghribDate) {
        const started = getUI("ramadanIftarStarted") || "İftar vakti girdi";
        minuteLine += (minuteLine ? " • " : "") + started;
      }
      ramadanEl.textContent =
        minuteLine || (getUI("countdownFinished") || "Bugün için vakit kalmadı");
    }

    return;
  }

  // Normal günler
  if (!currentSegment || remainingMs <= 0) {
    el.textContent = getUI("countdownFinished") || "Bugün için vakit kalmadı";
    return;
  }

  const minutesLeft = Math.ceil(remainingMs / 60000);
  const currentLabel = getLabelForPrayer(currentSegment.key);
  const nextLabel = nextSegment ? getLabelForPrayer(nextSegment.key) : "";

  if (nextLabel) {
    const tpl = getUI("countdownCurrentAndNext") ||
      "Şu an {current} vakti • {next} vaktine {minutes} dk kaldı";
    el.textContent = tpl
      .replace("{current}", currentLabel)
      .replace("{next}", nextLabel)
      .replace("{minutes}", String(minutesLeft));
  } else {
    const tpl = getUI("countdownCurrentAndGeneric") ||
      "Şu an {current} vakti • Sonraki vakte {minutes} dk kaldı";
    el.textContent = tpl
      .replace("{current}", currentLabel)
      .replace("{minutes}", String(minutesLeft));
  }
}

function updateRamadanInlineCountdown(now) {
  const el = document.getElementById("ramadan-inline-text");
  if (!el || !lastIsRamadan || !lastTimings || !lastTimings.timings) return;

  const t = lastTimings.timings;
  const today = new Date();
  const imsakDate = parseTimingToDate(today, t.Imsak);
  const maghribDate = parseTimingToDate(today, t.Maghrib);

  const toMinutes = (ms) => Math.max(0, Math.ceil(ms / 60000));

  let parts = [];

  if (imsakDate) {
    const diffImsak = imsakDate - now;
    if (diffImsak > 0) {
      const minsImsak = toMinutes(diffImsak);
      const tplMinImsak =
        getUI("ramadanImsakInMinutes") || "İmsak vaktine {minutes} dakika kaldı";
      parts.push(tplMinImsak.replace("{minutes}", String(minsImsak)));
    } else {
      parts.push(getUI("ramadanImsakStarted") || "İmsak vakti girdi");
    }
  }

  if (maghribDate) {
    const diffIftar = maghribDate - now;
    if (diffIftar > 0) {
      const minsIftar = toMinutes(diffIftar);
      const tplMinIftar =
        getUI("ramadanIftarInMinutes") || "İftar vaktine {minutes} dakika kaldı";
      parts.push(tplMinIftar.replace("{minutes}", String(minsIftar)));
    } else {
      parts.push(getUI("ramadanIftarStarted") || "İftar vakti girdi");
    }
  }

  if (!parts.length) {
    const fallback =
      getUI("ramadanInlineNoData") ||
      "Ramazan geri sayımı için bugün uygun veri bulunamadı.";
    el.textContent = fallback;
  } else {
    el.textContent = parts.join(" • ");
  }
}
function parseTimingToDate(today, t) {
  if (!t) return null;
  const main = t.split(" ")[0]; // "05:34" gibi
  const parts = main.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    h,
    m,
    0,
    0
  );
}


function setupCountdown(timings) {
  clearCountdown();
  if (!timings) {
    updateCountdownDisplay(null, null, 0);
    return;
  }
  const keys = ["Imsak", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const today = new Date();
  const segments = [];
  keys.forEach((k) => {
    const d = parseTimingToDate(today, timings[k]);
    if (d) segments.push({ key: k, time: d });
  });
  segments.sort((a, b) => a.time - b.time);
  if (!segments.length) {
    updateCountdownDisplay(null, null, 0);
    return;
  }

  // Bildirim bayraklarını sıfırla
  notifImsak10Sent = false;
  notifIftar10Sent = false;

  
  function tick() {
    const now = new Date();
    let nextIndex = segments.findIndex((s) => s.time > now);
    let currentSegment = null;
    let nextSegment = null;
    let remainingMs = 0;

    if (nextIndex === -1) {
      // Günün son vaktinden sonra
      currentSegment = segments[segments.length - 1] || null;
      nextSegment = null;
      remainingMs = 0;
    } else if (nextIndex === 0) {
      // İlk vaktin öncesinde: ilk vakti "bulunulan" vakit olarak ele al
      currentSegment = segments[0];
      nextSegment = segments.length > 1 ? segments[1] : null;
      remainingMs = segments[0].time - now;
    } else {
      // İki vakit arasındayız
      currentSegment = segments[nextIndex - 1];
      nextSegment = segments[nextIndex] || null;
      remainingMs = segments[nextIndex].time - now;
    }

// Ramazan için bildirimler: imsak ve iftar
    if (
      notificationsEnabled && lastIsRamadan &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      lastIsRamadan &&
      lastTimings &&
      lastTimings.timings
    ) {
      const t = lastTimings.timings;
      const todayForNotif = new Date();
      const imsakDate = parseTimingToDate(todayForNotif, t.Imsak);
      const maghribDate = parseTimingToDate(todayForNotif, t.Maghrib);

      if (imsakDate) {
        const diffImsak = imsakDate - now;
        if (diffImsak <= 10 * 60 * 1000 && diffImsak > 0 && !notifImsak10Sent) {
          try {
            new Notification(getUI("notifImsakSoon") || "İmsak vaktine son 10 dakika kaldı");
          } catch (e) {}
          notifImsak10Sent = true;
        }
      }

      if (maghribDate) {
        const diffIftar = maghribDate - now;
        if (diffIftar <= 10 * 60 * 1000 && diffIftar > 0 && !notifIftar10Sent) {
          try {
            new Notification(getUI("notifIftarSoon") || "İftar vaktine son 10 dakika kaldı");
          } catch (e) {}
          notifIftar10Sent = true;
        }
      }
    }

    updateCountdownDisplay(currentSegment, nextSegment, remainingMs);
    updateRamadanCountdown();
    updateRamadanCountdown();
  }

  tick();
  countdownIntervalId = setInterval(tick, 1000);
}


// === Language loading ===


function detectLanguageFromNavigator() {
  const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
  if (nav.startsWith("tr")) return "tr";
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("ar")) return "ar";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("hi")) return "hi";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("ru")) return "ru";
  return "en";
}
async function loadLanguage(code) {
  let normalized = SUPPORTED_LANGS.includes(code) ? code : "en";
  try {
    const res = await fetch(`${normalized}.json`);
    if (!res.ok) throw new Error("Failed to load language file");
    currentLanguageData = await res.json();
    currentLanguageCode = normalized;
  } catch (err) {
    console.error("Language load error", err);
    if (normalized !== "en") {
      try {
        const res2 = await fetch("en.json");
        if (res2.ok) {
          currentLanguageData = await res2.json();
          currentLanguageCode = "en";
        }
      } catch (e2) {
        console.error("Fallback language load error", e2);
      }
    }
  }
  applyTranslations();
  // If we already have timings, re-render them in the new language
  if (lastTimings && lastTimings.timings) {
    renderPrayerList(lastTimings.timings, lastIsRamadan);
    updateInspirationFromKey("Imsak", lastIsRamadan);
  }
  // Re-render Ramadan table if it exists
  if (lastRamadanRows && lastRamadanRows.length > 0) {
    renderRamadanTable(lastRamadanRows);
  }
}

function getUI(key) {
  if (currentLanguageData && currentLanguageData.ui && currentLanguageData.ui[key]) {
    return currentLanguageData.ui[key];
  }
  return key;
}

function getLabelForPrayer(key) {
  if (
    currentLanguageData &&
    currentLanguageData.prayerLabels &&
    currentLanguageData.prayerLabels[key]
  ) {
    return currentLanguageData.prayerLabels[key];
  }
  return key;
}

function getPrayerTextsFor(key) {
  if (
    currentLanguageData &&
    currentLanguageData.prayerTexts &&
    currentLanguageData.prayerTexts[key] &&
    Array.isArray(currentLanguageData.prayerTexts[key])
  ) {
    return currentLanguageData.prayerTexts[key];
  }
  return [];
}

function getRamadanNotes() {
  if (
    currentLanguageData &&
    Array.isArray(currentLanguageData.ramadanNotes)
  ) {
    return currentLanguageData.ramadanNotes;
  }
  return [];
}

function getCalendarHeaders() {
  if (currentLanguageData && currentLanguageData.calendarHeaders) {
    return currentLanguageData.calendarHeaders;
  }
  return {
    gregorian: "Date",
    hijri: "Hijri",
    imsak: "Imsak",
    fajr: "Fajr",
    maghrib: "Maghrib",
    isha: "Isha"
  };
}

// === UI helpers ===

function applyTranslations() {
  const t = getUI;
  const titleEl = document.getElementById("app-title");
  if (titleEl) titleEl.textContent = t("title");
  const subEl = document.getElementById("app-subtitle");
  if (subEl) subEl.textContent = t("subtitle");

  const langLabel = document.getElementById("language-label");
  if (langLabel) langLabel.textContent = t("languageLabel") || "🌐 Dil";

  const ramadanTitle = document.getElementById("ramadan-countdown-title");
  if (ramadanTitle) ramadanTitle.textContent = t("ramadanCountdownTitle") || "Ramazan Geri Sayımı";

  const notifBtnText = document.getElementById("notif-btn-text");
  if (notifBtnText) notifBtnText.textContent = t("notifButton") || "Bildirimlere izin ver";


  const locTitle = document.getElementById("location-title");
  if (locTitle) locTitle.textContent = t("locationTitle");
  const locHelp = document.getElementById("location-help");
  if (locHelp) locHelp.textContent = t("locationHelp");

  const btnAutoText = document.getElementById("btn-use-auto-text");
  if (btnAutoText) btnAutoText.textContent = t("locationButton");

  const latLabel = document.getElementById("lat-label");
  if (latLabel) latLabel.textContent = t("latLabel");
  const lonLabel = document.getElementById("lon-label");
  if (lonLabel) lonLabel.textContent = t("lonLabel");

  const manualHelp = document.getElementById("manual-help");
  if (manualHelp) manualHelp.textContent = t("manualHelp");

  const manualBtnText = document.getElementById("btn-use-manual-text");
  if (manualBtnText) manualBtnText.textContent = t("manualButton");

  const nameLabel = document.getElementById("name-label");
  if (nameLabel) nameLabel.textContent = t("nameLabel");
  const nameInput = document.getElementById("name-input");
  if (nameInput) nameInput.placeholder = t("namePlaceholder");
  const nameHelp = document.getElementById("name-help");
  if (nameHelp) nameHelp.textContent = t("nameHelp");

  const statusEl = document.getElementById("status");
  if (statusEl && !lastCoords) {
    statusEl.textContent = t("statusWaiting");
  }

  const inspTitle = document.getElementById("insp-title");
  if (inspTitle) inspTitle.textContent = t("inspTitle");
  const inspHelp = document.getElementById("insp-help");
  if (inspHelp) inspHelp.textContent = t("inspHelp");
  const inspBtnText = document.getElementById("btn-refresh-insp-text");
  if (inspBtnText) inspBtnText.textContent = t("inspRefresh");

  const refreshTimesText = document.getElementById("refresh-times-text");
  if (refreshTimesText) refreshTimesText.textContent = t("refreshTimes");


    const currentTimeTitleEl = document.getElementById("current-time-title");
  if (currentTimeTitleEl) currentTimeTitleEl.textContent = t("currentTimeTitle");

  const countdownTitleEl = document.getElementById("countdown-title");
  if (countdownTitleEl) countdownTitleEl.textContent = t("countdownTitle");
  const countdownTextEl = document.getElementById("countdown-text");
  if (countdownTextEl && !lastTimings) {
    countdownTextEl.textContent = t("countdownNoData");
  }
  const ramadanInlineEl = document.getElementById("ramadan-inline-text");
  if (ramadanInlineEl && (!lastIsRamadan || !lastTimings)) {
    ramadanInlineEl.textContent = t("ramadanInlinePlaceholder") || ramadanInlineEl.textContent;
  }

  const ramadanCountdownTextEl = document.getElementById("ramadan-countdown-text");
  if (ramadanCountdownTextEl && (!lastIsRamadan || !lastTimings)) {
    ramadanCountdownTextEl.textContent = t("ramadanCountdownText") || ramadanCountdownTextEl.textContent;
  }

  const footerSource = document.getElementById("footer-source");
  if (footerSource) footerSource.textContent = t("footerSource");
  const footerNote = document.getElementById("footer-note");
  if (footerNote) footerNote.textContent = t("footerNote");

  const calTitle = document.getElementById("cal-title");
  if (calTitle) calTitle.textContent = t("calTitle");
  const calHelp = document.getElementById("cal-help");
  if (calHelp) calHelp.textContent = t("calHelp");
  const calYearLabel = document.getElementById("cal-year-label");
  if (calYearLabel) calYearLabel.textContent = t("calYearLabel");
  const calBtnText = document.getElementById("cal-btn-text");
  if (calBtnText) calBtnText.textContent = t("calBtnText");
}

function setStatus(messageKeyOrText, type, fromKey = true) {
  const el = document.getElementById("status");
  if (!el) return;
  const text = fromKey ? getUI(messageKeyOrText) : messageKeyOrText;
  el.textContent = text;
  el.classList.remove("info", "error", "success");
  if (type === "error") el.classList.add("error");
  else if (type === "success") el.classList.add("success");
  else el.classList.add("info");
}

function updateCoordsText(lat, lon, name) {
  const el = document.getElementById("coords-label");
  if (!el) return;
  const prefix = getUI("coordsPrefix");
  const roundedLat = typeof lat === "number" ? lat.toFixed(4) : lat;
  const roundedLon = typeof lon === "number" ? lon.toFixed(4) : lon;
  if (name && name.trim().length > 0) {
    el.textContent = `${prefix} ${name} (${roundedLat}, ${roundedLon})`;
  } else {
    el.textContent = `${prefix} ${roundedLat}, ${roundedLon}`;
  }
}

// === Prayer visuals metadata (language independent) ===

const prayerMeta = {
  Imsak: {
    emoji: "🌙",
    imageQuery: "mosque,night,stars"
  },
  Fajr: {
    emoji: "🌅",
    imageQuery: "mosque,dawn,sky"
  },
  Sunrise: {
    emoji: "🌤️",
    imageQuery: "mosque,sunrise,light"
  },
  Dhuhr: {
    emoji: "☀️",
    imageQuery: "mosque,daylight,blue-sky"
  },
  Asr: {
    emoji: "🌇",
    imageQuery: "mosque,afternoon,sun"
  },
  Maghrib: {
    emoji: "🌆",
    imageQuery: "mosque,sunset,evening"
  },
  Isha: {
    emoji: "🌌",
    imageQuery: "mosque,night,city-lights"
  }
};

// === Inspiration (ayah snippets) ===

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now - start +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

let inspirationOffset = 0;

function pickLocalizedText(key, dayIndex, isRamadan) {
  const texts = getPrayerTextsFor(key);
  const ramadanNotes = getRamadanNotes();
  const useRamadanPool = isRamadan && ramadanNotes.length > 0;
  let chosenText = "";

  if (useRamadanPool) {
    const idx = dayIndex % ramadanNotes.length;
    chosenText = ramadanNotes[idx];
  } else if (texts.length > 0) {
    const idx = dayIndex % texts.length;
    chosenText = texts[idx];
  }

  const visual = resolveInspirationVisual(key, isRamadan);

  return {
    text: chosenText,
    visual
  };
}

async function fetchDailyAyah(langCode) {
  try {
    const edition =
      langCode === "tr"
        ? "tr.diyanet"
        : langCode === "de"
        ? "de.aburida"
        : "en.sahih";
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/random/${edition}`
    );
    if (!res.ok) throw new Error("Ayah API error");
    const json = await res.json();
    if (json && json.data && json.data.text) {
      const meta = json.data;
      return (
        meta.text +
        " (" +
        meta.surah.englishName +
        " " +
        meta.numberInSurah +
        ")"
      );
    }
  } catch (e) {
    console.warn("Ayah API failed", e);
  }
  return null;
}


function updateInspirationFromKey(key, isRamadan, advance) {
  if (advance) {
    inspirationOffset++;
  }
  const idx = getDayOfYear() + inspirationOffset;
  const data = pickLocalizedText(key, idx, isRamadan);

  const visualEl = document.getElementById("insp-visual");
  const textEl = document.getElementById("insp-text");

  // Önce hızlı bir placeholder arka plan (senkron)
  if (visualEl) {
    if (data.visual) {
      visualEl.style.backgroundImage = data.visual;
    } else {
      visualEl.style.backgroundImage =
        "radial-gradient(circle at 0% 0%, #020617, #111827)";
    }
    // Ardından, asenkron olarak fotoğraf API'lerinden birini dene
    if (typeof loadInspirationImageForKey === "function") {
      loadInspirationImageForKey(key, isRamadan, visualEl);
    }
  }

  if (data.text && textEl) {
    textEl.textContent = data.text;
  } else {
    // Yedek: API'den rastgele bir ayet dene
    fetchDailyAyah(currentLanguageCode).then((t) => {
      if (t && textEl) {
        textEl.textContent = t;
      }
    });
  }
}

// === Prayer Times via AlAdhan ===


function isInTurkey(lat, lon) {
  return lat >= 35.8 && lat <= 42.3 && lon >= 25.5 && lon <= 45.0;
}

async function fetchPrayerTimes(lat, lon) {
  try {
    setStatus("statusLoadingTimes", "info", true);
    const baseUrl = "https://api.aladhan.com/v1/timings";
    const today = Math.floor(Date.now() / 1000);
    const inTurkey = isInTurkey(lat, lon);
    const method = inTurkey ? 13 : 3; // 13: Diyanet, 3: MWL (common global)
    const url = `${baseUrl}/${today}?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}&method=${method}&school=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json || json.code !== 200 || !json.data) {
      throw new Error("Unexpected response");
    }

    const data = json.data;
    const timings = data.timings;
    const dateInfo = data.date;
    const hijri = dateInfo && dateInfo.hijri;

    // Tarih
    const dateLineEl = document.getElementById("date-line");
    if (dateLineEl && dateInfo && dateInfo.readable) {
      dateLineEl.textContent = dateInfo.readable;
    }

    // Hicrî + Ramazan
    const hijriEl = document.getElementById("hijri-line");
    if (hijriEl) {
      hijriEl.textContent = "";
    }
    lastIsRamadan = false;

    if (hijri && hijriEl) {
      const day = hijri.day;
      const monthName = (hijri.month && (hijri.month.ar || hijri.month.en)) || "";
      const year = hijri.year;
      const isRamadan =
        hijri.month && (hijri.month.number === 9 || hijri.month.en === "Ramadan");
      lastIsRamadan = !!isRamadan;

      const baseText = `Hicri: ${day} ${monthName} ${year}`;
      if (isRamadan) {
        hijriEl.innerHTML = `${baseText} <span class="ramadan-badge">🌙 Ramazan</span>`;
      } else {
        hijriEl.textContent = baseText;
      }
    }

    lastTimings = { timings: timings };
    renderPrayerList(timings, lastIsRamadan);
    setupCountdown(timings);
    updateInspirationFromKey("Imsak", lastIsRamadan);

    setStatus("statusSuccessTimes", "success", true);
  } catch (err) {
    console.error(err);
    const prefix = getUI("statusErrorTimesPrefix");
    setStatus(prefix + (err && err.message ? err.message : ""), "error", false);
  }
}

function renderPrayerList(timings, isRamadan) {
  const listEl = document.getElementById("prayer-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const order = ["Imsak", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const baseIdx = getDayOfYear();

  order.forEach((key, offset) => {
    const li = document.createElement("li");
    li.className = "prayer-item";

    const header = document.createElement("div");
    header.className = "prayer-header";

    const nameDiv = document.createElement("div");
    nameDiv.className = "prayer-name";

    const meta = prayerMeta[key];
    if (meta && meta.emoji) {
      const e = document.createElement("span");
      e.className = "prayer-emoji";
      e.textContent = meta.emoji;
      nameDiv.appendChild(e);
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = getLabelForPrayer(key);
    nameDiv.appendChild(nameSpan);

    const timeSpan = document.createElement("div");
    timeSpan.className = "prayer-time";
    const raw = timings && timings[key];
    timeSpan.textContent = raw || "—";

    header.appendChild(nameDiv);
    header.appendChild(timeSpan);

    const note = document.createElement("p");
    note.className = "prayer-note";

    const idx = baseIdx + offset;
    const data = pickLocalizedText(key, idx, isRamadan);
    note.textContent = data.text || "";

    li.appendChild(header);
    li.appendChild(note);
    listEl.appendChild(li);
  });
}

// === Ramadan Calendar (Imsakiyah) ===

async function fetchRamadanCalendar(lat, lon, year) {
  try {
    const statusEl = document.getElementById("cal-status");
    if (statusEl) {
      statusEl.textContent = getUI("calStatusLoading");
    }

    const baseUrl = "https://api.aladhan.com/v1/calendar";
    const inTurkey = isInTurkey(lat, lon);
    const method = inTurkey ? 13 : 3;
    const allRows = [];

    for (let month = 1; month <= 12; month++) {
      const url = `${baseUrl}/${year}/${month}?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(
        lon
      )}&method=${method}&school=1`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("HTTP " + res.status + " (month " + month + ")");
      }
      const json = await res.json();
      if (!json || json.code !== 200 || !Array.isArray(json.data)) {
        throw new Error("Unexpected response for month " + month);
      }

      json.data.forEach((dayObj) => {
        const hijri = dayObj.date && dayObj.date.hijri;
        if (hijri && hijri.month && hijri.month.number === 9) {
          const g = dayObj.date.readable;
          const hDay = hijri.day;
          const hMonthName = (hijri.month.ar || hijri.month.en || "");
          const hYear = hijri.year;
          const hijriLabel = `${hDay} ${hMonthName} ${hYear}`;
          const t = dayObj.timings || {};
          allRows.push({
            gregorian: g,
            hijri: hijriLabel,
            imsak: (t.Imsak || "").split(" ")[0],
            fajr: (t.Fajr || "").split(" ")[0],
            maghrib: (t.Maghrib || "").split(" ")[0],
            isha: (t.Isha || "").split(" ")[0]
          });
        }
      });
    }

    lastRamadanRows = allRows.slice();
    if (allRows.length === 0) {
      if (statusEl) {
        statusEl.textContent = getUI("calStatusNoData");
      }
      renderRamadanTable([]);
      return;
    }

    if (statusEl) {
      statusEl.textContent = "";
    }
    renderRamadanTable(allRows);
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById("cal-status");
    if (statusEl) {
      const prefix = getUI("calStatusErrorPrefix");
      statusEl.textContent = prefix + (err && err.message ? err.message : "");
    }
  }
}

function renderRamadanTable(rows) {
  const container = document.getElementById("cal-table-container");
  if (!container) return;
  container.innerHTML = "";

  if (!rows || rows.length === 0) {
    return;
  }

  const headers = getCalendarHeaders();
  const table = document.createElement("table");
  table.className = "calendar-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["gregorian", "hijri", "imsak", "fajr", "maghrib", "isha"].forEach((key) => {
    const th = document.createElement("th");
    th.textContent = headers[key] || key;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    ["gregorian", "hijri", "imsak", "fajr", "maghrib", "isha"].forEach((key) => {
      const td = document.createElement("td");
      td.textContent = r[key] || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// === Location ===

function requestAutoLocation() {
  if (!navigator.geolocation) {
    setStatus("statusLocationUnsupported", "error", true);
    return;
  }

  setStatus("statusGettingLocation", "info", true);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      lastCoords = { lat, lon };
      updateCoordsText(lat, lon, null);
      saveLastCoords(lat, lon, null);
      fetchPrayerTimes(lat, lon);
    },
    (err) => {
      console.error(err);
      if (err && err.code === err.PERMISSION_DENIED) {
        setStatus("statusLocationDenied", "error", true);
      } else {
        setStatus("statusLocationError", "error", true);
      }
    }
  );
}

function useManualCoords() {
  const latInput = document.getElementById("lat-input");
  const lonInput = document.getElementById("lon-input");
  if (!latInput || !lonInput) return;

  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  if (isNaN(lat) || isNaN(lon)) {
    setStatus("statusInvalidCoords", "error", true);
    return;
  }
  lastCoords = { lat, lon };
  updateCoordsText(lat, lon, null);
  saveLastCoords(lat, lon, null);
  fetchPrayerTimes(lat, lon);
}

async function searchByName() {
  const input = document.getElementById("name-input");
  if (!input) return;
  const query = (input.value || "").trim();
  if (!query) {
    setStatus("statusInvalidName", "error", true);
    return;
  }

  try {
    setStatus(getUI("statusLoadingTimes"), "info", false);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "namaz-vakitleri-web/1.0 (personal use)"
      }
    });
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      setStatus("statusInvalidName", "error", true);
      return;
    }

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const displayName = item.display_name || query;

    if (isNaN(lat) || isNaN(lon)) {
      setStatus("statusInvalidName", "error", true);
      return;
    }

    lastCoords = { lat, lon };
    updateCoordsText(lat, lon, displayName);
    saveLastCoords(lat, lon, displayName);
    fetchPrayerTimes(lat, lon);
  } catch (err) {
    console.error(err);
    const prefix = getUI("statusErrorTimesPrefix");
    setStatus(prefix + (err && err.message ? err.message : ""), "error", false);
  }
}

function saveLastCoords(lat, lon, name) {
  try {
    const payload = { lat, lon, name: name || "" };
    localStorage.setItem("nv_last_coords", JSON.stringify(payload));
  } catch (e) {
    console.warn("Could not save coords", e);
  }

  // Kullanıcı konum seçtiğinde logla
  logUsageToServer({
    event: "location_set",
    lat,
    lon,
    label: name || ""
  });
}

function loadLastCoords() {
  try {
    const raw = localStorage.getItem("nv_last_coords");
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.lat === "number" &&
      typeof obj.lon === "number"
    ) {
      lastCoords = { lat: obj.lat, lon: obj.lon };
      updateCoordsText(obj.lat, obj.lon, obj.name || null);
      const nameInput = document.getElementById("name-input");
      if (nameInput && obj.name) {
        nameInput.value = obj.name;
      }
      fetchPrayerTimes(obj.lat, obj.lon);
    }
  } catch (e) {
    console.warn("Could not load saved coords", e);
  }
}

// === Events ===

function setupEventListeners() {
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      const val = langSelect.value;
      if (val === "auto") {
        const navLang = detectLanguageFromNavigator();
        loadLanguage(navLang);
      } else {
        loadLanguage(val);
      }
    });
  }

  const btnAuto = document.getElementById("btn-use-auto");
  if (btnAuto) {
    btnAuto.addEventListener("click", () => {
      requestAutoLocation();
    });
  }

  const btnManual = document.getElementById("btn-use-manual");
  if (btnManual) {
    btnManual.addEventListener("click", () => {
      useManualCoords();
    });
  }

  const btnName = document.getElementById("btn-search-name");
  if (btnName) {
    btnName.addEventListener("click", () => {
      searchByName();
    });
  }

  const nameInput = document.getElementById("name-input");
  if (nameInput) {
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchByName();
      }
    });
  }

  const btnRefresh = document.getElementById("btn-refresh-data");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      if (lastCoords) {
        fetchPrayerTimes(lastCoords.lat, lastCoords.lon);
      }
    });
  }

  const btnInsp = document.getElementById("btn-refresh-insp");
  if (btnInsp) {
    btnInsp.addEventListener("click", () => {
      updateInspirationFromKey("Imsak", lastIsRamadan, true);
    });
  }

  const btnRamadan = document.getElementById("btn-load-ramadan");
  if (btnRamadan) {
    btnRamadan.addEventListener("click", () => {
      if (!lastCoords) {
        const statusEl = document.getElementById("cal-status");
        if (statusEl) {
          statusEl.textContent = getUI("statusWaiting");
        }
        return;
      }
      const yearInput = document.getElementById("cal-year");
      let year = new Date().getFullYear();
      if (yearInput) {
        const parsed = parseInt(yearInput.value, 10);
        if (!isNaN(parsed)) {
          year = parsed;
        } else {
          yearInput.value = String(year);
        }
      }
      fetchRamadanCalendar(lastCoords.lat, lastCoords.lon, year);
    });
  }
}

// Auto refresh prayer times every 6 hours if a location is set
function setupAutoRefresh() {
  setInterval(() => {
    if (lastCoords) {
      fetchPrayerTimes(lastCoords.lat, lastCoords.lon);
    }
  }, 6 * 60 * 60 * 1000);
}

// === Init ===

document.addEventListener("DOMContentLoaded", () => {
  const navLang = detectLanguageFromNavigator();
  const selectEl = document.getElementById("language-select");
  if (selectEl) {
    selectEl.value = "auto";
  }
  loadLanguage(navLang).then(() => {
    // Set default year in Ramadan field
    const yearInput = document.getElementById("cal-year");
    if (yearInput) {
      yearInput.value = String(new Date().getFullYear());
    }
    setupEventListeners();
    loadLastCoords();
    if (!lastCoords) {
      // Tarayıcı konumunu otomatik iste (kullanıcı izin verirse)
      requestAutoLocation();
    }

    // Kullanıcı sayfayı açtığında bir kere log gönder
    logUsageToServer({ event: "page_open" });

    setupAutoRefresh();
  });
});;


// Refresh prayer times button
const btnRefreshTimes = document.getElementById("btn-refresh-times");
if (btnRefreshTimes) {
  btnRefreshTimes.addEventListener("click", () => {
    if (lastCoords) {
      fetchPrayerTimes(lastCoords.lat, lastCoords.lon, lastCoords.label);
    }
  });
}



// === Notification permission & button handling (FIXED) ===
const notifBtn = document.getElementById("btn-enable-notifications");
const notifText = document.getElementById("notif-btn-text");

function updateNotifUI(state) {
  if (!notifBtn || !notifText) return;
  if (state === "granted") {
    notifBtn.classList.add("active");
    notifText.textContent = "Bildirimler aktif";
  } else if (state === "denied") {
    notifText.textContent = "Bildirim izni reddedildi";
  } else {
    notifText.textContent = "Bildirimlere izin ver";
  }
}

if (typeof Notification !== "undefined") {
  console.log("[NOTIF] Initial permission:", Notification.permission);

  if (Notification.permission === "granted") {
    notificationsEnabled = true;
    updateNotifUI("granted");
  }

  if (notifBtn) {
    notifBtn.addEventListener("click", async () => {
      console.log("[NOTIF] Button clicked");
      try {
        const perm = await Notification.requestPermission();
        console.log("[NOTIF] Permission result:", perm);
        if (perm === "granted") {
          notificationsEnabled = true;
          updateNotifUI("granted");
        } else {
          updateNotifUI("denied");
        }
      } catch (e) {
        console.error("[NOTIF] Error requesting permission", e);
      }
    });
  }
} else {
  console.warn("[NOTIF] Notification API not supported in this browser");
}


function updateRamadanCountdown() {
  if (!lastIsRamadan || !lastTimings || !lastTimings.timings) return;

  const now = new Date();
  const t = lastTimings.timings;

  const imsakEl = document.getElementById("ramadan-imsak-count");
  const iftarEl = document.getElementById("ramadan-iftar-count");

  const imsakDate = parseTimingToDate(now, t.Imsak);
  const iftarDate = parseTimingToDate(now, t.Maghrib);

  const mins = (ms) => Math.max(0, Math.ceil(ms / 60000));

  if (imsakDate && imsakDate > now) {
    imsakEl.textContent = `İmsak vaktine ${mins(imsakDate - now)} dakika kaldı`;
  } else {
    imsakEl.textContent = `İmsak vakti girdi`;
  }

  if (iftarDate && iftarDate > now) {
    iftarEl.textContent = `İftar vaktine ${mins(iftarDate - now)} dakika kaldı`;
  } else {
    iftarEl.textContent = `İftar vakti girdi`;
  }
}

