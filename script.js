"use strict";

/* =====================================================================
   TYPEDEFS (JSDoc)
   These provide IDE autocomplete + type checking without a build step.
===================================================================== */

/**
 * @typedef {Object} Breed
 * @property {string} key
 * @property {string} nameHe
 * @property {string} nameEn
 * @property {string} apiName
 * @property {string} size
 * @property {1|2|3} sizeRank
 * @property {1|2|3|4} energy
 * @property {1|2|3} shedding
 * @property {1|2|3} experience
 * @property {number} lifespan
 * @property {string} description
 * @property {string} descriptionEn
 * @property {string} energyLabel
 * @property {string} energyLabelEn
 * @property {string} lifespanLabel
 * @property {string} lifespanLabelEn
 * @property {string} sheddingLabel
 * @property {string} sheddingLabelEn
 * @property {string} character
 * @property {string} characterEn
 * @property {string} suitableFor
 * @property {string} suitableForEn
 * @property {string} origin
 * @property {string} originEn
 * @property {string} weight
 * @property {string} weightEn
 * @property {number} exerciseHours
 * @property {1|2|3|4|5} trainingDifficulty
 * @property {boolean} goodWithCats
 * @property {boolean} goodWithKids
 */

/* =====================================================================
   CONSTANTS
===================================================================== */
const DEFAULT_DOG_IMAGE = "https://images.dog.ceo/breeds/retriever-golden/n02099601_7771.jpg";
const IMG_CACHE_KEY = "dogweb-image-cache-v2"; // bumped: stores list of urls
const IMG_CACHE_TTL = 24 * 60 * 60 * 1000;     // 24h
const IMG_CACHE_MAX_PER_BREED = 8;
// Wikipedia image cache: maps breed.key to either a string URL or null
// (meaning "we already looked and there's no usable image"). Caching the
// null result is intentional — it prevents us re-hitting Wikipedia on every
// page load for breeds that genuinely have no Commons photo.
const WIKI_CACHE_KEY = "dogweb-wiki-image-cache-v1";
const WIKI_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const WIKI_MAX_CONCURRENT = 3; // be polite to Wikipedia
const FAV_KEY = "dogweb-favorites";
const RECENT_KEY = "dogweb-recent-breeds";
const THEME_KEY = "dogweb-theme";
const LANG_KEY = "dogweb-lang";
const MAX_COMPARE = 4;
const PHOTOS_PER_BREED = 4;
const SITE_URL = "https://shenhaveliya.github.io/dog-world/";

/* =====================================================================
   SMALL UTILITIES
===================================================================== */

/** Escape a string for safe interpolation into HTML. */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Debounce a function so it fires at most once per `wait` ms. */
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Announce a string to screen readers via the live region. */
function announce(message) {
  const region = document.getElementById("liveAnnouncer");
  if (!region) return;
  region.textContent = "";
  setTimeout(() => { region.textContent = message; }, 50);
}

/**
 * Fallback for navigator.clipboard.writeText() on insecure contexts (file://, http://).
 * Uses a hidden, off-screen textarea + document.execCommand("copy").
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("execCommand copy failed"));
    } catch (e) { reject(e); }
  });
}

function pageUrlWithHash(hash) {
  const base = location.origin && location.origin !== "null"
    ? `${location.origin}${location.pathname}`
    : SITE_URL;
  return `${base}${location.search || ""}${hash || ""}`;
}

function trackEvent(name, props) {
  if (typeof window.plausible === "function") {
    window.plausible(name, props ? { props } : undefined);
  }
}

/* =====================================================================
   LANGUAGE
===================================================================== */
const urlLang = new URLSearchParams(location.search).get("lang");
let currentLang =
  (urlLang && I18N[urlLang]) ? urlLang :
  localStorage.getItem(LANG_KEY) || "he";
if (!I18N[currentLang]) currentLang = "he";

/**
 * Return a translated UI string. Pass extra args for parameterized strings
 * (i18n entries that are functions, like `resultsCounter(visible, total)`).
 */
function t(key, ...args) {
  const dict = I18N[currentLang];
  const v = dict ? dict[key] : undefined;
  if (typeof v === "function") return v(...args);
  if (typeof v === "string") return v;
  return key; // fallback so missing keys are visible
}

/** @param {Breed} b */ function bName(b) { return currentLang === "en" ? b.nameEn : b.nameHe; }
/** @param {Breed} b */ function bDesc(b) { return currentLang === "en" ? b.descriptionEn : b.description; }
/** @param {Breed} b */ function bEnergy(b) { return currentLang === "en" ? b.energyLabelEn : b.energyLabel; }
/** @param {Breed} b */ function bLifespan(b) { return currentLang === "en" ? b.lifespanLabelEn : b.lifespanLabel; }
/** @param {Breed} b */ function bShedding(b) { return currentLang === "en" ? b.sheddingLabelEn : b.sheddingLabel; }
/** @param {Breed} b */ function bCharacter(b) { return currentLang === "en" ? b.characterEn : b.character; }
/** @param {Breed} b */ function bSuitable(b) { return currentLang === "en" ? b.suitableForEn : b.suitableFor; }
/** @param {Breed} b */ function bOrigin(b) { return currentLang === "en" ? b.originEn : b.origin; }
/** @param {Breed} b */ function bWeight(b) { return currentLang === "en" ? b.weightEn : b.weight; }
/** @param {Breed} b */ function bPrice(b) { return currentLang === "en" ? b.priceLabelEn : b.priceLabel; }
/** @param {Breed} b */
function bSize(b) {
  const map = { 1: "sizeSmall", 2: "sizeMedium", 3: "sizeLarge" };
  return t(map[b.sizeRank]);
}
/** @param {Breed} b */
function bTraining(b) {
  const labels = I18N[currentLang].trainingLabels;
  return labels[b.trainingDifficulty] || "—";
}

/** Wikipedia URL for a breed. Always uses English Wikipedia (most complete). */
function wikiUrl(breed) {
  const slug = breed.nameEn.replace(/ /g, "_");
  return I18N[currentLang].wikiHost + encodeURIComponent(slug);
}

/* =====================================================================
   STAT TILES – the icon+label+value tiles used in card + detail info grid
===================================================================== */

/** Render a single tile. `kind` colors the icon (see CSS .stat[data-stat=...]).
 *  Set `full=true` to span the full grid row (used for long values). */
function statTile(icon, labelKey, value, full, kind) {
  return `
    <div class="stat${full ? " full" : ""}"${kind ? ` data-stat="${kind}"` : ""}>
      <span class="stat-icon" aria-hidden="true">${icon}</span>
      <span class="stat-text">
        <span class="stat-label">${escapeHTML(t(labelKey).replace(/[:：]\s*$/, ""))}</span>
        <span class="stat-value">${escapeHTML(String(value))}</span>
      </span>
    </div>
  `;
}

/** Tiles shown on every card (5 quick-glance facts + price). */
function cardStatTilesHTML(breed) {
  return [
    statTile("⚡", "infoEnergy", bEnergy(breed), false, "energy"),
    statTile("⏳", "infoLifespan", bLifespan(breed), false, "lifespan"),
    statTile("🌿", "infoShedding", bShedding(breed), false, "shedding"),
    statTile("💰", "infoPrice", bPrice(breed), false, "price"),
    statTile("🧠", "infoCharacter", bCharacter(breed), true, "character"),
    statTile("🏠", "infoSuitable", bSuitable(breed), true, "suitable"),
  ].join("");
}

/** Expanded set of tiles shown in the detail modal (everything we know). */
function detailStatTilesHTML(breed) {
  const dict = I18N[currentLang];
  return [
    statTile("⚡", "infoEnergy", bEnergy(breed), false, "energy"),
    statTile("⏳", "infoLifespan", bLifespan(breed), false, "lifespan"),
    statTile("🌿", "infoShedding", bShedding(breed), false, "shedding"),
    statTile("🌍", "infoOrigin", bOrigin(breed), false, "origin"),
    statTile("⚖️", "infoWeight", bWeight(breed), false, "weight"),
    statTile("💰", "infoPrice", bPrice(breed), false, "price"),
    statTile("🏃", "infoExercise", t("exerciseValue", breed.exerciseHours), false, "exercise"),
    statTile("🎓", "infoTraining", bTraining(breed), false, "training"),
    statTile("🐱", "infoCats", breed.goodWithCats ? dict.yes : dict.catsBad, false, "cats"),
    statTile("👶", "infoKids", breed.goodWithKids ? dict.yes : dict.kidsBad, false, "kids"),
    statTile("🧠", "infoCharacter", bCharacter(breed), true, "character"),
    statTile("🏠", "infoSuitable", bSuitable(breed), true, "suitable"),
  ].join("");
}

/* =====================================================================
   DOM REFERENCES (queried once at startup)
===================================================================== */
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");
const cardsContainer = document.getElementById("cardsContainer");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const emptyMessage = document.getElementById("emptyMessage");
const resultsCounter = document.getElementById("resultsCounter");
const sortSelect = document.getElementById("sortSelect");
const favOnlyBtn = document.getElementById("favOnlyBtn");
const advancedToggle = document.getElementById("advancedToggle");
const advancedFilters = document.getElementById("advancedFilters");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const loadMoreEl = document.getElementById("loadMore");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadMoreRemainingEl = document.getElementById("loadMoreRemaining");
const compareBar = document.getElementById("compareBar");
const compareBarText = document.getElementById("compareBarText");
const compareOpenBtn = document.getElementById("compareOpenBtn");
const compareClearBtn = document.getElementById("compareClearBtn");
const compareModal = document.getElementById("compareModal");
const compareModalContent = document.getElementById("compareModalContent");
const detailModal = document.getElementById("detailModal");
const detailModalContent = document.getElementById("detailModalContent");
const quizBtn = document.getElementById("quizBtn");
const quizModal = document.getElementById("quizModal");
const quizBody = document.getElementById("quizBody");
const quizDotsEl = document.getElementById("quizDots");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const heroStatsEl = document.getElementById("heroStats");
const featuredBanner = document.getElementById("featuredBanner");
const featuredImg = document.getElementById("featuredImg");
const featuredLabelEl = document.getElementById("featuredLabel");
const featuredNameEl = document.getElementById("featuredName");
const featuredDescEl = document.getElementById("featuredDesc");
const featuredOpenBtn = document.getElementById("featuredOpenBtn");
const filtersEl = document.querySelector(".filters");
const emptyTitleEl = document.getElementById("emptyTitle");
const emptyTextEl = document.getElementById("emptyText");
const filterChipsEl = document.getElementById("filterChips");
const favoritesHeadingEl = document.getElementById("favoritesHeading");
const mobileNavEl = document.getElementById("mobileNav");
const densityToggleBtn = document.getElementById("densityToggle");
const viewToggleEls = document.querySelectorAll(".view-btn");
const quickPeekEl = document.getElementById("quickPeek");
const mobileFilterOpenBtn = document.getElementById("mobileFilterOpen");
const mobileFilterCloseBtn = document.getElementById("mobileFilterClose");
const filterSheetOverlay = document.getElementById("filterSheetOverlay");
const installAppBtn = document.getElementById("installAppBtn");
const recentBreedsEl = document.getElementById("recentBreeds");
const recentBreedsListEl = document.getElementById("recentBreedsList");
const recentClearBtn = document.getElementById("recentClearBtn");

let prefersReducedMotion = false;
try {
  prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
} catch (e) { /* ignore */ }

/* =====================================================================
   THEME (light / dark) – persisted in localStorage
===================================================================== */

/** Apply a theme and update the toggle button (uses current language). */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.setAttribute("title", theme === "dark" ? t("themeTitleLight") : t("themeTitleDark"));
  themeToggle.setAttribute("aria-label", theme === "dark" ? t("themeAriaToLight") : t("themeAriaToDark"));
}

const initialTheme =
  localStorage.getItem(THEME_KEY) ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  announce(t(next === "dark" ? "themeAnnouncedDark" : "themeAnnouncedLight"));
});

/* =====================================================================
   IMAGE CACHE (localStorage with TTL, multi-URL per breed)

   Storage shape:
     { [apiName]: { urls: string[], t: number } }
   Older v1 entries with `url` are migrated transparently on read.
===================================================================== */

