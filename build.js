#!/usr/bin/env node
"use strict";

/**
 * build.js
 *
 * Generates one static, SEO-friendly HTML page per breed under ./breeds/
 * and rewrites sitemap.xml to list every breed page in both languages.
 *
 * Each breed page:
 *   - has its own <title>, meta description, Open Graph tags, and JSON-LD
 *     so search engines can index the breed independently of the SPA.
 *   - shows the breed info as plain HTML (works without JavaScript).
 *   - has a small inline script that redirects JS-enabled visitors into the
 *     SPA with `#breed/<key>` so they get the full interactive experience.
 *
 * Usage:
 *   node build.js                 # builds with the GitHub Pages SITE_URL
 *   SITE_URL=https://my.site node build.js
 *
 * Re-run this script whenever you edit breeds.js to keep the static
 * pages and sitemap in sync.
 */

const fs = require("fs");
const path = require("path");

const { BREEDS } = require("./breeds.js");
const { I18N, LANGUAGES } = require("./i18n.js");
const { BREED_WIKI_IMAGES } = require("./wiki-images.js");

const SITE_URL = (process.env.SITE_URL || "https://shenhaveliya.github.io/dog-world").replace(/\/$/, "");
const OUT_DIR = path.join(__dirname, "breeds");
const SPA_PATH = "/";
const TODAY = new Date().toISOString().slice(0, 10);
const CSS_VERSION = "20260517-similar-reasons1";
const DEFAULT_PREVIEW_IMAGE = "https://images.dog.ceo/breeds/retriever-golden/n02099601_7771.jpg";

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pickName(breed, lang) {
  return lang === "en" ? breed.nameEn : breed.nameHe;
}
function pickDesc(breed, lang) {
  return lang === "en" ? breed.descriptionEn : breed.description;
}
function pickField(breed, lang, field) {
  const enKey = field + "En";
  return lang === "en" ? breed[enKey] : breed[field];
}

function sizeLabel(breed, lang) {
  const map = { 1: "sizeSmall", 2: "sizeMedium", 3: "sizeLarge" };
  return I18N[lang][map[breed.sizeRank]];
}

function trainingLabel(breed, lang) {
  return I18N[lang].trainingLabels[breed.trainingDifficulty] || "—";
}

function breedPageUrl(breed, lang) {
  return `${SITE_URL}/breeds/${encodeURIComponent(breed.key)}.${lang}.html`;
}

function previewImageFor(breed) {
  const wiki = BREED_WIKI_IMAGES && BREED_WIKI_IMAGES[breed.key];
  if (wiki && wiki.src) return wiki.src;
  return DEFAULT_PREVIEW_IMAGE;
}

/**
 * Render a single breed's HTML page in the chosen language.
 */
function renderBreedPage(breed, lang) {
  const dict = I18N[lang];
  const name = pickName(breed, lang);
  const desc = pickDesc(breed, lang);
  const url = breedPageUrl(breed, lang);
  const image = previewImageFor(breed);
  const wikiHost = dict.wikiHost;
  const wiki = wikiHost + encodeURIComponent(breed.nameEn.replace(/ /g, "_"));

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": name,
    "inLanguage": lang,
    "description": desc,
    "url": url,
    "image": image,
    "about": {
      "@type": "Thing",
      "name": name,
      "sameAs": wiki,
    },
  };

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dict.htmlDir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHTML(name)} – ${escapeHTML(dict.docTitle)}</title>
  <meta name="description" content="${escapeHTML(desc)}" />
  <link rel="canonical" href="${escapeHTML(url)}" />

  <link rel="alternate" hreflang="he" href="../breeds/${encodeURIComponent(breed.key)}.he.html" />
  <link rel="alternate" hreflang="en" href="../breeds/${encodeURIComponent(breed.key)}.en.html" />
  <link rel="alternate" hreflang="x-default" href="${escapeHTML(url)}" />

  <link rel="icon" href="../icon.svg" type="image/svg+xml" />
  <link rel="manifest" href="../manifest.json" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHTML(name)}" />
  <meta property="og:description" content="${escapeHTML(desc)}" />
  <meta property="og:locale" content="${lang === "en" ? "en_US" : "he_IL"}" />
  <meta property="og:url" content="${escapeHTML(url)}" />
  <meta property="og:image" content="${escapeHTML(image)}" />
  <meta property="og:image:alt" content="${escapeHTML(name)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHTML(name)}" />
  <meta name="twitter:description" content="${escapeHTML(desc)}" />
  <meta name="twitter:image" content="${escapeHTML(image)}" />

  <script type="application/ld+json">${JSON.stringify(ld)}</script>

  <link rel="stylesheet" href="../styles.css?v=${CSS_VERSION}" />

  <script>
    // Redirect JS-enabled visitors to the SPA so they get the full
    // interactive experience (gallery, favorites, comparison, quiz).
    // Search engine crawlers without JS will keep reading this static page.
    (function () {
      try {
        var current = location.search;
        if (current.indexOf("noredirect") !== -1) return;
        location.replace("..${SPA_PATH}?lang=${lang}#breed/${encodeURIComponent(breed.key)}");
      } catch (e) { /* fall back to static page */ }
    })();
  </script>