function readCache() {
  try {
    const raw = localStorage.getItem(IMG_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) { return {}; }
}

function writeCache(cache) {
  try { localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* quota */ }
}

/** Return all fresh cached image URLs for a breed (newest first). */
function getCachedImages(breedApi) {
  const cache = readCache();
  const entry = cache[breedApi];
  if (!entry) return [];
  if (Date.now() - entry.t > IMG_CACHE_TTL) return [];
  if (Array.isArray(entry.urls)) return entry.urls;
  if (typeof entry.url === "string") return [entry.url]; // legacy v1
  return [];
}

/** Return one cached URL (preferring the most recent), or null. */
function getCachedImage(breedApi) {
  const list = getCachedImages(breedApi);
  return list.length ? list[0] : null;
}

/** Append a single URL to the cache, deduped, capped at IMG_CACHE_MAX_PER_BREED. */
function pushCachedImage(breedApi, url) {
  if (!url) return;
  const cache = readCache();
  const existing = (cache[breedApi] && Array.isArray(cache[breedApi].urls))
    ? cache[breedApi].urls
    : (cache[breedApi] && cache[breedApi].url ? [cache[breedApi].url] : []);
  const next = [url, ...existing.filter((u) => u !== url)].slice(0, IMG_CACHE_MAX_PER_BREED);
  cache[breedApi] = { urls: next, t: Date.now() };
  writeCache(cache);
}

/** Replace the entire URL list for a breed (e.g. after fetching N photos). */
function setCachedImages(breedApi, urls) {
  if (!Array.isArray(urls) || !urls.length) return;
  const cache = readCache();
  cache[breedApi] = { urls: urls.slice(0, IMG_CACHE_MAX_PER_BREED), t: Date.now() };
  writeCache(cache);
}

/* ---------------------------------------------------------------------
   Wikipedia image cache — used as a fallback source of photos for breeds
   that aren't in dog.ceo's catalog. Stores either a string URL or `null`
   ("we looked and there is no image"). Both are valid cache hits.
--------------------------------------------------------------------- */
function readWikiCache() {
  try {
    const raw = localStorage.getItem(WIKI_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) { return {}; }
}
function writeWikiCache(cache) {
  try { localStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* quota */ }
}
const _wikiCache = readWikiCache();

/* Seed the cache with the verified URL map shipped in `wiki-images.js`.
 * This guarantees every breed without dog.ceo coverage paints with the
 * correct Wikipedia photo on the very first frame — no network call, no
 * race condition. Overrides any stale cache entries from earlier visits. */
if (typeof BREED_WIKI_IMAGES !== "undefined") {
  for (const key in BREED_WIKI_IMAGES) {
    const entry = BREED_WIKI_IMAGES[key];
    if (entry && entry.src) {
      _wikiCache[key] = { url: entry.src, t: Date.now(), verified: true };
    }
  }
  writeWikiCache(_wikiCache);
}

// Negative cache entries ("we looked and Wikipedia had nothing") expire
// much faster than positive ones so a transient network blip doesn't
// pin a breed as image-less for a whole month.
const WIKI_NEG_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * @param {string} breedKey
 * @returns {string|null|undefined}
 *   - string URL if Wikipedia has an image for this breed
 *   - null if we've already tried and there's no image
 *   - undefined if we haven't tried yet
 */
function getCachedWikiImage(breedKey) {
  const entry = _wikiCache[breedKey];
  if (!entry) return undefined;
  const ttl = entry.url == null ? WIKI_NEG_CACHE_TTL : WIKI_CACHE_TTL;
  if (Date.now() - entry.t > ttl) return undefined; // expired
  return entry.url == null ? null : entry.url;
}
function setCachedWikiImage(breedKey, urlOrNull) {
  // Don't let a fresh failed lookup wipe out a known-verified URL — keep
  // the verified shipped image instead.
  const existing = _wikiCache[breedKey];
  if (urlOrNull == null && existing && existing.verified && existing.url) return;
  _wikiCache[breedKey] = { url: urlOrNull, t: Date.now() };
  writeWikiCache(_wikiCache);
}

/**
 * Try Wikipedia's REST summary API for a breed photo. The summary endpoint
 * is CORS-enabled, returns a stable Commons thumbnail URL when available
 * (`thumbnail.source`), and follows redirects automatically. We try a few
 * disambiguation-friendly title variants in order, returning the first hit.
 *
 * Resolves to a URL string on success, or null when none of the title
 * variants yields a non-disambiguation page with an image.
 */
async function fetchBreedWikiImage(breed) {
  // Fast path: a breed shipped in BREED_WIKI_IMAGES already has a
  // verified URL — no need to hit the network at all.
  if (typeof BREED_WIKI_IMAGES !== "undefined" && BREED_WIKI_IMAGES[breed.key]) {
    return BREED_WIKI_IMAGES[breed.key].src;
  }
  const base = "https://en.wikipedia.org/api/rest_v1/page/summary/";
  // Order matters: the most specific title goes first to avoid hitting a
  // generic disambiguation page (e.g. "Pointer" → disambiguation, but
  // "Pointer (dog breed)" → the actual breed article).
  const candidates = [
    `${breed.nameEn} (dog breed)`,
    `${breed.nameEn} (dog)`,
    breed.nameEn,
  ];
  for (const title of candidates) {
    const url = base + encodeURIComponent(title.replace(/ /g, "_")) + "?redirect=true";
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || data.type === "disambiguation") continue;
      const src = (data.thumbnail && data.thumbnail.source) ||
                  (data.originalimage && data.originalimage.source);
      if (src) return src;
    } catch (e) { /* try next candidate */ }
  }
  return null;
}

/* =====================================================================
   STATE
===================================================================== */
let cards = [];
let originalOrder = [];
let favorites = [];
try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { favorites = []; }

const isFavorite = (breed) => favorites.includes(breed);
const persistFavorites = () => localStorage.setItem(FAV_KEY, JSON.stringify(favorites));

function readRecentBreeds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((key) => breedByKey(key)).slice(0, 8) : [];
  } catch (e) { return []; }
}

function writeRecentBreeds(keys) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(keys.slice(0, 8))); } catch (e) { /* ignore */ }
}

function addRecentBreed(key) {
  if (!key) return;
  const next = [key, ...readRecentBreeds().filter((k) => k !== key)].slice(0, 8);
  writeRecentBreeds(next);
  renderRecentBreeds();
}

function renderRecentBreeds() {
  if (!recentBreedsEl || !recentBreedsListEl) return;
  const keys = readRecentBreeds();
  recentBreedsEl.hidden = keys.length === 0;
  recentBreedsListEl.innerHTML = keys.map((key) => {
    const breed = breedByKey(key);
    if (!breed) return "";
    const name = bName(breed);
    const thumb = `<img data-breed-key="${escapeHTML(key)}" alt="${escapeHTML(name)}" loading="lazy">`;
    return `<button type="button" class="recent-breed" data-breed-key="${escapeHTML(key)}">${thumb}<span>${escapeHTML(name)}</span></button>`;
  }).join("");
  recentBreedsListEl.querySelectorAll(".recent-breed img").forEach((img) => {
    const breed = breedByKey(img.dataset.breedKey);
    if (breed) hydrateBreedImageInto(img, breed, () => swapInlineThumbToInitial(img, breed, "recent-initial"));
  });
}

const selectedSizes = new Set();
const activeAttrs = new Set();
let favOnly = false;
let currentSort = "default";
let compareList = [];
let compareUrlSyncReady = false;

/* ----- Pagination -----------------------------------------------------
   The grid is virtually paged: only the first `visiblePageCount` cards
   that pass the active filters are actually shown. A sentinel below the
   grid lets the user reveal another page on demand (button click or by
   scrolling it into view). This keeps the initial DOM short and the
   page from running on for hundreds of cards. */
const PAGE_SIZE = 24;
let visiblePageCount = PAGE_SIZE;

/* =====================================================================
   CARD RENDERING (data-driven from BREEDS, language-aware)
===================================================================== */

/** True if this breed has a photo source we can actually load:
 *  either a dog.ceo apiName, or a Wikipedia thumbnail we've already
 *  resolved on a previous visit (positive cache entry). */
function hasBreedImage(breed) {
  if (!breed) return false;
  if (breed.apiName) return true;
  return typeof getCachedWikiImage(breed.key) === "string";
}

/** First letter of the localized breed name — used as a visual stand-in
 *  when no photo is available. */
function breedInitial(breed) {
  const name = bName(breed) || "";
  // Grab the first non-space character so the initial reads sensibly in both
  // Hebrew and English. Falls back to "•" for safety on empty names.
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "•";
}

/**
 * Build a single card's HTML.
 * The card itself is a plain <article> (NOT role="button") so that the
 * action buttons inside (fav, compare, refresh, "More details") are
 * properly announced as interactive by screen readers. Mouse users can
 * still click anywhere on the card for the "open details" convenience.
 * @param {Breed} breed
 */
function renderCard(breed) {
  const name = bName(breed);
  const withImage = hasBreedImage(breed);
  // Three image paths:
  //   - dog.ceo (breed.apiName)         → data-breed-api, refresh button shown
  //   - Wikipedia (cached URL)          → data-wiki-image, no refresh (Wikipedia
  //                                       returns one canonical photo per breed)
  //   - no source known                 → placeholder block with initial letter
  const wikiUrl = (!breed.apiName && withImage) ? getCachedWikiImage(breed.key) : null;
  let imageBlock;
  if (breed.apiName) {
    imageBlock = `
      <div class="dog-image-wrapper">
        <img class="dog-image" data-breed-api="${escapeHTML(breed.apiName)}" alt="${escapeHTML(name)}" loading="lazy" />
        <span class="glow-layer" aria-hidden="true"></span>
        <div class="image-actions">
          <button class="image-action-btn fav-btn" type="button" aria-label="${escapeHTML(t("favBtnAriaAdd", name))}" aria-pressed="false">🤍</button>
          <button class="image-action-btn compare-btn" type="button" aria-label="${escapeHTML(t("cmpBtnAriaAdd", name))}" aria-pressed="false">📋</button>
          <button class="image-action-btn refresh-photo" type="button" aria-label="${escapeHTML(t("refreshAria", name))}">🔄</button>
        </div>
      </div>`;
  } else if (wikiUrl) {
    imageBlock = `
      <div class="dog-image-wrapper wiki-image">
        <img class="dog-image" data-wiki-image="${escapeHTML(wikiUrl)}" alt="${escapeHTML(name)}" loading="lazy" />
        <span class="glow-layer" aria-hidden="true"></span>
        <div class="image-actions">
          <button class="image-action-btn fav-btn" type="button" aria-label="${escapeHTML(t("favBtnAriaAdd", name))}" aria-pressed="false">🤍</button>
          <button class="image-action-btn compare-btn" type="button" aria-label="${escapeHTML(t("cmpBtnAriaAdd", name))}" aria-pressed="false">📋</button>
        </div>
      </div>`;
  } else {
    imageBlock = `
      <div class="dog-image-wrapper no-image" role="img" aria-label="${escapeHTML(t("noPhotoLabel"))}">
        <span class="no-image-initial" aria-hidden="true">${escapeHTML(breedInitial(breed))}</span>
        <span class="no-image-label" aria-hidden="true">${escapeHTML(t("noPhotoShort"))}</span>
        <div class="image-actions image-actions-no-image">
          <button class="image-action-btn fav-btn" type="button" aria-label="${escapeHTML(t("favBtnAriaAdd", name))}" aria-pressed="false">🤍</button>
          <button class="image-action-btn compare-btn" type="button" aria-label="${escapeHTML(t("cmpBtnAriaAdd", name))}" aria-pressed="false">📋</button>
        </div>
      </div>`;
  }
  return `
    <article class="card${withImage ? "" : " card-no-image"}"
             data-breed="${escapeHTML(breed.key)}"
             data-name-he="${escapeHTML(breed.nameHe.toLowerCase())}"
             data-name-en="${escapeHTML(breed.nameEn.toLowerCase())}"
             data-search-he="${escapeHTML((breed.description + " " + breed.character + " " + breed.suitableFor + " " + breed.origin).toLowerCase())}"
             data-search-en="${escapeHTML((breed.descriptionEn + " " + breed.characterEn + " " + breed.suitableForEn + " " + breed.originEn).toLowerCase())}"
             data-size-rank="${breed.sizeRank}"
             data-energy="${breed.energy}"
             data-shedding="${breed.shedding}"
             data-experience="${breed.experience}"
             data-lifespan="${breed.lifespan}"
             data-price-min="${breed.priceMin}"
             data-price-avg="${Math.round((breed.priceMin + breed.priceMax) / 2)}"
             data-exercise-hours="${breed.exerciseHours}"
             data-good-with-cats="${breed.goodWithCats}"
             data-good-with-kids="${breed.goodWithKids}">${imageBlock}
      <h2>${escapeHTML(name)}</h2>
      <span class="size">${escapeHTML(t("sizeBadge", bSize(breed)))}</span>
      <p class="description">${escapeHTML(bDesc(breed))}</p>
      <div class="info">${cardStatTilesHTML(breed)}</div>
      <button class="card-open-btn" type="button" aria-label="${escapeHTML(t("cardOpenLabel", name))}">
        ${escapeHTML(t("cardOpenBtn"))} →
      </button>
    </article>
  `;
}

/** Render every breed in BREEDS into the grid, then re-wire all card events. */
function renderAllCards() {
  cardsContainer.innerHTML = BREEDS.map(renderCard).join("");
  cards = Array.from(cardsContainer.querySelectorAll(".card"));
  originalOrder = cards.slice();
  wireUpCards();
  loadAllImages();
  // Then try Wikipedia for any breeds left without a photo. This is fully
  // async / lazy, so it doesn't block the initial paint.
  loadWikipediaFallbacks();
}

function cardForBreed(key) { return cards.find((c) => c.dataset.breed === key); }
function breedByKey(key) { return BREEDS.find((b) => b.key === key); }

/* =====================================================================
   IMAGE LOADING – lazy, with cache + manual refresh
===================================================================== */

function markImageLoaded(image) {
  image.classList.add("loaded");
  const wrapper = image.closest(".dog-image-wrapper");
  if (wrapper) wrapper.classList.add("loaded");
  const card = image.closest(".card");
  if (card && !_accentSampled.has(card.dataset.breed)) {
    // Sample this card's accent now that the image is decoded.
    requestAnimationFrame(() => sampleAccentForCard(card));
  }
}

/**
 * Best image URL we can show *right now* for a breed, without a network call.
 * Tries (in order): dog.ceo localStorage cache → any already-loaded card
 * image → Wikipedia cache → "". Returns "" when no photo source is known.
 */
function bestKnownImageFor(breed) {
  if (!breed) return "";
  // dog.ceo-backed breeds prefer the dog.ceo image.
  if (breed.apiName) {
    const cached = getCachedImage(breed.apiName);
    if (cached) return cached;
    const card = cardForBreed(breed.key);
    if (card) {
      const imgEl = card.querySelector(".dog-image");
      if (imgEl) {
        const s = imgEl.src;
        if (s && /^https?:/.test(s)) return s;
      }
    }
    return DEFAULT_DOG_IMAGE;
  }
  // Otherwise fall back to a Wikipedia thumbnail if we have one cached.
  const wiki = getCachedWikiImage(breed.key);
  if (typeof wiki === "string") return wiki;
  // Even if we haven't fetched yet, the card may already have swapped in
  // a wiki image — grab whatever it's showing right now.
  const card = cardForBreed(breed.key);
  if (card) {
    const imgEl = card.querySelector(".dog-image");
    if (imgEl) {
      const s = imgEl.src;
      if (s && /^https?:/.test(s)) return s;
    }
  }
  return "";
}

/**
 * Set an <img>'s src and arrange for `markImageLoaded` to fire once it loads.
 * Centralizes the "set src + handle error fallback + classList toggle" dance.
 */
function hydrateImage(img, url) {
  if (!img) return;
  if (!url) url = DEFAULT_DOG_IMAGE;
  if (img.src === url) {
    if (img.complete && img.naturalWidth > 0) markImageLoaded(img);
    return;
  }
  // Enable canvas sampling for image-derived accent colors. Must be set
  // BEFORE src or browsers won't honor the CORS request.
  if (!img.crossOrigin) img.crossOrigin = "anonymous";
  img.src = url;
}