</head>
<body>
  <main class="container" style="max-width:780px;margin:40px auto;padding:0 20px;">
    <p><a href="..${SPA_PATH}?lang=${lang}">${escapeHTML(dict.h1)} ←</a></p>
    <article class="card" style="cursor:default;">
      <h1 style="font-size:34px;margin:0 0 12px;">${escapeHTML(name)}</h1>
      <p style="color:var(--text-muted);margin:0 0 6px;font-size:14px;">
        <em>${escapeHTML(breed.nameHe)}${lang === "en" ? "" : " · " + escapeHTML(breed.nameEn)}</em>
      </p>
      <span class="size">${escapeHTML(dict.sizeBadge(sizeLabel(breed, lang)))}</span>
      <p class="description">${escapeHTML(desc)}</p>
      <div class="info">
        <p><strong>${escapeHTML(dict.infoEnergy)}</strong> ${escapeHTML(pickField(breed, lang, "energyLabel"))}</p>
        <p><strong>${escapeHTML(dict.infoLifespan)}</strong> ${escapeHTML(pickField(breed, lang, "lifespanLabel"))}</p>
        <p><strong>${escapeHTML(dict.infoShedding)}</strong> ${escapeHTML(pickField(breed, lang, "sheddingLabel"))}</p>
        <p><strong>${escapeHTML(dict.infoCharacter)}</strong> ${escapeHTML(pickField(breed, lang, "character"))}</p>
        <p><strong>${escapeHTML(dict.infoSuitable)}</strong> ${escapeHTML(pickField(breed, lang, "suitableFor"))}</p>
        <p><strong>${escapeHTML(dict.infoOrigin)}</strong> ${escapeHTML(pickField(breed, lang, "origin"))}</p>
        <p><strong>${escapeHTML(dict.infoWeight)}</strong> ${escapeHTML(pickField(breed, lang, "weight"))}</p>
        <p><strong>${escapeHTML(dict.infoExercise)}</strong> ${escapeHTML(dict.exerciseValue(breed.exerciseHours))}</p>
        <p><strong>${escapeHTML(dict.infoTraining)}</strong> ${escapeHTML(trainingLabel(breed, lang))}</p>
        <p><strong>${escapeHTML(dict.infoCats)}</strong> ${breed.goodWithCats ? escapeHTML(dict.yes) : escapeHTML(dict.catsBad)}</p>
        <p><strong>${escapeHTML(dict.infoKids)}</strong> ${breed.goodWithKids ? escapeHTML(dict.yes) : escapeHTML(dict.kidsBad)}</p>
      </div>
      <p style="margin-top:18px;">
        <a class="pill-btn pill-btn-link" href="${escapeHTML(wiki)}" target="_blank" rel="noopener noreferrer">
          ${escapeHTML(dict.detailWiki)}
        </a>
        <a class="pill-btn pill-btn-link" href="..${SPA_PATH}?lang=${lang}#breed/${encodeURIComponent(breed.key)}">
          ${escapeHTML(dict.cardOpenBtn)} →
        </a>
      </p>
    </article>
  </main>
</body>
</html>
`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeBreedPages() {
  ensureDir(OUT_DIR);
  let count = 0;
  for (const breed of BREEDS) {
    for (const lang of LANGUAGES) {
      const filename = `${breed.key}.${lang}.html`;
      fs.writeFileSync(path.join(OUT_DIR, filename), renderBreedPage(breed, lang));
      count++;
    }
    // Also write a default (no-lang-suffix) page that is the "x-default"
    // canonical entry; uses Hebrew, since the site's primary audience is
    // Hebrew-speaking. This is what we link from sitemap.xml as the main URL.
    fs.writeFileSync(path.join(OUT_DIR, `${breed.key}.html`), renderBreedPage(breed, "he"));
    count++;
  }
  console.log(`Wrote ${count} breed pages into ${OUT_DIR}`);
}

function writeSitemap() {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  lines.push('        xmlns:xhtml="http://www.w3.org/1999/xhtml">');

  // Homepage entry
  lines.push("  <url>");
  lines.push(`    <loc>${SITE_URL}${SPA_PATH}</loc>`);
  lines.push(`    <lastmod>${TODAY}</lastmod>`);
  lines.push("    <changefreq>weekly</changefreq>");
  lines.push("    <priority>1.0</priority>");
  for (const lang of LANGUAGES) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}${SPA_PATH}?lang=${lang}" />`);
  }
  lines.push("  </url>");

  // One entry per breed (default URL, with hreflang alternates)
  for (const breed of BREEDS) {
    const loc = `${SITE_URL}/breeds/${encodeURIComponent(breed.key)}.html`;
    lines.push("  <url>");
    lines.push(`    <loc>${loc}</loc>`);
    lines.push(`    <lastmod>${TODAY}</lastmod>`);
    lines.push("    <changefreq>monthly</changefreq>");
    lines.push("    <priority>0.7</priority>");
    for (const lang of LANGUAGES) {
      const altLoc = `${SITE_URL}/breeds/${encodeURIComponent(breed.key)}.${lang}.html`;
      lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${altLoc}" />`);
    }
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");
  fs.writeFileSync(path.join(__dirname, "sitemap.xml"), lines.join("\n"));
  console.log(`Wrote sitemap.xml (${BREEDS.length} breed entries + 1 homepage)`);
}

writeBreedPages();
writeSitemap();