/** Load a single image from cache or the API. Pass `force=true` to bypass cache.
 *  Three sources are supported:
 *    1. data-breed-api → dog.ceo random photo endpoint (refreshable)
 *    2. data-wiki-image → static Wikipedia Commons thumbnail (hydrated directly)
 *    3. neither → no-op (the breed has no known photo source) */
function loadOneImage(image, force) {
  if (!image) return;
  const wikiUrl = image.dataset.wikiImage;
  if (wikiUrl) { hydrateImage(image, wikiUrl); return; }
  const breedApi = image.dataset.breedApi;
  if (!breedApi) return;
  if (!force) {
    const cached = getCachedImage(breedApi);
    if (cached) { hydrateImage(image, cached); return; }
  }
  fetch(`https://dog.ceo/api/breed/${breedApi}/images/random`)
    .then((r) => r.json())
    .then((data) => {
      if (data.status === "success" && data.message) {
        hydrateImage(image, data.message);
        pushCachedImage(breedApi, data.message);
      } else {
        hydrateImage(image, DEFAULT_DOG_IMAGE);
      }
    })
    .catch(() => { hydrateImage(image, DEFAULT_DOG_IMAGE); });
}

/**
 * Hydrate any breed-photo `<img>` with the best available source.
 * Resolution order:
 *   1. dog.ceo cached URL (if breed.apiName is set)
 *   2. dog.ceo API random photo
 *   3. cached Wikipedia thumbnail
 *   4. fresh Wikipedia fetch
 * If every source fails, `onMissing(img, breed)` is invoked so the caller
 * can swap the <img> for a no-image placeholder (UI's choice).
 *
 * Used by the quiz podium and the compare modal — places where a single
 * image is shown for a breed that may or may not have a photo source.
 */
function hydrateBreedImageInto(img, breed, onMissing) {
  if (!img || !breed) return;
  const missing = () => { if (onMissing) onMissing(img, breed); };

  if (breed.apiName) {
    const cached = getCachedImage(breed.apiName);
    if (cached) { hydrateImage(img, cached); return; }
    fetch(`https://dog.ceo/api/breed/${breed.apiName}/images/random`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success" && data.message) {
          hydrateImage(img, data.message);
          pushCachedImage(breed.apiName, data.message);
        } else {
          missing();
        }
      })
      .catch(missing);
    return;
  }

  // No dog.ceo source — try Wikipedia next.
  const wikiCached = getCachedWikiImage(breed.key);
  if (typeof wikiCached === "string") { hydrateImage(img, wikiCached); return; }
  if (wikiCached === null) { missing(); return; }
  // Never tried — fetch now.
  fetchBreedWikiImage(breed).then((url) => {
    setCachedWikiImage(breed.key, url || null);
    if (url) hydrateImage(img, url);
    else missing();
  });
}

/** Replace a quiz-podium <img> with the no-image placeholder div (same
 *  classes used at initial-render time so CSS keeps the frame sized). */
function swapPodiumImgToPlaceholder(img, breed) {
  if (!img || !img.parentNode) return;
  const div = document.createElement("div");
  div.className = "podium-img podium-img-no-image";
  div.setAttribute("aria-hidden", "true");
  div.innerHTML = `<span class="no-image-initial">${escapeHTML(breedInitial(breed))}</span>`;
  img.replaceWith(div);
}

/** Replace a compare-modal <img> with the no-image placeholder div. */
function swapCompareImgToPlaceholder(img, breed) {
  if (!img || !img.parentNode) return;
  const div = document.createElement("div");
  div.className = "compare-img compare-img-no-image";
  div.setAttribute("aria-hidden", "true");
  div.innerHTML =
    `<span class="no-image-initial">${escapeHTML(breedInitial(breed))}</span>` +
    `<span class="no-image-label">${escapeHTML(t("noPhotoShort"))}</span>`;
  img.replaceWith(div);
}

/** Turn a compare-bar avatar (`<span class="compare-avatar"><img/></span>`)
 *  into an initial-letter avatar when its image source can't be resolved. */
function swapAvatarToInitial(avatar, breed) {
  if (!avatar) return;
  avatar.classList.add("compare-avatar-no-image");
  avatar.innerHTML = `<span class="no-image-initial">${escapeHTML(breedInitial(breed))}</span>`;
  avatar.setAttribute("aria-label", bName(breed));
}

function swapInlineThumbToInitial(img, breed, className) {
  if (!img || !img.parentNode) return;
  const span = document.createElement("span");
  span.className = className;
  span.setAttribute("aria-hidden", "true");
  span.textContent = breedInitial(breed);
  img.replaceWith(span);
}

/* Single, persistent IntersectionObserver shared across re-renders.
   Created lazily on first use. */
let imageObserver = null;
function getImageObserver() {
  if (imageObserver || !("IntersectionObserver" in window)) return imageObserver;
  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadOneImage(entry.target);
        imageObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "300px" });
  return imageObserver;
}

/** Load images for the freshly-rendered cards. First 6 eagerly, rest lazily. */
function loadAllImages() {
  // Re-rendering replaces every <img>; release any references the observer
  // was holding to the previous (now-detached) images so they can be GC'd.
  if (imageObserver) imageObserver.disconnect();

  const allImages = Array.from(cardsContainer.querySelectorAll(".dog-image"));
  allImages.slice(0, 6).forEach((img) => loadOneImage(img));
  const obs = getImageObserver();
  if (obs) {
    allImages.slice(6).forEach((img) => obs.observe(img));
  } else {
    allImages.slice(6).forEach((img) => loadOneImage(img));
  }
}

/* =====================================================================
   WIKIPEDIA FALLBACK IMAGES
   For breeds whose `apiName` is empty (i.e. not in dog.ceo's catalog) we
   try Wikipedia's REST summary endpoint, which returns a stable Commons
   thumbnail URL when one exists. Lookups are throttled, cached
   permanently (positive AND negative results), and only kicked off
   lazily as the user scrolls so the initial render stays fast.
===================================================================== */
let _wikiInFlight = 0;
const _wikiQueue = [];
function _drainWikiQueue() {
  while (_wikiInFlight < WIKI_MAX_CONCURRENT && _wikiQueue.length) {
    const task = _wikiQueue.shift();
    _wikiInFlight++;
    task().finally(() => {
      _wikiInFlight--;
      _drainWikiQueue();
    });
  }
}
function _enqueueWikiTask(taskFn) {
  _wikiQueue.push(taskFn);
  _drainWikiQueue();
}

let _wikiObserver = null;

/** Resolve a Wikipedia image for one breed and, on success, upgrade its
 *  *current* placeholder card (which may differ from the one that was
 *  observed, e.g. after a language toggle re-rendered the grid). */
function _wikiFetchAndUpgrade(breed) {
  return fetchBreedWikiImage(breed).then((url) => {
    setCachedWikiImage(breed.key, url || null);
    if (!url) return;
    const currentCard = cardForBreed(breed.key);
    if (currentCard && currentCard.classList.contains("card-no-image")) {
      upgradeCardToWikiImage(currentCard, breed, url);
    }
  });
}

function getWikiObserver() {
  if (_wikiObserver || !("IntersectionObserver" in window)) return _wikiObserver;
  _wikiObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      _wikiObserver.unobserve(entry.target);
      const card = entry.target;
      const breed = breedByKey(card.dataset.breed);
      if (!breed) return;
      _enqueueWikiTask(() => _wikiFetchAndUpgrade(breed));
    });
  }, { rootMargin: "300px" });
  return _wikiObserver;
}

/** Kick off Wikipedia lookups for every currently-rendered no-image card.
 *  Cards that already have a cached result are handled synchronously;
 *  the rest are observed and fetched lazily as they enter the viewport. */
function loadWikipediaFallbacks() {
  if (_wikiObserver) _wikiObserver.disconnect();
  const placeholderCards = Array.from(cardsContainer.querySelectorAll(".card.card-no-image"));
  const obs = getWikiObserver();
  placeholderCards.forEach((card) => {
    const breed = breedByKey(card.dataset.breed);
    if (!breed) return;
    const cached = getCachedWikiImage(breed.key);
    if (typeof cached === "string") {
      // We already know a working URL — swap in immediately, no fetch needed.
      upgradeCardToWikiImage(card, breed, cached);
      return;
    }
    if (cached === null) return; // we tried before; there's no Wikipedia image
    if (obs) obs.observe(card);
    else _enqueueWikiTask(() => _wikiFetchAndUpgrade(breed));
  });
}

/** Swap a no-image placeholder card into a real image-bearing card,
 *  using a freshly-resolved Wikipedia thumbnail URL. */
function upgradeCardToWikiImage(card, breed, imageUrl) {
  if (!card || !card.parentNode) return;
  if (!card.classList.contains("card-no-image")) return; // already upgraded
  // Re-render the card from scratch (renderCard now sees a cached wiki URL
  // for this breed, so it'll produce an image-bearing card). Then swap it
  // into the DOM in place of the old placeholder card, and refresh the
  // module-level `cards` / `originalOrder` references so the rest of the
  // code (filters, sort, etc.) keeps working with the new node.
  const tmp = document.createElement("div");
  tmp.innerHTML = renderCard(breed).trim();
  const newCard = tmp.firstElementChild;
  if (!newCard) return;
  card.replaceWith(newCard);
  const idx = cards.indexOf(card);
  if (idx >= 0) cards[idx] = newCard;
  const oidx = originalOrder.indexOf(card);
  if (oidx >= 0) originalOrder[oidx] = newCard;
  wireUpCard(newCard);
  const img = newCard.querySelector(".dog-image");
  if (img) loadOneImage(img);
}

/** Reverse of upgradeCardToWikiImage: revert a wiki-image card back to
 *  the no-image placeholder. Called when a Wikipedia URL turns out to be
 *  broken at <img> load time so the user never sees a broken icon. */
function downgradeCardToNoImage(card, breed) {
  if (!card || !card.parentNode) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = renderCard(breed).trim();
  const newCard = tmp.firstElementChild;
  if (!newCard) return;
  card.replaceWith(newCard);
  const idx = cards.indexOf(card);
  if (idx >= 0) cards[idx] = newCard;
  const oidx = originalOrder.indexOf(card);
  if (oidx >= 0) originalOrder[oidx] = newCard;
  wireUpCard(newCard);
}

/* =====================================================================
   FAVORITES + COMPARE button state helpers
===================================================================== */

function setFavBtnState(btn, on) {
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", on);
  btn.textContent = on ? "❤️" : "🤍";
}

function setCompareBtnState(btn, on) {
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", on);
  btn.textContent = on ? "✅" : "📋";
}

/** Update the favorites-only button label to include the current count. */
function updateFavOnlyLabel() {
  if (!favOnlyBtn) return;
  favOnlyBtn.textContent = t("favCount", favorites.length);
}

/* =====================================================================
   Per-card event wiring (called after every renderAllCards())
===================================================================== */
function wireUpCard(card) {
    const breed = card.dataset.breed;
    const img = card.querySelector(".dog-image");
    const favBtn = card.querySelector(".fav-btn");
    const cmpBtn = card.querySelector(".compare-btn");
    const refreshBtn = card.querySelector(".refresh-photo");
    const openBtn = card.querySelector(".card-open-btn");

    if (img) {
      img.addEventListener("load", () => markImageLoaded(img));
      img.addEventListener("error", () => {
        // For Wikipedia-sourced images: a load failure means the cached URL
        // has rotted (Commons reorganized the file). Forget the bad cache
        // entry and downgrade the card to the no-image placeholder so we
        // don't keep showing a broken icon.
        if (img.dataset.wikiImage) {
          const breedObj = breedByKey(card.dataset.breed);
          if (breedObj) {
            setCachedWikiImage(breedObj.key, null);
            downgradeCardToNoImage(card, breedObj);
          }
          return;
        }
        if (img.src !== DEFAULT_DOG_IMAGE) hydrateImage(img, DEFAULT_DOG_IMAGE);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wrapper = refreshBtn.closest(".dog-image-wrapper");
        const image = wrapper.querySelector(".dog-image");
        if (!image) return;
        image.classList.remove("loaded");
        wrapper.classList.remove("loaded");
        loadOneImage(image, true);
      });
    }

    setFavBtnState(favBtn, isFavorite(breed));
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasFav = isFavorite(breed);
      if (wasFav) {
        favorites = favorites.filter((b) => b !== breed);
      } else {
        favorites.push(breed);
        // Heart-burst micro-interaction (only when ADDING, not removing).
        if (!prefersReducedMotion) {
          favBtn.classList.remove("bursting"); // restart the animation if rapid-fired
          // eslint-disable-next-line no-void
          void favBtn.offsetWidth;
          favBtn.classList.add("bursting");
          setTimeout(() => favBtn.classList.remove("bursting"), 700);
        }
      }
      persistFavorites();
      setFavBtnState(favBtn, isFavorite(breed));
      updateFavOnlyLabel();
      applyFilters();
    });

    setCompareBtnState(cmpBtn, compareList.includes(breed));
    cmpBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (compareList.includes(breed)) {
        compareList = compareList.filter((b) => b !== breed);
      } else {
        if (compareList.length >= MAX_COMPARE) {
          alert(t("compareMaxAlert", MAX_COMPARE));
          return;
        }
        compareList.push(breed);
      }
      setCompareBtnState(cmpBtn, compareList.includes(breed));
      updateCompareUI();
    });

    if (openBtn) {
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDetailModal(card, openBtn);
      });
    }

    // Mouse/touch-only convenience: clicking empty card area opens detail.
    // Keyboard users use the explicit "More details" button (better a11y).
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      openDetailModal(card, openBtn || card);
    });

    // Cursor-tracked glow on the image. Skipped when reduced-motion is on,
    // since the glow is purely decorative.
    if (!prefersReducedMotion) {
      const wrap = card.querySelector(".dog-image-wrapper");
      if (wrap) {
        wrap.addEventListener("mousemove", (e) => {
          const rect = wrap.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          wrap.style.setProperty("--mx", x + "%");
          wrap.style.setProperty("--my", y + "%");
        });
      }

    }

    // Quick-peek: show a floating preview after a 600ms hover.
    let peekTimer = 0;
    card.addEventListener("mouseenter", () => {
      clearTimeout(peekTimer);
      peekTimer = setTimeout(() => showQuickPeek(card), 600);
    });
    card.addEventListener("mouseleave", () => {
      clearTimeout(peekTimer);
      hideQuickPeek();
    });
}

function wireUpCards() {
  cards.forEach(wireUpCard);
  // Sample image color into --size-accent on each card once images load.
  setTimeout(applyImageDerivedAccents, 600);
}

/* =====================================================================
   FILTERS – multi-select size + advanced + search + sort
===================================================================== */

const debouncedFilter = debounce(resetPageAndApply, 150);
searchInput.addEventListener("input", () => {
  clearSearchBtn.style.display = searchInput.value ? "inline-flex" : "none";
  debouncedFilter();
});
/**
 * Clear the search input, hide the X, and re-apply filters from page 1.
 * Centralised so both the direct listener and the document-level delegate
 * (added below) reuse the same logic.
 */
function performClearSearch() {
  if (!searchInput) return;
  searchInput.value = "";
  if (clearSearchBtn) clearSearchBtn.style.display = "none";
  if (typeof resetPageAndApply === "function") resetPageAndApply();
  else if (typeof applyFilters === "function") applyFilters();
  searchInput.focus();
}

if (clearSearchBtn) clearSearchBtn.addEventListener("click", performClearSearch);

// Defensive: also listen at the document level. If anything detaches or
// replaces the X button at runtime (a feature added later, a browser
// extension, a stale cached script), the delegated handler still fires.
document.addEventListener("click", (e) => {
  const t = e.target && e.target.closest && e.target.closest("#clearSearch");
  if (t) performClearSearch();
});

document.querySelectorAll(".size-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const rank = btn.dataset.sizeRank;
    if (rank === "all") {
      selectedSizes.clear();
    } else {
      const r = parseInt(rank, 10);
      if (selectedSizes.has(r)) selectedSizes.delete(r);
      else selectedSizes.add(r);
    }
    syncSizeButtons();
    resetPageAndApply();
  });
});

function syncSizeButtons() {
  document.querySelectorAll(".size-btn").forEach((b) => {
    const rank = b.dataset.sizeRank;
    const on = rank === "all" ? selectedSizes.size === 0 : selectedSizes.has(parseInt(rank, 10));
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
}

favOnlyBtn.addEventListener("click", () => {
  favOnly = !favOnly;
  favOnlyBtn.classList.toggle("active", favOnly);
  favOnlyBtn.setAttribute("aria-pressed", favOnly);
  resetPageAndApply();
});

advancedToggle.addEventListener("click", () => {
  const wasHidden = advancedFilters.classList.contains("hidden");
  const willBeOpen = wasHidden;
  advancedFilters.classList.toggle("hidden");
  advancedToggle.setAttribute("aria-expanded", willBeOpen);
  advancedToggle.textContent = willBeOpen ? t("advancedOpen") : t("advancedClosed");
});

document.querySelectorAll(".attribute-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const attr = btn.dataset.attr;
    if (activeAttrs.has(attr)) activeAttrs.delete(attr);
    else activeAttrs.add(attr);
    btn.classList.toggle("active", activeAttrs.has(attr));
    btn.setAttribute("aria-pressed", activeAttrs.has(attr));
    resetPageAndApply();
  });
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  reorderCards();
  resetPageAndApply();
});

/* =====================================================================
   CUSTOM SORT DROPDOWN
   The native <select> is kept (visually hidden) for a11y / form
   semantics. The visible UI is a custom button + popover menu that
   mirrors the select's state and dispatches a `change` back to it so
   all existing sort logic keeps working unchanged.
===================================================================== */
const sortDropdown = document.getElementById("sortDropdown");
const sortTrigger = document.getElementById("sortTrigger");
const sortMenu = document.getElementById("sortMenu");
const sortTriggerIcon = document.getElementById("sortTriggerIcon");
const sortTriggerLabel = document.getElementById("sortTriggerLabel");

/** Build the popover menu's <li>s from the hidden <select>'s options.
 *  Re-runnable so the menu rebuilds when the language switches. */
function renderSortMenu() {
  if (!sortMenu || !sortSelect) return;
  const selected = sortSelect.value;
  sortMenu.innerHTML = Array.from(sortSelect.options).map((opt) => {
    const icon = opt.dataset.icon || "•";
    const active = opt.value === selected;
    return `
      <li role="option" class="sort-option${active ? " is-active" : ""}"
          data-value="${escapeHTML(opt.value)}"
          aria-selected="${active ? "true" : "false"}"
          tabindex="-1">
        <span class="sort-option-icon" aria-hidden="true">${icon}</span>
        <span class="sort-option-label">${escapeHTML(opt.textContent)}</span>
        <span class="sort-option-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
      </li>
    `;
  }).join("");
  // Reflect current selection on the trigger button too.
  const activeOpt = sortSelect.options[sortSelect.selectedIndex];
  if (activeOpt) {
    if (sortTriggerIcon) sortTriggerIcon.textContent = activeOpt.dataset.icon || "✨";
    if (sortTriggerLabel) sortTriggerLabel.textContent = activeOpt.textContent;
  }
}

function openSortMenu() {
  if (!sortDropdown || !sortTrigger) return;
  sortDropdown.classList.add("open");
  sortTrigger.setAttribute("aria-expanded", "true");
  // Focus the currently-active option so keyboard users land on it.
  const active = sortMenu.querySelector(".sort-option.is-active") || sortMenu.querySelector(".sort-option");
  if (active) active.focus();
}
function closeSortMenu() {
  if (!sortDropdown || !sortTrigger) return;
  sortDropdown.classList.remove("open");
  sortTrigger.setAttribute("aria-expanded", "false");
}

function pickSortOption(value) {
  if (!sortSelect) return;
  if (sortSelect.value !== value) {
    sortSelect.value = value;
    // Fire the same `change` event the user would have caused so the
    // existing sort/filter pipeline runs unchanged.
    sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  renderSortMenu();
  closeSortMenu();
  if (sortTrigger) sortTrigger.focus();
}

if (sortTrigger && sortMenu) {
  renderSortMenu();

  sortTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sortDropdown.classList.contains("open")) closeSortMenu();
    else openSortMenu();
  });

  sortMenu.addEventListener("click", (e) => {
    const opt = e.target.closest(".sort-option");
    if (opt) pickSortOption(opt.dataset.value);
  });

  // Keyboard navigation within the popover.
  sortMenu.addEventListener("keydown", (e) => {
    const items = Array.from(sortMenu.querySelectorAll(".sort-option"));
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (items[idx + 1] || items[0]).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (items[idx - 1] || items[items.length - 1]).focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (document.activeElement?.classList.contains("sort-option")) {
        pickSortOption(document.activeElement.dataset.value);
      }
    } else if (e.key === "Escape") {
      closeSortMenu();
      sortTrigger.focus();
    }
  });

  // Open on Down/Up arrow from the trigger button too.
  sortTrigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      if (!sortDropdown.classList.contains("open")) {
        e.preventDefault();
        openSortMenu();
      }
    } else if (e.key === "Escape" && sortDropdown.classList.contains("open")) {
      e.preventDefault();
      closeSortMenu();
    }
  });

  // Click outside / Escape to close.
  document.addEventListener("click", (e) => {
    if (!sortDropdown.classList.contains("open")) return;
    if (!sortDropdown.contains(e.target)) closeSortMenu();
  });
}

// Make .sort-option focusable. Native tabindex on dynamic elements is
// reset on every renderSortMenu, so we set it via a delegated rule.
sortMenu?.addEventListener("focusin", () => {});

/** Compare two cards by the *currently selected* language's name. */
function compareCardsByLocalizedName(a, b) {
  const aName = currentLang === "en" ? a.dataset.nameEn : a.dataset.nameHe;
  const bName = currentLang === "en" ? b.dataset.nameEn : b.dataset.nameHe;
  return aName.localeCompare(bName, currentLang);
}

function reorderCards() {
  cardsContainer.querySelectorAll(".section-header").forEach((h) => h.remove());

  let arr;
  if (currentSort === "default") {
    // Default = alphabetical by current language's name. The original
    // BREEDS array is sorted in Hebrew; for English users that order
    // looks random, so we resort here to match the active language.
    arr = cards.slice().sort(compareCardsByLocalizedName);
  } else if (currentSort === "name") {
    arr = cards.slice().sort(compareCardsByLocalizedName);
  } else if (currentSort === "size") {
    arr = cards.slice().sort(
      (a, b) => parseInt(a.dataset.sizeRank, 10) - parseInt(b.dataset.sizeRank, 10)
    );
  } else if (currentSort === "lifespan") {
    arr = cards.slice().sort(
      (a, b) => parseInt(b.dataset.lifespan, 10) - parseInt(a.dataset.lifespan, 10)
    );
  } else if (currentSort === "price-asc") {
    arr = cards.slice().sort(
      (a, b) => parseInt(a.dataset.priceAvg, 10) - parseInt(b.dataset.priceAvg, 10)
    );
  } else if (currentSort === "price-desc") {
    arr = cards.slice().sort(
      (a, b) => parseInt(b.dataset.priceAvg, 10) - parseInt(a.dataset.priceAvg, 10)
    );
  } else {
    arr = originalOrder.slice();
  }

  if (currentSort === "size") {
    const dict = I18N[currentLang];
    const iconKey = { 1: "sizeIconSmall", 2: "sizeIconMedium", 3: "sizeIconLarge" };
    const counts = { 1: 0, 2: 0, 3: 0 };
    arr.forEach((c) => { counts[parseInt(c.dataset.sizeRank, 10)]++; });

    let lastRank = null;
    arr.forEach((card) => {
      const rank = parseInt(card.dataset.sizeRank, 10);
      if (rank !== lastRank) {
        const header = document.createElement("div");
        header.className = "section-header";
        header.dataset.sizeHeaderRank = String(rank);
        header.innerHTML = `
          <span class="section-title">
            <span class="section-icon" aria-hidden="true">${escapeHTML(t(iconKey[rank]))}</span>
            ${escapeHTML(dict.sectionHeader[rank])}
          </span>
          <span class="section-count">${escapeHTML(t("sectionCount", counts[rank]))}</span>
        `;
        cardsContainer.appendChild(header);
        lastRank = rank;
      }
      cardsContainer.appendChild(card);
    });
  } else {
    arr.forEach((c) => cardsContainer.appendChild(c));
  }
}

function cardMatchesAttrs(card) {
  if (activeAttrs.size === 0) return true;
  const sizeRank = parseInt(card.dataset.sizeRank, 10);
  const energy = parseInt(card.dataset.energy, 10);
  const experience = parseInt(card.dataset.experience, 10);
  const shedding = parseInt(card.dataset.shedding, 10);
  const exercise = parseFloat(card.dataset.exerciseHours);
  for (const attr of activeAttrs) {
    if (attr === "goodWithKids" && card.dataset.goodWithKids !== "true") return false;
    if (attr === "goodWithCats" && card.dataset.goodWithCats !== "true") return false;
    if (attr === "lowShedding" && shedding !== 1) return false;
    if (attr === "beginner" && experience !== 1) return false;
    if (attr === "lowEnergy" && energy > 2) return false;
    // Compound "lifestyle" filters – combine multiple traits per click.
    if (attr === "familyFriendly" && !(card.dataset.goodWithKids === "true" && experience <= 2 && sizeRank <= 2)) return false;
    if (attr === "apartmentFriendly" && !(sizeRank === 1 && energy <= 2)) return false;
    if (attr === "activePeople" && !(energy >= 3 && exercise >= 1.5)) return false;
  }
  return true;
}

/** Match a card against the search string in BOTH languages (so an English
 *  user can still search "Australian" while looking at the Hebrew UI). */
function cardMatchesSearch(card, searchText) {
  if (!searchText) return true;
  const haystack =
    card.dataset.nameHe + " " +
    card.dataset.nameEn + " " +
    card.dataset.searchHe + " " +
    card.dataset.searchEn + " " +
    card.innerText.toLowerCase();
  return haystack.indexOf(searchText) !== -1;
}

function applyFilters() {
  const searchText = searchInput.value.trim().toLowerCase();
  let visible = 0;
  const visibleCards = [];
  // Count of cards that pass every active filter — used to decide whether
  // there are still more pages to reveal beyond `visiblePageCount`.
  let filterPassed = 0;

  cards.forEach((card) => {
    const sizeRank = parseInt(card.dataset.sizeRank, 10);
    const breed = card.dataset.breed;

    const matchSearch = cardMatchesSearch(card, searchText);
    const matchSize = selectedSizes.size === 0 || selectedSizes.has(sizeRank);
    const matchFav = !favOnly || isFavorite(breed);
    const matchAttrs = cardMatchesAttrs(card);

    const wasHidden = card.style.display === "none";
    const passesFilter = matchSearch && matchSize && matchFav && matchAttrs;
    if (passesFilter) filterPassed++;

    // Only the first `visiblePageCount` filter-passing cards are actually
    // shown — the rest stay hidden until the user reveals another page.
    if (passesFilter && filterPassed <= visiblePageCount) {
      card.style.display = "";
      visible++;
      if (wasHidden) visibleCards.push(card);
    } else {
      card.style.display = "none";
    }
  });

  updateLoadMoreUI(Math.max(0, filterPassed - visiblePageCount));

  // Staggered entry: each newly-visible card animates in 30 ms after the
  // previous, capped at 12 to avoid an absurdly long cascade for large grids.
  if (!prefersReducedMotion && visibleCards.length) {
    visibleCards.slice(0, 12).forEach((card, i) => {
      card.classList.remove("enter");
      // eslint-disable-next-line no-void
      void card.offsetWidth;
      card.style.animationDelay = `${i * 30}ms`;
      card.classList.add("enter");
    });
    // For cards beyond the cascade window, still animate but with no delay.
    visibleCards.slice(12).forEach((card) => {
      card.classList.remove("enter");
      // eslint-disable-next-line no-void
      void card.offsetWidth;
      card.style.animationDelay = "0ms";
      card.classList.add("enter");
    });
  }

  if (currentSort === "size") {
    cardsContainer.querySelectorAll(".section-header").forEach((h) => {
      const rank = parseInt(h.dataset.sizeHeaderRank, 10);
      const anyVisible = cards.some(
        (c) => parseInt(c.dataset.sizeRank, 10) === rank && c.style.display !== "none"
      );
      h.style.display = anyVisible ? "" : "none";
    });
  }

  // Custom empty-state copy + illustration for the "favorites only" case.
  if (visible === 0) {
    const isFavCase = favOnly && favorites.length === 0;
    emptyMessage.classList.toggle("empty-mode-favorites", isFavCase);
    emptyMessage.classList.toggle("empty-mode-search", !isFavCase);
    if (emptyTitleEl) emptyTitleEl.textContent = t(isFavCase ? "emptyTitleNoFavs" : "emptyTitleNoResults");
    if (emptyTextEl) emptyTextEl.textContent = t(isFavCase ? "favEmptyMsg" : "emptyMsg");
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }
  resultsCounter.textContent = t("resultsCounter", visible, cards.length);

  renderFilterChips(searchText);
  renderFavoritesHeading(visible);
}

/**
 * Show / hide the "Load more" button and label it with how many filtered
 * breeds are still hidden. When all matching breeds are on screen (or zero
 * matches), the button is hidden.
 */
function updateLoadMoreUI(remaining) {
  if (!loadMoreEl) return;
  const hasMore = remaining > 0;
  loadMoreEl.hidden = !hasMore;
  if (loadMoreRemainingEl) {
    loadMoreRemainingEl.textContent = hasMore ? t("loadMoreRemaining", remaining) : "";
  }
  if (loadMoreBtn) {
    loadMoreBtn.classList.remove("is-loading");
    loadMoreBtn.disabled = !hasMore;
  }
}

/** Reset pagination to the first page and re-apply filters. Use this
 *  whenever the filter set, sort order, search text, or favorites mode
 *  changes — so the user lands at the top of a fresh result set. */
function resetPageAndApply() {
  visiblePageCount = PAGE_SIZE;
  applyFilters();
}

/** Reveal the next page of filtered cards. Called by the button click and
 *  by the IntersectionObserver when the sentinel scrolls into view. */
let _loadMoreInFlight = false;
function loadMoreCards() {
  if (!loadMoreEl || loadMoreEl.hidden || _loadMoreInFlight) return;
  _loadMoreInFlight = true;
  if (loadMoreBtn) loadMoreBtn.classList.add("is-loading");
  // Tiny delay so users see the spinner spin even on instant loads —
  // makes the feedback feel intentional rather than flickery.
  setTimeout(() => {
    visiblePageCount += PAGE_SIZE;
    applyFilters();
    _loadMoreInFlight = false;
    // After the new cards are wired into the DOM the IntersectionObserver
    // for images will pick them up on its own — they're standard <img>
    // elements that were already observed at first render.
  }, 180);
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", loadMoreCards);
}

// Auto-load the next page when the sentinel scrolls into view. We use a
// generous rootMargin so the next batch is already rendered by the time
// the user reaches the bottom of the current one.
if (loadMoreEl && "IntersectionObserver" in window) {
  const loadMoreObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !loadMoreEl.hidden) loadMoreCards();
    });
  }, { rootMargin: "400px" });
  loadMoreObserver.observe(loadMoreEl);
}

/** Render the strip of removable filter chips above the cards grid.
 *  Only shown when at least one filter is active. */
function renderFilterChips(searchText) {
  if (!filterChipsEl) return;
  const chips = [];

  if (searchText) {
    chips.push(chipHTML("search", t("chipSearch", searchInput.value.trim())));
  }
  selectedSizes.forEach((rank) => {
    const breed = BREEDS.find((b) => b.sizeRank === rank);
    if (breed) chips.push(chipHTML("size:" + rank, t("chipSize", bSize(breed))));
  });
  activeAttrs.forEach((attr) => {
    const btn = document.querySelector(`.attribute-btn[data-attr="${attr}"]`);
    const label = btn ? btn.textContent.trim() : attr;
    chips.push(chipHTML("attr:" + attr, label));
  });
  if (favOnly) {
    chips.push(chipHTML("fav", t("chipFav")));
  }

  if (chips.length === 0) {
    filterChipsEl.classList.remove("has-chips");
    filterChipsEl.innerHTML = "";
    return;
  }

  filterChipsEl.classList.add("has-chips");
  filterChipsEl.innerHTML =
    `<span class="filter-chips-label">${escapeHTML(t("activeFiltersLabel"))}</span>` +
    chips.join("") +
    `<button class="filter-chip-clear" type="button" data-clear-all>${escapeHTML(t("chipClearAll"))}</button>`;

  filterChipsEl.querySelectorAll(".filter-chip button[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFilterToken(btn.dataset.remove));
  });
  const clearAll = filterChipsEl.querySelector("[data-clear-all]");
  if (clearAll) clearAll.addEventListener("click", () => clearFiltersBtn.click());
}

function chipHTML(token, label) {
  return `<span class="filter-chip">${escapeHTML(label)}<button type="button" data-remove="${escapeHTML(token)}" aria-label="${escapeHTML(t("chipRemoveAria", label))}">✕</button></span>`;
}

/** Remove a single filter when its chip's × is clicked. */
function removeFilterToken(token) {
  if (token === "search") {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
  } else if (token === "fav") {
    favOnly = false;
    favOnlyBtn.classList.remove("active");
    favOnlyBtn.setAttribute("aria-pressed", "false");
    updateFavOnlyLabel();
  } else if (token.startsWith("size:")) {
    selectedSizes.delete(parseInt(token.slice(5), 10));
    syncSizeButtons();
  } else if (token.startsWith("attr:")) {
    const attr = token.slice(5);
    activeAttrs.delete(attr);
    const btn = document.querySelector(`.attribute-btn[data-attr="${attr}"]`);
    if (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    }
  }
  resetPageAndApply();
}

/** Show "Your favorites · N" when favorites-only is active. */
function renderFavoritesHeading(visible) {
  if (!favoritesHeadingEl) return;
  if (favOnly && visible > 0) {
    favoritesHeadingEl.hidden = false;
    favoritesHeadingEl.textContent = t("favHeading", visible);
  } else {
    favoritesHeadingEl.hidden = true;
  }
}


clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  selectedSizes.clear();
  syncSizeButtons();
  favOnly = false;
  favOnlyBtn.classList.remove("active");
  favOnlyBtn.setAttribute("aria-pressed", "false");
  activeAttrs.clear();
  document.querySelectorAll(".attribute-btn").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });
  resetPageAndApply();
});

function openFilterSheet() {
  if (!filtersEl) return;
  document.body.classList.add("filters-open");
  if (filterSheetOverlay) filterSheetOverlay.hidden = false;
  filtersEl.setAttribute("aria-modal", "true");
  setTimeout(() => searchInput && searchInput.focus(), 80);
  trackEvent("Open mobile filters");
}

function closeFilterSheet() {
  document.body.classList.remove("filters-open");
  if (filterSheetOverlay) filterSheetOverlay.hidden = true;
  if (filtersEl) filtersEl.removeAttribute("aria-modal");
}

if (mobileFilterOpenBtn) mobileFilterOpenBtn.addEventListener("click", openFilterSheet);
if (mobileFilterCloseBtn) mobileFilterCloseBtn.addEventListener("click", closeFilterSheet);
if (filterSheetOverlay) filterSheetOverlay.addEventListener("click", closeFilterSheet);

if (recentBreedsListEl) {
  recentBreedsListEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".recent-breed");
    if (!btn) return;
    const card = cardForBreed(btn.dataset.breedKey);
    if (card) openDetailModal(card, btn);
  });
}
if (recentClearBtn) {
  recentClearBtn.addEventListener("click", () => {
    writeRecentBreeds([]);
    renderRecentBreeds();
  });
}

/* =====================================================================
   MODAL MANAGEMENT
===================================================================== */
let lastFocusedElement = null;

function openModal(modal, trigger) {
  lastFocusedElement = trigger || document.activeElement;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    const first = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (first) first.focus();
  }, 30);
}

function closeModal(modal) {
  modal.classList.remove("open");
  document.body.style.overflow = "";
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  // Clean up our hash routes when the corresponding modal closes.
  if (
    (modal.id === "detailModal" && location.hash.startsWith("#breed/")) ||
    (modal.id === "quizModal" && location.hash === "#quiz") ||
    (modal.id === "compareModal" && location.hash === "#compare")
  ) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(modal); });
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modal));

  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !modal.classList.contains("open")) return;
    const focusable = Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeFilterSheet();
    document.querySelectorAll(".modal.open").forEach(closeModal);
  }
});

/* =====================================================================
   DETAIL MODAL – with multi-photo gallery + URL routing
===================================================================== */

function similarBreedsHTML(breed) {
  const similar = BREEDS
    .filter((candidate) => candidate.key !== breed.key)
    .map((candidate) => {
      let score = 0;
      if (candidate.sizeRank === breed.sizeRank) score += 4;
      score += Math.max(0, 3 - Math.abs(candidate.energy - breed.energy));
      score += Math.max(0, 3 - Math.abs(candidate.shedding - breed.shedding));
      if (candidate.goodWithKids === breed.goodWithKids) score += 1;
      if (candidate.goodWithCats === breed.goodWithCats) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.candidate.nameEn.localeCompare(b.candidate.nameEn))
    .slice(0, 4)
    .map(({ candidate }) => {
      const name = bName(candidate);
      const visual = `<img data-breed-key="${escapeHTML(candidate.key)}" alt="${escapeHTML(name)}" loading="lazy">`;
      return `<button type="button" class="similar-breed" data-breed-key="${escapeHTML(candidate.key)}">${visual}<span>${escapeHTML(name)}</span></button>`;
    })
    .join("");

  if (!similar) return "";
  return `<section class="similar-breeds">
    <h3>${escapeHTML(t("similarTitle"))}</h3>
    <div class="similar-breeds-list">${similar}</div>
  </section>`;
}

function openDetailModal(card, trigger) {
  const breedKey = card.dataset.breed;
  const breed = breedByKey(breedKey);
  if (!breed) return;
  addRecentBreed(breedKey);
  trackEvent("Open breed", { breed: breedKey });

  const cachedImg = bestKnownImageFor(breed);
  const name = bName(breed);
  const wiki = wikiUrl(breed);
  const withImage = hasBreedImage(breed);
  // Wikipedia-only breeds get a single image and no refresh / gallery,
  // because the Wikipedia REST API gives us exactly one canonical thumbnail.
  const isWikiOnly = withImage && !breed.apiName;

  const heroHTML = withImage
    ? `
    <div class="detail-hero">
      <img id="detailHeroImg" src="${escapeHTML(cachedImg)}" alt="${escapeHTML(name)}"/>
      <div class="detail-hero-overlay">
        <h2 id="detailTitle">${escapeHTML(name)}</h2>
        <span class="size">${escapeHTML(t("sizeBadge", bSize(breed)))}</span>
      </div>
    </div>`
    : `
    <div class="detail-hero detail-hero-no-image">
      <div class="no-image-hero-inner" aria-hidden="true">
        <span class="no-image-initial">${escapeHTML(breedInitial(breed))}</span>
        <span class="no-image-label">${escapeHTML(t("noPhotoLabel"))}</span>
      </div>
      <div class="detail-hero-overlay detail-hero-overlay-static">
        <h2 id="detailTitle">${escapeHTML(name)}</h2>
        <span class="size">${escapeHTML(t("sizeBadge", bSize(breed)))}</span>
      </div>
    </div>`;
  const refreshBtnHTML = (withImage && !isWikiOnly)
    ? `<button id="detailRefresh" class="pill-btn" type="button">${escapeHTML(t("detailRefresh"))}</button>`
    : "";
  const thumbsHTML = (withImage && !isWikiOnly)
    ? `<div class="detail-thumbnails detail-thumbnails-standalone" id="detailThumbs"></div>`
    : "";

  detailModalContent.innerHTML = `${heroHTML}
    <div class="detail-modal-inner">
      <p class="description">${escapeHTML(bDesc(breed))}</p>
      <div class="info">${detailStatTilesHTML(breed)}</div>
      <p class="price-disclaimer">${escapeHTML(t("priceDisclaimer"))}</p>
      <p class="adoption-note">${escapeHTML(t("adoptionNote"))}</p>

      ${thumbsHTML}

      ${similarBreedsHTML(breed)}

      <div class="detail-actions">
        ${refreshBtnHTML}
        <button id="detailFav" class="pill-btn" type="button">${isFavorite(breedKey) ? escapeHTML(t("detailFavOn")) : escapeHTML(t("detailFavAdd"))}</button>
        <button id="detailShare" class="pill-btn" type="button">${escapeHTML(t("detailShare"))}</button>
        <button id="detailNativeShare" class="pill-btn" type="button">${escapeHTML(t("detailShareNative"))}</button>
        <a id="detailWhatsApp" class="pill-btn pill-btn-link" href="#" target="_blank" rel="noopener noreferrer">${escapeHTML(t("detailShareWhatsApp"))}</a>
        <a id="detailWiki" class="pill-btn pill-btn-link pill-btn-wiki" href="${escapeHTML(wiki)}" target="_blank" rel="noopener noreferrer">
          <span class="wiki-mark" aria-hidden="true">W</span> ${escapeHTML(t("detailWiki"))}
        </a>
      </div>
    </div>
  `;

  const desiredHash = `#breed/${encodeURIComponent(breedKey)}`;
  if (location.hash !== desiredHash) {
    history.pushState(null, "", desiredHash);
  }

  openModal(detailModal, trigger);
  if (withImage && !isWikiOnly) loadDetailPhotos(breed);

  // Keep the blurred backdrop in sync with whatever photo is currently in
  // the hero. We listen on the <img> itself so every src-swap path is
  // covered: initial render, refresh button, thumbnail click, fallback.
  if (withImage) {
    const heroImg = document.getElementById("detailHeroImg");
    const heroEl = heroImg && heroImg.closest(".detail-hero");
    if (heroImg && heroEl) {
      const syncHeroBg = () => {
        const url = heroImg.currentSrc || heroImg.src;
        if (url) heroEl.style.setProperty("--hero-bg", `url("${url.replace(/"/g, '\\"')}")`);
      };
      heroImg.addEventListener("load", syncHeroBg);
      // Fire once now in case the cached image is already decoded.
      if (heroImg.complete && heroImg.naturalWidth > 0) syncHeroBg();
    }
  }

  const refreshEl = document.getElementById("detailRefresh");
  if (refreshEl) refreshEl.addEventListener("click", () => loadDetailPhotos(breed, true));
  document.getElementById("detailFav").addEventListener("click", () => {
    card.querySelector(".fav-btn").click();
    document.getElementById("detailFav").textContent =
      isFavorite(breedKey) ? t("detailFavOn") : t("detailFavAdd");
  });
  document.getElementById("detailShare").addEventListener("click", () => {
    const btn = document.getElementById("detailShare");
    const url = pageUrlWithHash(`#breed/${encodeURIComponent(breedKey)}`);
    copyToClipboard(url).then(
      () => {
        announce(t("linkCopied"));
        trackEvent("Copy breed link", { breed: breedKey });
        // Visible feedback for sighted users: swap label + green for ~1.5s.
        const original = btn.textContent;
        btn.textContent = t("detailShareDone");
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1500);
      },
      () => prompt(t("detailShare"), url)
    );
  });
  const detailUrl = pageUrlWithHash(`#breed/${encodeURIComponent(breedKey)}`);
  const nativeShareBtn = document.getElementById("detailNativeShare");
  if (nativeShareBtn) {
    nativeShareBtn.hidden = typeof navigator.share !== "function";
    nativeShareBtn.addEventListener("click", () => {
      navigator.share({
        title: name,
        text: bDesc(breed),
        url: detailUrl,
      }).then(() => trackEvent("Native share breed", { breed: breedKey })).catch(() => { /* cancelled */ });
    });
  }
  const whatsApp = document.getElementById("detailWhatsApp");
  if (whatsApp) {
    const text = `${name} - ${detailUrl}`;
    whatsApp.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    whatsApp.addEventListener("click", () => trackEvent("WhatsApp share breed", { breed: breedKey }));
  }
  detailModalContent.querySelectorAll(".similar-breed").forEach((btn) => {
    const img = btn.querySelector("img");
    const breedForThumb = breedByKey(btn.dataset.breedKey);
    if (img && breedForThumb) {
      hydrateBreedImageInto(img, breedForThumb, () => swapInlineThumbToInitial(img, breedForThumb, "similar-initial"));
    }
    btn.addEventListener("click", () => {
      const nextCard = cardForBreed(btn.dataset.breedKey);
      if (nextCard) openDetailModal(nextCard, btn);
    });
  });
}

/** Fetch N random photos for a breed and render the hero + thumbnails.
 *  Only used for dog.ceo-backed breeds (apiName set) — Wikipedia-only
 *  breeds have a single canonical image and skip this entirely. */
function loadDetailPhotos(breed, force) {
  if (!breed || !breed.apiName) return;
  const thumbsEl = document.getElementById("detailThumbs");
  const heroImg = document.getElementById("detailHeroImg");
  if (!thumbsEl || !heroImg) return;

  // 1. If we have cached URLs and aren't forcing, render those instantly.
  const cached = getCachedImages(breed.apiName);
  if (!force && cached.length >= PHOTOS_PER_BREED) {
    renderDetailGallery(cached.slice(0, PHOTOS_PER_BREED), heroImg, thumbsEl);
    return;
  }

  // 2. Otherwise fetch fresh.
  fetch(`https://dog.ceo/api/breed/${breed.apiName}/images/random/${PHOTOS_PER_BREED}`)
    .then((r) => r.json())
    .then((data) => {
      const urls = (data && data.status === "success" && Array.isArray(data.message))
        ? data.message
        : [DEFAULT_DOG_IMAGE];
      renderDetailGallery(urls, heroImg, thumbsEl);
      setCachedImages(breed.apiName, urls);
      const cardImg = cardForBreed(breed.key)?.querySelector(".dog-image");
      if (cardImg) {
        cardImg.classList.remove("loaded");
        cardImg.closest(".dog-image-wrapper").classList.remove("loaded");
        hydrateImage(cardImg, urls[0]);
      }
    })
    .catch(() => { hydrateImage(heroImg, DEFAULT_DOG_IMAGE); });
}

function renderDetailGallery(urls, heroImg, thumbsEl) {
  hydrateImage(heroImg, urls[0]);
  thumbsEl.innerHTML = urls.map((u, i) =>
    `<button type="button" class="detail-thumb${i === 0 ? " active" : ""}" aria-label="${i + 1}"><img src="${escapeHTML(u)}" alt=""/></button>`
  ).join("");
  thumbsEl.querySelectorAll(".detail-thumb").forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      hydrateImage(heroImg, urls[i]);
      thumbsEl.querySelectorAll(".detail-thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
}

/* =====================================================================
   URL ROUTING
   #breed/<key> → detail modal
   #quiz        → quiz modal
   #compare     → compare modal (only if 2+ breeds selected)
===================================================================== */
function syncFromHash() {
  const hash = location.hash;
  const breedMatch = hash.match(/^#breed\/(.+)$/);

  // Close any modal that doesn't match the current hash.
  if (!breedMatch && detailModal.classList.contains("open")) {
    detailModal.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (hash !== "#quiz" && quizModal.classList.contains("open") && !detailModal.classList.contains("open")) {
    quizModal.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (hash !== "#compare" && compareModal.classList.contains("open")) {
    compareModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (breedMatch) {
    const key = decodeURIComponent(breedMatch[1]);
    const card = cardForBreed(key);
    if (card && !detailModal.classList.contains("open")) openDetailModal(card);
  } else if (hash === "#quiz" && !quizModal.classList.contains("open")) {
    startQuiz(quizBtn);
  } else if (hash === "#compare" && !compareModal.classList.contains("open")) {
    if (compareList.length >= 2) openCompareModal();
  }
}
window.addEventListener("hashchange", syncFromHash);

/* =====================================================================
   COMPARE
===================================================================== */

function updateCompareUI() {
  if (compareBarText) {
    // Render mini avatars + a textual count, instead of the bare text counter.
    // Each avatar starts as an empty <img>; hydrateBreedImageInto then fills
    // it in (dog.ceo or Wikipedia), or swaps to an initial-letter avatar.
    const avatarsHTML = compareList.map((key) => {
      const breed = breedByKey(key);
      if (!breed) return "";
      const name = bName(breed);
      return `<span class="compare-avatar" data-name="${escapeHTML(name)}" data-breed-key="${escapeHTML(key)}" tabindex="0"><img alt="${escapeHTML(name)}"/></span>`;
    }).join("");
    compareBarText.innerHTML = (compareList.length
      ? `<span class="compare-avatars">${avatarsHTML}</span>`
      : "") + escapeHTML(t("compareSelected", compareList.length));
    // Hydrate each avatar's <img> with the best available photo.
    compareBarText.querySelectorAll(".compare-avatar").forEach((avatar) => {
      const breed = breedByKey(avatar.dataset.breedKey);
      const img = avatar.querySelector("img");
      if (!breed || !img) return;
      hydrateBreedImageInto(img, breed, () => swapAvatarToInitial(avatar, breed));
    });
  }
  if (compareList.length > 0) compareBar.classList.add("visible");
  else compareBar.classList.remove("visible");
  compareOpenBtn.disabled = compareList.length < 2;
  cards.forEach((card) => {
    card.classList.toggle("compare-selected", compareList.includes(card.dataset.breed));
  });
  if (compareUrlSyncReady) syncCompareUrl();
}

function syncCompareUrl() {
  const params = new URLSearchParams(location.search);
  if (compareList.length) params.set("compare", compareList.join(","));
  else params.delete("compare");
  const query = params.toString();
  const nextUrl = `${location.pathname}${query ? "?" + query : ""}${location.hash}`;
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  if (nextUrl !== currentUrl) history.replaceState(null, "", nextUrl);
}

function restoreCompareFromUrl() {
  const params = new URLSearchParams(location.search);
  const keys = (params.get("compare") || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => breedByKey(key))
    .slice(0, MAX_COMPARE);
  if (!keys.length) return;
  compareList = Array.from(new Set(keys));
  document.querySelectorAll(".compare-btn").forEach((btn) => {
    const card = btn.closest(".card");
    setCompareBtnState(btn, !!card && compareList.includes(card.dataset.breed));
  });
  updateCompareUI();
}

compareClearBtn.addEventListener("click", () => {
  compareList = [];
  document.querySelectorAll(".compare-btn").forEach((b) => setCompareBtnState(b, false));
  updateCompareUI();
});

function openCompareModal() {
  if (compareList.length < 2) return;
  const dict = I18N[currentLang];
  compareModalContent.className = "compare-modal-body";

  // Each row spec: [labelKey, displayValueFn, comparableValueFn, betterIsLower].
  // `comparableValueFn` returns a number for diff-detection, or null if the
  // axis isn't numerically comparable (text fields like "character"/"origin").
  // `betterIsLower` controls which extreme is highlighted as the "best" cell.
  const rowSpecs = [
    { label: dict.cmpRow.size,      val: (b) => bSize(b),     cmp: (b) => b.sizeRank,        lower: false },
    { label: dict.cmpRow.energy,    val: (b) => bEnergy(b),   cmp: (b) => b.energy,          lower: false },
    { label: dict.cmpRow.lifespan,  val: (b) => bLifespan(b), cmp: (b) => b.lifespan,        lower: false },
    { label: dict.cmpRow.shedding,  val: (b) => bShedding(b), cmp: (b) => b.shedding,        lower: true },
    { label: dict.cmpRow.origin,    val: (b) => bOrigin(b),   cmp: () => null,               lower: false },
    { label: dict.cmpRow.weight,    val: (b) => bWeight(b),   cmp: () => null,               lower: false },
    { label: dict.cmpRow.exercise,  val: (b) => t("exerciseValue", b.exerciseHours),
                                                              cmp: (b) => b.exerciseHours,   lower: true },
    { label: dict.cmpRow.training,  val: (b) => bTraining(b), cmp: (b) => b.trainingDifficulty, lower: true },
    { label: dict.cmpRow.cats,      val: (b) => b.goodWithCats ? t("cmpYes") : t("cmpNo"),
                                                              cmp: (b) => b.goodWithCats ? 1 : 0, lower: false },
    { label: dict.cmpRow.kids,      val: (b) => b.goodWithKids ? t("cmpYes") : t("cmpKidsCaution"),
                                                              cmp: (b) => b.goodWithKids ? 1 : 0, lower: false },
    { label: dict.cmpRow.character, val: (b) => bCharacter(b), cmp: () => null, lower: false },
    { label: dict.cmpRow.suitable,  val: (b) => bSuitable(b),  cmp: () => null, lower: false },
  ];

  const breeds = compareList.map(breedByKey).filter(Boolean);

  // Pre-compute, per row, which breed indices have the "best" / "worst" value.
  // We only mark a row when there's a real spread (min !== max).
  const bestIdxPerRow = rowSpecs.map((spec) => {
    const vals = breeds.map(spec.cmp);
    if (vals.some((v) => v == null)) return { best: new Set(), worst: new Set() };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return { best: new Set(), worst: new Set() };
    const goodVal = spec.lower ? min : max;
    const badVal  = spec.lower ? max : min;
    const best = new Set();
    const worst = new Set();
    vals.forEach((v, i) => {
      if (v === goodVal) best.add(i);
      if (v === badVal) worst.add(i);
    });
    return { best, worst };
  });

  const compareColumns = breeds.map((breed, colIdx) => {
    const dlRows = rowSpecs.map((spec, rowIdx) => {
      const cls = bestIdxPerRow[rowIdx].best.has(colIdx) ? "diff-best" :
                  bestIdxPerRow[rowIdx].worst.has(colIdx) ? "diff-worst" : "";
      return `<dt>${escapeHTML(spec.label)}</dt><dd class="${cls}">${escapeHTML(String(spec.val(breed)))}</dd>`;
    }).join("");
    // Always render an <img>; hydrateBreedImageInto resolves the source
    // (dog.ceo or Wikipedia) and the missing handler swaps to a placeholder
    // only if both sources fail.
    const imageBlock = `<img class="compare-img" data-breed-key="${escapeHTML(breed.key)}" alt="${escapeHTML(bName(breed))}" />`;
    return `
      <div class="compare-col">
        ${imageBlock}
        <h3>${escapeHTML(bName(breed))}</h3>
        <dl>${dlRows}</dl>
      </div>
    `;
  }).join("");

  compareModalContent.innerHTML = `
    <div class="compare-modal-head">
      <h2 id="compareTitle">${escapeHTML(t("compareTitle"))}</h2>
      <button type="button" class="pill-btn" id="compareCopyLink">${escapeHTML(t("detailShare"))}</button>
    </div>
    <div class="compare-grid">${compareColumns}</div>
  `;

  compareModalContent.querySelectorAll("img.compare-img").forEach((img) => {
    const breed = breedByKey(img.dataset.breedKey);
    if (!breed) return;
    hydrateBreedImageInto(img, breed, swapCompareImgToPlaceholder);
  });
  const copyCompareBtn = document.getElementById("compareCopyLink");
  if (copyCompareBtn) {
    copyCompareBtn.addEventListener("click", () => {
      copyToClipboard(pageUrlWithHash("#compare")).then(() => {
        announce(t("compareLinkCopied"));
        trackEvent("Copy compare link", { breeds: compareList.join(",") });
        const original = copyCompareBtn.textContent;
        copyCompareBtn.textContent = t("detailShareDone");
        copyCompareBtn.classList.add("copied");
        setTimeout(() => {
          copyCompareBtn.textContent = original;
          copyCompareBtn.classList.remove("copied");
        }, 1400);
      });
    });
  }
  if (location.hash !== "#compare") history.pushState(null, "", "#compare");
  openModal(compareModal, compareOpenBtn);
}

compareOpenBtn.addEventListener("click", () => openCompareModal());

/* =====================================================================
   QUIZ
===================================================================== */
let quizStep = 0;
let quizAnswers = {};

quizBtn.addEventListener("click", () => {
  if (location.hash !== "#quiz") history.pushState(null, "", "#quiz");
  startQuiz(quizBtn);
});

function startQuiz(trigger) {
  quizStep = 0;
  quizAnswers = {};
  renderQuizStep();
  if (!quizModal.classList.contains("open")) openModal(quizModal, trigger);
}

/**
 * Render the stepped progress dots above the quiz body.
 * @param {number} total      number of questions
 * @param {number} answered   how many have been answered (filled dots)
 * @param {number|null} current  index of the currently visible question, or null on the result screen
 */
function renderQuizDots(total, answered, current) {
  if (!quizDotsEl) return;
  let html = "";
  for (let i = 0; i < total; i++) {
    const cls =
      i === current ? "quiz-dot current" :
      i < answered ? "quiz-dot filled" :
      "quiz-dot";
    html += `<span class="${cls}"></span>`;
  }
  quizDotsEl.innerHTML = html;
}

function renderQuizStep() {
  const dict = I18N[currentLang];
  const questions = dict.quizQuestions;
  const total = questions.length;
  renderQuizDots(total, quizStep, quizStep);

  if (quizStep >= total) {
    renderQuizResult();
    return;
  }

  const q = questions[quizStep];
  const current = quizAnswers[q.key];
  const optionsHTML = q.options.map((o) =>
    `<button class="quiz-option ${current === o.value ? "selected" : ""}" type="button" data-value="${escapeHTML(String(o.value))}">${escapeHTML(o.label)}</button>`
  ).join("") +
    `<button class="quiz-option skip ${current === "skip" ? "selected" : ""}" type="button" data-value="skip">${escapeHTML(t("quizSkip"))}</button>`;

  quizBody.innerHTML = `
    <p style="color:var(--text-muted);margin:0 0 6px;font-size:14px;">${escapeHTML(t("quizQuestionLabel", quizStep + 1, total))}</p>
    <h3 class="quiz-question">${escapeHTML(q.text)}</h3>
    <div class="quiz-options">${optionsHTML}</div>
    <div class="quiz-nav">
      <button class="quiz-prev" type="button" ${quizStep === 0 ? "disabled style='visibility:hidden'" : ""}>${escapeHTML(t("quizPrev"))}</button>
      <button class="quiz-next" type="button" ${current == null ? "disabled" : ""}>${escapeHTML(quizStep === total - 1 ? t("quizSeeResults") : t("quizNext"))}</button>
    </div>
  `;

  quizBody.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.value;
      quizAnswers[q.key] = isNaN(Number(v)) || v === "skip" || v === "yes" || v === "no" ? v : Number(v);
      quizBody.querySelectorAll(".quiz-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      quizBody.querySelector(".quiz-next").disabled = false;
    });
  });
  quizBody.querySelector(".quiz-prev").addEventListener("click", () => {
    if (quizStep > 0) { quizStep--; renderQuizStep(); }
  });
  quizBody.querySelector(".quiz-next").addEventListener("click", () => {
    if (quizAnswers[q.key] == null) return;
    quizStep++;
    renderQuizStep();
  });
}

/**
 * Maximum possible distance, computed dynamically from the answered questions.
 * Used to convert raw distance into a friendly "92% match" percentage.
 */
function maxQuizDistance() {
  let max = 0;
  if (quizAnswers.size !== "skip" && quizAnswers.size != null) max += 2 * 3;        // sizeRank: 1..3, max delta 2
  if (quizAnswers.energy !== "skip" && quizAnswers.energy != null) max += 3 * 2;    // energy: 1..4, max delta 3
  if (quizAnswers.shedding !== "skip" && quizAnswers.shedding != null) max += 2 * 2;
  if (quizAnswers.experience !== "skip" && quizAnswers.experience != null) max += 2 * 2;
  if (quizAnswers.kids === "yes") max += 4;
  if (quizAnswers.cats === "yes") max += 4;
  return Math.max(max, 1); // never zero, to avoid div-by-zero
}

/** Build the "why" reasons list for a breed given the user's quiz answers. */
function quizReasonsFor(breed) {
  const reasons = [];
  if (quizAnswers.size !== "skip" && quizAnswers.size != null && breed.sizeRank === quizAnswers.size) {
    reasons.push(t("quizReasonRightSize"));
  }
  if (quizAnswers.energy === 1 && breed.energy <= 2) reasons.push(t("quizReasonLowEnergy"));
  if (quizAnswers.energy === 4 && breed.energy >= 3) reasons.push(t("quizReasonHighEnergy"));
  if (quizAnswers.shedding === 1 && breed.shedding === 1) reasons.push(t("quizReasonLowShedding"));
  if (quizAnswers.experience === 1 && breed.experience === 1) reasons.push(t("quizReasonBeginner"));
  if (quizAnswers.kids === "yes" && breed.goodWithKids) reasons.push(t("quizReasonGoodKids"));
  if (quizAnswers.cats === "yes" && breed.goodWithCats) reasons.push(t("quizReasonGoodCats"));
  return reasons.slice(0, 2); // keep the podium card compact
}

/** Score every breed against the user's answers and render the top-3 podium.
 *  Tie-breakers (in order): higher experience-friendliness when user is a
 *  beginner, longer lifespan, then alphabetical to keep order stable. */
function renderQuizResult() {
  const total = I18N[currentLang].quizQuestions.length;
  renderQuizDots(total, total, null); // all dots filled, none current

  const ranked = BREEDS.map((breed) => {
    let dist = 0;
    if (quizAnswers.size !== "skip" && quizAnswers.size != null) {
      dist += Math.abs(breed.sizeRank - quizAnswers.size) * 3;
    }
    if (quizAnswers.energy !== "skip" && quizAnswers.energy != null) {
      dist += Math.abs(breed.energy - quizAnswers.energy) * 2;
    }
    if (quizAnswers.shedding !== "skip" && quizAnswers.shedding != null) {
      dist += Math.abs(breed.shedding - quizAnswers.shedding) * 2;
    }
    if (quizAnswers.experience !== "skip" && quizAnswers.experience != null) {
      dist += Math.abs(breed.experience - quizAnswers.experience) * 2;
    }
    if (quizAnswers.kids === "yes" && !breed.goodWithKids) dist += 4;
    if (quizAnswers.cats === "yes" && !breed.goodWithCats) dist += 4;
    return { breed, dist };
  }).sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    // Tie-break #1: prefer beginner-friendly when user picked "first dog".
    if (quizAnswers.experience === 1) {
      if (a.breed.experience !== b.breed.experience) {
        return a.breed.experience - b.breed.experience;
      }
    }
    // Tie-break #2: longer lifespan is a nice quality of life win.
    if (a.breed.lifespan !== b.breed.lifespan) return b.breed.lifespan - a.breed.lifespan;
    // Tie-break #3: alphabetical, for deterministic results.
    return bName(a.breed).localeCompare(bName(b.breed), currentLang);
  });

  const top3 = ranked.slice(0, 3);
  const ranks = ["gold", "silver", "bronze"];
  const emojis = ["🥇", "🥈", "🥉"];

  const skippedCount = Object.values(quizAnswers).filter((v) => v === "skip").length;
  const skippedNote = skippedCount > 0
    ? `<p class="quiz-skipped-note">${escapeHTML(t("quizSkippedNote", skippedCount))}</p>`
    : "";

  const maxDist = maxQuizDistance();
  const podiumHTML = top3.map((entry, i) => {
    const breed = entry.breed;
    const matchPct = Math.max(0, Math.round(100 - (entry.dist / maxDist) * 100));
    const reasons = quizReasonsFor(breed);
    const reasonsHTML = reasons.length
      ? `<ul class="podium-reasons">${reasons.map((r) => `<li>${escapeHTML(r)}</li>`).join("")}</ul>`
      : "";
    // Always render an <img> tag; hydrateBreedImageInto will resolve the
    // best source (dog.ceo or Wikipedia). If both fail we fall back to a
    // placeholder via swapPodiumImgToPlaceholder.
    const imageBlock = `<img class="podium-img" data-breed-key="${escapeHTML(breed.key)}" alt="${escapeHTML(bName(breed))}"/>`;
    return `
      <div class="podium-card ${ranks[i]}">
        <span class="podium-rank">${emojis[i]}</span>
        ${imageBlock}
        <h3>${escapeHTML(bName(breed))}</h3>
        <p>${escapeHTML(bSize(breed))} · ${escapeHTML(bEnergy(breed))}</p>
        <span class="podium-match">${escapeHTML(t("quizMatch", matchPct))}</span>
        ${reasonsHTML}
        <button type="button" data-breed="${escapeHTML(breed.key)}">${escapeHTML(t("quizDetails"))}</button>
      </div>
    `;
  }).join("");

  quizBody.innerHTML = `
    <div class="quiz-result">
      <p style="color:var(--text-muted);margin:0 0 8px;">${escapeHTML(t("quizResultIntro"))}</p>
      ${skippedNote}
      <div class="quiz-podium">${podiumHTML}</div>
      <div class="quiz-feedback">
        <span class="quiz-feedback-prompt">${escapeHTML(t("quizFeedbackPrompt"))}</span>
        <div class="quiz-feedback-buttons">
          <button type="button" data-feedback="up">${escapeHTML(t("quizFeedbackUp"))}</button>
          <button type="button" data-feedback="down">${escapeHTML(t("quizFeedbackDown"))}</button>
        </div>
      </div>
      <div class="quiz-nav" style="justify-content:center;">
        <button class="quiz-restart" type="button">${escapeHTML(t("quizRestart"))}</button>
        <button class="quiz-prev" type="button" style="background:var(--button-bg);color:var(--button-color);">${escapeHTML(t("quizClose"))}</button>
      </div>
    </div>
  `;

  quizBody.querySelectorAll("img.podium-img").forEach((img) => {
    const breed = breedByKey(img.dataset.breedKey);
    if (!breed) return;
    hydrateBreedImageInto(img, breed, swapPodiumImgToPlaceholder);
  });

  quizBody.querySelectorAll(".podium-card button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = cardForBreed(btn.dataset.breed);
      if (card) { closeModal(quizModal); openDetailModal(card); }
    });
  });
  quizBody.querySelector(".quiz-restart").addEventListener("click", () => startQuiz());
  quizBody.querySelector(".quiz-prev").addEventListener("click", () => closeModal(quizModal));

  // Quiz feedback: persist locally so we don't ask twice for the same set.
  const feedbackEl = quizBody.querySelector(".quiz-feedback");
  feedbackEl.querySelectorAll("[data-feedback]").forEach((b) => {
    b.addEventListener("click", () => {
      try {
        const log = JSON.parse(localStorage.getItem("dogweb-quiz-feedback") || "[]");
        log.push({
          rating: b.dataset.feedback,
          top: ranked[0] && ranked[0].breed.key,
          ts: Date.now(),
        });
        localStorage.setItem("dogweb-quiz-feedback", JSON.stringify(log.slice(-50)));
      } catch (e) { /* storage may be full / blocked */ }
      feedbackEl.classList.add("done");
      feedbackEl.querySelector(".quiz-feedback-prompt").textContent = t("quizFeedbackThanks");
    });
  });
}

/* =====================================================================
   QUICK-PEEK TOOLTIP (long-hover preview over a card)
===================================================================== */

function showQuickPeek(card) {
  if (!quickPeekEl) return;
  if (window.matchMedia("(hover: none)").matches) return; // skip on touch devices
  const breedKey = card.dataset.breed;
  const breed = breedByKey(breedKey);
  if (!breed) return;
  const accent = card.style.getPropertyValue("--size-accent") || "";
  quickPeekEl.style.setProperty("--qp-color", accent || "#f97316");
  quickPeekEl.innerHTML = `
    <p class="quick-peek-title">${escapeHTML(bName(breed))}</p>
    <p class="quick-peek-desc">${escapeHTML(bDesc(breed))}</p>
    <div class="quick-peek-meta">
      <span>⚡ ${escapeHTML(bEnergy(breed))}</span>
      <span>⏳ ${escapeHTML(bLifespan(breed))}</span>
      <span>📏 ${escapeHTML(bSize(breed))}</span>
    </div>
  `;
  quickPeekEl.hidden = false;
  positionQuickPeek(card);
  requestAnimationFrame(() => quickPeekEl.classList.add("visible"));
}

function positionQuickPeek(card) {
  const rect = card.getBoundingClientRect();
  const peekRect = quickPeekEl.getBoundingClientRect();
  const margin = 10;
  let left = rect.right + margin;
  let top = rect.top;
  // If it overflows the right edge, flip to the left of the card.
  if (left + peekRect.width > window.innerWidth - margin) {
    left = rect.left - peekRect.width - margin;
  }
  // If it would still overflow (very narrow viewport), pin to the top.
  if (left < margin) {
    left = margin;
    top = rect.bottom + margin;
  }
  // Clamp vertically.
  top = Math.max(margin, Math.min(top, window.innerHeight - peekRect.height - margin));
  quickPeekEl.style.left = left + "px";
  quickPeekEl.style.top = top + "px";
}

function hideQuickPeek() {
  if (!quickPeekEl) return;
  quickPeekEl.classList.remove("visible");
  setTimeout(() => { if (!quickPeekEl.classList.contains("visible")) quickPeekEl.hidden = true; }, 200);
}

/* =====================================================================
   IMAGE-DERIVED ACCENT COLOR (sampled from each card's photo)
===================================================================== */

const _accentSampled = new Set();
let _accentCanvas = null;
let _accentCtx = null;

/** Read the dominant-ish color from one card's image and apply it as the
 *  card's --size-accent CSS variable. Silently no-ops if the canvas read is
 *  blocked by CORS, the image hasn't decoded, or the photo is too gray. */
function sampleAccentForCard(card) {
  if (!card || _accentSampled.has(card.dataset.breed)) return;
  const img = card.querySelector(".dog-image");
  if (!img || !img.complete || !img.naturalWidth) return;
  if (!_accentCanvas) {
    _accentCanvas = document.createElement("canvas");
    _accentCanvas.width = _accentCanvas.height = 16;
    _accentCtx = _accentCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!_accentCtx) return;
  try {
    _accentCtx.clearRect(0, 0, 16, 16);
    _accentCtx.drawImage(img, 0, 0, 16, 16);
    const data = _accentCtx.getImageData(4, 4, 8, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      // Skip near-white, near-black and near-gray pixels so we land on a saturated tint.
      const cr = data[i], cg = data[i + 1], cb = data[i + 2];
      const max = Math.max(cr, cg, cb);
      const min = Math.min(cr, cg, cb);
      if (max > 240 && min > 240) continue; // near white
      if (max < 25) continue;                // near black
      if (max - min < 20) continue;          // near gray
      r += cr; g += cg; b += cb; n++;
    }
    if (n < 5) return; // not enough color data; keep size-derived accent
    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);
    const boost = (c) => Math.min(255, Math.round(c * 1.05));
    card.style.setProperty("--size-accent", `rgb(${boost(r)}, ${boost(g)}, ${boost(b)})`);
    _accentSampled.add(card.dataset.breed);
  } catch (e) {
    // Cross-origin canvas taint or other read failure — keep the size-derived accent.
  }
}

/** Sweep all cards. Called once from wireUpCards as a backstop for any
 *  images that loaded before the per-image listener was attached. */
function applyImageDerivedAccents() {
  cards.forEach(sampleAccentForCard);
}

/* =====================================================================
   MAGNETIC BUTTONS (gently follow the cursor when nearby)
===================================================================== */

function wireMagneticButtons() {
  if (prefersReducedMotion) return;
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Translate up to 8px toward the cursor.
      const dx = ((e.clientX - cx) / rect.width) * 16;
      const dy = ((e.clientY - cy) / rect.height) * 12;
      btn.style.setProperty("--mag-x", dx.toFixed(2) + "px");
      btn.style.setProperty("--mag-y", dy.toFixed(2) + "px");
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.setProperty("--mag-x", "0px");
      btn.style.setProperty("--mag-y", "0px");
    });
  });
}

/* =====================================================================
   DENSITY & VIEW MODE TOGGLES
===================================================================== */

const DENSITY_KEY = "dogweb-density";
const VIEW_KEY = "dogweb-view";

function applyDensity(mode) {
  cardsContainer.classList.toggle("is-compact", mode === "compact");
  if (densityToggleBtn) {
    densityToggleBtn.setAttribute("aria-pressed", mode === "compact");
    densityToggleBtn.textContent = mode === "compact" ? "▦" : "▤";
  }
  try { localStorage.setItem(DENSITY_KEY, mode); } catch (e) { /* ignore */ }
}

function applyView(mode) {
  cardsContainer.classList.toggle("is-list", mode === "list");
  viewToggleEls.forEach((b) => {
    const active = b.dataset.view === mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active);
  });
  try { localStorage.setItem(VIEW_KEY, mode); } catch (e) { /* ignore */ }
}

if (densityToggleBtn) {
  densityToggleBtn.addEventListener("click", () => {
    const next = cardsContainer.classList.contains("is-compact") ? "comfortable" : "compact";
    applyDensity(next);
  });
}
viewToggleEls.forEach((btn) => {
  btn.addEventListener("click", () => applyView(btn.dataset.view));
});

/* =====================================================================
   HERO STAT STRIP + FEATURED BREED
===================================================================== */

/** Stat tiles in the bento card: each has a big animated number and a label. */
function renderHeroStats() {
  if (!heroStatsEl) return;
  const breedCount = BREEDS.length;
  const quizCount = (I18N[currentLang].quizQuestions || []).length;
  const items = [
    { num: breedCount, label: t("heroStat1Label") },
    { num: quizCount,  label: t("heroStat2Label") },
    { num: t("heroStat3Num"), label: t("heroStat3Label") },
  ];
  heroStatsEl.innerHTML = items.map(({ num, label }) =>
    `<div class="hero-stat">
       <span class="hero-stat-num" data-target="${escapeHTML(String(num))}">${escapeHTML(String(num))}</span>
       <span class="hero-stat-label">${escapeHTML(label)}</span>
     </div>`
  ).join("");
  countUpHeroStats();
}

/** Animate the hero stat numbers from 0 → target. Idempotent: re-runs each
 *  language change but the visual "count" only plays once per mount. */
function countUpHeroStats() {
  if (prefersReducedMotion) return;
  heroStatsEl.querySelectorAll(".hero-stat-num").forEach((el) => {
    const target = el.dataset.target;
    const isPercent = /%$/.test(target);
    const numeric = parseInt(target, 10);
    if (isNaN(numeric)) return;
    const duration = 900;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(numeric * eased);
      el.textContent = isPercent ? value + "%" : value;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  });
}

/** State so the same featured breed persists across language toggles
 *  but rotates on each fresh page visit. */
let featuredBreedKey = null;

/** Pick a random breed for the featured banner, preferring breeds that
 *  actually have a known photo source so the banner never shows an empty
 *  frame. Falls back to any breed if (somehow) no photo-bearing breed
 *  exists. */
function pickFeaturedBreed() {
  const withImage = BREEDS.filter(hasBreedImage);
  const pool = withImage.length ? withImage : BREEDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick a random breed and populate the featured-breed banner. */
function renderFeaturedBreed() {
  if (!featuredBanner) return;
  if (!featuredBreedKey) {
    featuredBreedKey = pickFeaturedBreed().key;
  }
  const breed = breedByKey(featuredBreedKey);
  if (!breed) return;
  featuredLabelEl.textContent = t("featuredLabel");
  featuredNameEl.textContent = bName(breed);
  featuredDescEl.textContent = bDesc(breed);
  featuredOpenBtn.textContent = t("featuredCta", bName(breed));
  featuredImg.alt = bName(breed);
  hydrateFeaturedImage(breed);
  featuredBanner.hidden = false;
}

/** Decide which photo source the featured banner should use, and either
 *  set it on <img> or replace the frame with a no-image placeholder.
 *  Supports three sources, in priority order:
 *    1. dog.ceo random photo (when apiName is set)
 *    2. Wikipedia thumbnail (cached or freshly-fetched)
 *    3. Initial-letter placeholder, when nothing is available */
function hydrateFeaturedImage(breed) {
  const photoEl = featuredImg.parentElement; // .featured-photo
  if (!photoEl) return;
  // Reset any placeholder state from a previous featured breed.
  photoEl.classList.remove("no-image");
  photoEl.querySelectorAll(".no-image-initial, .no-image-label").forEach((el) => el.remove());
  featuredImg.hidden = false;
  featuredImg.src = "";

  if (breed.apiName) {
    const cached = getCachedImage(breed.apiName);
    if (cached) { featuredImg.src = cached; return; }
    fetch(`https://dog.ceo/api/breed/${breed.apiName}/images/random`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success" && data.message) {
          featuredImg.src = data.message;
          pushCachedImage(breed.apiName, data.message);
        } else {
          showFeaturedPlaceholder(breed);
        }
      })
      .catch(() => showFeaturedPlaceholder(breed));
    return;
  }

  // No dog.ceo source — try Wikipedia next.
  const cachedWiki = getCachedWikiImage(breed.key);
  if (typeof cachedWiki === "string") { featuredImg.src = cachedWiki; return; }
  if (cachedWiki === null) { showFeaturedPlaceholder(breed); return; }
  // Never tried — fetch now (will also populate the cache for cards).
  fetchBreedWikiImage(breed).then((url) => {
    setCachedWikiImage(breed.key, url || null);
    if (url) featuredImg.src = url;
    else showFeaturedPlaceholder(breed);
  });
}

/** Replace the featured banner's photo frame with a placeholder showing
 *  the breed's initial letter — same visual language as the no-image
 *  cards, so it reads as intentional rather than a broken image. */
function showFeaturedPlaceholder(breed) {
  const photoEl = featuredImg.parentElement;
  if (!photoEl) return;
  photoEl.classList.add("no-image");
  featuredImg.hidden = true;
  featuredImg.removeAttribute("src");
  if (!photoEl.querySelector(".no-image-initial")) {
    const initial = document.createElement("span");
    initial.className = "no-image-initial";
    initial.setAttribute("aria-hidden", "true");
    initial.textContent = breedInitial(breed);
    photoEl.appendChild(initial);
    const label = document.createElement("span");
    label.className = "no-image-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = t("noPhotoShort");
    photoEl.appendChild(label);
  }
}

if (featuredOpenBtn) {
  featuredOpenBtn.addEventListener("click", () => {
    const card = cardForBreed(featuredBreedKey);
    if (card) openDetailModal(card, featuredOpenBtn);
  });
}

/* =====================================================================
   SCROLL TO TOP
===================================================================== */
window.addEventListener("scroll", () => {
  scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
}, { passive: true });
scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* =====================================================================
   HERO PARALLAX – tracks the cursor across the header element
===================================================================== */
const headerEl = document.querySelector("header");
if (headerEl && !prefersReducedMotion) {
  // Throttle with requestAnimationFrame to avoid layout thrash.
  let parallaxFrame = 0;
  let pendingX = 0;
  let pendingY = 0;
  headerEl.addEventListener("mousemove", (e) => {
    const rect = headerEl.getBoundingClientRect();
    pendingX = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1..1
    pendingY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (parallaxFrame) return;
    parallaxFrame = requestAnimationFrame(() => {
      headerEl.style.setProperty("--px", pendingX.toFixed(3));
      headerEl.style.setProperty("--py", pendingY.toFixed(3));
      parallaxFrame = 0;
    });
  });
  headerEl.addEventListener("mouseleave", () => {
    headerEl.style.setProperty("--px", "0");
    headerEl.style.setProperty("--py", "0");
  });
}

/* =====================================================================
   MOBILE BOTTOM NAV
===================================================================== */
if (mobileNavEl) {
  mobileNavEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".mobile-nav-btn");
    if (!btn) return;
    const action = btn.dataset.action;
    mobileNavEl.querySelectorAll(".mobile-nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (action === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "search") {
      if (window.matchMedia("(max-width: 700px)").matches) {
        openFilterSheet();
      } else {
        if (filtersEl) filtersEl.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => searchInput && searchInput.focus(), 350);
      }
    } else if (action === "favorites") {
      if (!favOnly) favOnlyBtn.click();
      if (cardsContainer) cardsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (action === "quiz") {
      quizBtn && quizBtn.click();
    }
  });
}

/* =====================================================================
   CACHE INVALIDATION
===================================================================== */
if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", () => {
    localStorage.removeItem(IMG_CACHE_KEY);
    document.querySelectorAll(".dog-image").forEach((img) => {
      img.classList.remove("loaded");
      img.closest(".dog-image-wrapper").classList.remove("loaded");
      loadOneImage(img, true);
    });
    announce(t("cacheCleared"));
  });
}

/* =====================================================================
   LANGUAGE TOGGLE + APPLY
===================================================================== */

/** Update the inline JSON-LD block to match the active language. */
function updateStructuredData(dict, lang) {
  const ld = document.getElementById("ldJson");
  if (!ld) return;
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": dict.docTitle,
    "url": SITE_URL,
    "inLanguage": lang,
    "description": dict.docDescription,
  };
  ld.textContent = JSON.stringify(data);
}

function applyLanguage(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);

  const dict = I18N[lang];

  document.documentElement.lang = dict.htmlLang;
  document.documentElement.dir = dict.htmlDir;
  document.title = dict.docTitle;

  const setMeta = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("content", val);
  };
  setMeta("metaDescription", dict.docDescription);
  setMeta("ogTitle", dict.docTitle);
  setMeta("ogDescription", dict.docDescription);
  setMeta("ogLocale", lang === "en" ? "en_US" : "he_IL");
  setMeta("twTitle", dict.docTitle);
  setMeta("twDescription", dict.docDescription);
  setMeta("appleTitle", lang === "en" ? "Dog World" : "עולם הכלבים");

  updateStructuredData(dict, lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const v = dict[key];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (typeof dict[key] === "string") el.setAttribute("aria-label", dict[key]);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (typeof dict[key] === "string") el.setAttribute("placeholder", dict[key]);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (typeof dict[key] === "string") el.setAttribute("title", dict[key]);
  });

  if (langToggle) {
    // Keep the 🌐 icon span intact; only swap the text label.
    const labelSpan = langToggle.querySelector(".lang-label");
    if (labelSpan) labelSpan.textContent = dict.langToggle;
    else langToggle.textContent = dict.langToggle;
    langToggle.setAttribute("aria-label", dict.langToggleAria);
    langToggle.setAttribute("title", dict.langToggleAria);
  }

  applyTheme(document.documentElement.getAttribute("data-theme") || "light");
  updateFavOnlyLabel();

  const isOpen = !advancedFilters.classList.contains("hidden");
  advancedToggle.textContent = isOpen ? dict.advancedOpen : dict.advancedClosed;

  renderAllCards();
  reorderCards();
  applyFilters();
  updateCompareUI();
  renderHeroStats();
  renderFeaturedBreed();
  renderRecentBreeds();
  // Localised option labels live on the hidden <select>'s textContent;
  // applyLanguage updates those via data-i18n, but the custom dropdown
  // mirrors them so it needs a refresh too.
  if (typeof renderSortMenu === "function") renderSortMenu();
}

if (langToggle) {
  langToggle.addEventListener("click", () => {
    const next = currentLang === "he" ? "en" : "he";
    applyLanguage(next);
    // Keep ?lang= in the URL in sync with the toggle, so refresh and
    // copy-link both preserve the user's choice. Use replaceState so the
    // back button isn't polluted with a history entry per click.
    const params = new URLSearchParams(location.search);
    if (params.get("lang") !== next) {
      params.set("lang", next);
      history.replaceState(null, "", `${location.pathname}?${params.toString()}${location.hash}`);
    }
  });
}

/* =====================================================================
   INSTALL APP PROMPT
===================================================================== */
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installAppBtn) {
    installAppBtn.hidden = false;
    announce(t("installAppReady"));
  }
});
if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    trackEvent("Install prompt", { outcome: choice && choice.outcome });
    deferredInstallPrompt = null;
    installAppBtn.hidden = true;
  });
}
window.addEventListener("appinstalled", () => {
  trackEvent("App installed");
  if (installAppBtn) installAppBtn.hidden = true;
});

/* =====================================================================
   SERVICE WORKER
===================================================================== */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => { /* ignore */ });
  });
}

/* =====================================================================
   INITIAL RENDER
===================================================================== */
applyTheme(initialTheme);
applyLanguage(currentLang);
restoreCompareFromUrl();
compareUrlSyncReady = true;
updateCompareUI();
syncFromHash();

// Restore density + view mode from previous session.
try {
  const savedDensity = localStorage.getItem(DENSITY_KEY) || "comfortable";
  const savedView = localStorage.getItem(VIEW_KEY) || "grid";
  applyDensity(savedDensity);
  applyView(savedView);
} catch (e) { /* ignore */ }

wireMagneticButtons();

// Re-position the quick-peek when the user scrolls so it doesn't end up
// floating in the wrong spot.
window.addEventListener("scroll", () => {
  if (quickPeekEl && quickPeekEl.classList.contains("visible")) hideQuickPeek();
}, { passive: true });
