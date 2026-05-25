"use strict";

/**
 * Breed food recommendations based on widely accepted canine nutrition
 * guidelines (AAFCO complete diets, WSAVA body-condition scoring, and
 * breed-specific health literature). Not a substitute for veterinary advice.
 *
 * Override any breed in breeds.js with foodHe / foodEn when needed.
 */

/* ---- Trait sets: breeds with documented nutritional considerations ---- */

const BRACHYCEPHALIC = new Set([
  "pug", "french-bulldog", "english-bulldog", "boston-terrier", "boxer",
  "shihtzu", "pekinese", "cavalier", "japanese-chin", "english-toy-spaniel",
  "brussels-griffon", "affenpinscher", "bullmastiff", "american-bully",
  "ca-de-bou", "tibetan-spaniel", "chow-chow",
]);

const BLOAT_RISK = new Set([
  "great-dane", "german-shepherd", "standard-schnauzer", "irish-setter",
  "gordon-setter", "weimaraner", "bloodhound", "doberman", "old-english-sheepdog",
  "saint-bernard", "irish-wolfhound", "boxer", "labrador", "golden-retriever",
  "akita", "american-akita", "basset-hound", "borzoi", "rough-collie",
  "flatcoat-retriever", "curly-retriever", "chesapeake-retriever", "pointer",
  "german-shorthaired-pointer", "german-wirehaired-pointer", "vizsla",
  "vizsla-wirehaired", "spinone-italiano", "newfoundland", "leonberger",
  "dogue-de-bordeaux", "great-pyrenees", "bernese-mountain", "rottweiler",
  "briard", "beauceron", "belgian-laekenois", "groenendael", "tervuren",
]);

const GIANT = new Set([
  "great-dane", "english-mastiff", "saint-bernard", "newfoundland",
  "irish-wolfhound", "leonberger", "neapolitan-mastiff", "dogue-de-bordeaux",
  "pyrenean-mastiff", "broholmer", "tibetan-mastiff", "caucasian-shepherd",
  "landseer", "tosa", "fila-brasileiro", "mioritic",
  "central-asian-shepherd", "boerboel", "presa-canario", "cane-corso",
]);

const HYPOALLERGENIC = new Set([
  "poodle", "miniature-poodle", "toy-poodle", "bichon-frise", "maltese",
  "havanese", "portuguese-water-dog", "lagotto", "xoloitzcuintli",
  "chinese-crested", "coton-de-tulear", "barbet", "irish-water-spaniel",
  "spanish-water-dog", "bedlington-terrier", "peruvian-inca-orchid",
  "wheaten-terrier", "australian-silky",
  "biewer-terrier", "volpino",
]);

const WEIGHT_PRONE = new Set([
  "labrador", "golden-retriever", "cavalier", "cocker-spaniel", "beagle",
  "basset-hound", "dachshund", "pug", "french-bulldog", "english-bulldog",
  "rottweiler", "cairn-terrier", "scottish-terrier", "pekinese",
  "shihtzu", "clumber-spaniel", "sussex-spaniel",
  "cardigan-corgi", "welsh-corgi", "newfoundland", "bernese-mountain",
  "english-mastiff", "saint-bernard", "chow-chow", "bullmastiff",
  "american-bully", "boston-terrier", "brussels-griffon", "norwich-terrier",
  "norfolk-terrier", "papillon", "pomeranian",
  "pitbull", "amstaff", "staffordshire-bull-terrier",
]);

const JOINT_PRONE = new Set([
  "german-shepherd", "labrador", "golden-retriever", "rottweiler",
  "bernese-mountain", "saint-bernard", "newfoundland", "cardigan-corgi",
  "welsh-corgi", "dachshund", "great-dane", "english-mastiff", "leonberger",
  "neapolitan-mastiff", "dogue-de-bordeaux", "pyrenean-mastiff",
  "chow-chow", "norwegian-elkhound",
  "samoyed", "akita", "american-akita", "tibetan-mastiff",
  "bullmastiff", "cane-corso", "presa-canario", "boerboel", "fila-brasileiro",
  "flatcoat-retriever", "chesapeake-retriever", "old-english-sheepdog",
  "pitbull", "amstaff", "staffordshire-bull-terrier",
]);

const GI_SENSITIVE = new Set([
  "german-shepherd", "yorkshire-terrier", "shar-pei", "scottish-terrier",
  "irish-setter", "boxer", "great-dane", "westie", "wheaten-terrier",
  "basenji", "lhasa-apso", "miniature-schnauzer",
  "giant-schnauzer", "standard-schnauzer", "doberman", "rough-collie",
]);

const LOW_FAT = new Set([
  "miniature-schnauzer", "standard-schnauzer", "giant-schnauzer",
  "cocker-spaniel", "yorkshire-terrier", "shetland-sheepdog", "miniature-pinscher",
]);

const TOY_HYPOGLYCEMIA = new Set([
  "chihuahua", "yorkshire-terrier", "maltese", "papillon", "pomeranian",
  "russian-toy", "toy-poodle", "miniature-pinscher", "italian-greyhound",
  "miniature-poodle", "biewer-terrier", "brussels-griffon", "affenpinscher",
  "volpino", "japanese-chin", "english-toy-spaniel", "toy-fox-terrier",
]);

const NORTHERN_SKIN = new Set([
  "husky", "alaskan-malamute", "samoyed", "finnish-lapphund", "finnish-spitz",
  "icelandic-sheepdog", "norwegian-elkhound", "swedish-vallhund",
  "norwegian-buhund", "keeshond", "american-eskimo", "japanese-spitz",
  "alaskan-klee-kai", "saarloos-wolfdog", "yakutian-laika",
]);

const WORKING_SPORT = new Set([
  "border-collie", "malinois", "australian-shepherd", "australian-cattle-dog",
  "australian-kelpie", "husky", "alaskan-malamute", "vizsla", "vizsla-wirehaired",
  "weimaraner", "german-shorthaired-pointer", "german-wirehaired-pointer",
  "pointer", "english-springer-spaniel", "english-setter", "irish-setter",
  "gordon-setter", "flatcoat-retriever", "curly-retriever", "chesapeake-retriever",
  "nova-scotia-duck-tolling-retriever", "doberman", "rottweiler", "dutch-shepherd",
  "groenendael", "tervuren", "belgian-laekenois", "appenzeller", "entlebucher",
  "swiss-mountain", "briard", "beauceron", "berger-picard", "mudi", "puli",
  "wirehaired-pointing-griffon", "spinone-italiano", "bracco-italiano",
  "jack-russell-terrier", "parson-russell", "russell-terrier", "rat-terrier",
  "catahoula", "chinook", "karelian-bear-dog", "lapponian-herder",
  "pitbull", "amstaff", "staffordshire-bull-terrier", "bull-terrier",
]);

/** One-line breed-specific notes (Hebrew + English). */
const BREED_NOTES = {
  dalmatian: {
    he: "דיאטה דלה בפורינים — חשוב לגזע זה (אבנים בדרכי השתן).",
    en: "Low-purine diet — important for this breed (urinary stones).",
  },
  "bedlington-terrier": {
    he: "מזון דל נחושת — הגבלה וטרינרית.",
    en: "Low-copper diet — veterinary guidance required.",
  },
  dachshund: {
    he: "משקל תקין קריטי לבריאות עמוד השדרה.",
    en: "Healthy weight is critical for spinal health.",
  },
  "cardigan-corgi": {
    he: "משקל תקין מפחית עומס על מפרקים וגב.",
    en: "Healthy weight reduces joint and back strain.",
  },
  "welsh-corgi": {
    he: "משקל תקין מפחית עומס על מפרקים וגב.",
    en: "Healthy weight reduces joint and back strain.",
  },
  "great-dane": {
    he: "ארוחות קטנות, אכילה לאט — סיכון להרחבת קיבה.",
    en: "Small frequent meals, slow feeding — bloat risk.",
  },
  "german-shepherd": {
    he: "מעבר הדרגתי בין מזונות — רגישות עיכול נפוצה.",
    en: "Gradual food transitions — digestive sensitivity is common.",
  },
  "doberman": {
    he: "חלבון איכותי עם חומצות שומן (taurine) מומלץ.",
    en: "Quality protein with adequate taurine is recommended.",
  },
  chihuahua: {
    he: "ארוחות קטנות תכופות — מניעת ירידת סוכר.",
    en: "Frequent small meals — prevents hypoglycemia.",
  },
  "yorkshire-terrier": {
    he: "ארוחות קטנות תכופות; שומן מתון (סיכון לדלקת בלבלב).",
    en: "Frequent small meals; moderate fat (pancreatitis risk).",
  },
  labrador: {
    he: "גזע עם נטייה לעודף משקל — מדידה קפדנית.",
    en: "Obesity-prone breed — strict portion control.",
  },
  "golden-retriever": {
    he: "אומגה 3 לבריאות פרווה ומפרקים",
    en: "Omega-3 for coat and joint health",
  },
  "cocker-spaniel": {
    he: "שומן מתון; מעקב משקל ובריאות אוזניים.",
    en: "Moderate fat; monitor weight and ear health.",
  },
  "miniature-schnauzer": {
    he: "שומן נמוך–בינוני — סיכון לדלקת בלבלב.",
    en: "Low–moderate fat — pancreatitis risk.",
  },
  "standard-schnauzer": {
    he: "שומן מתון — סיכון לדלקת בלבלב.",
    en: "Moderate fat — pancreatitis risk.",
  },
  "giant-schnauzer": {
    he: "שומן מתון; מזון לגזעים גדולים.",
    en: "Moderate fat; large-breed formula.",
  },
  "shar-pei": {
    he: "חלבון איכותי; מעבר הדרגתי — רגישות עור ומעיים.",
    en: "Quality protein; gradual changes — skin and GI sensitivity.",
  },
  husky: {
    he: "כלב עבודה — קלוריות לפי עומס פעילות; אבץ לבריאות עור.",
    en: "Working dog — calories match activity; zinc for skin health.",
  },
  "alaskan-malamute": {
    he: "עומס פעילות גבוה; אבץ ואומגה 3 לעור ופרווה.",
    en: "High activity load; zinc and omega-3 for skin and coat.",
  },
  samoyed: {
    he: "אומגה 3 לפרווה לבנה; קלוריות לפי פעילות.",
    en: "Omega-3 for white coat; calories match activity.",
  },
  poodle: {
    he: "חלבון איכותי; מתאים גם לרגישויות — מזון מוגבל מרכיבים אפשרי.",
    en: "Quality protein; limited-ingredient diet may help sensitivities.",
  },
  "miniature-poodle": {
    he: "גר קטן; חלבון איכותי; מתאים לרגישויות.",
    en: "Small kibble; quality protein; good for sensitivities.",
  },
  "toy-poodle": {
    he: "3 ארוחות קטנות; חלבון איכותי.",
    en: "3 small meals; quality protein.",
  },
  "french-bulldog": {
    he: "משקל תקין חיוני לנשימה; ארוחות קטנות.",
    en: "Healthy weight aids breathing; smaller meals.",
  },
  pug: {
    he: "משקל תקין חיוני; ארוחות קטנות — נשימה ועיכול.",
    en: "Healthy weight essential; small meals — breathing and digestion.",
  },
  "english-bulldog": {
    he: "שליטה קפדנית במשקל; מזון קל לעיכול.",
    en: "Strict weight control; easily digestible food.",
  },
  beagle: {
    he: "נטייה לגניבת אוכל — מדידה קפדנית, בלי פינוקים.",
    en: "Food-motivated — strict portions, limit treats.",
  },
  "basset-hound": {
    he: "סיכון לעודף משקל — מנות מדודות בלבד.",
    en: "Obesity risk — measured portions only.",
  },
  "irish-setter": {
    he: "מעבר הדרגתי בין מזונות; ארוחות קטנות — סיכון להרחבת קיבה.",
    en: "Gradual diet changes; smaller meals — bloat risk.",
  },
  "bernese-mountain": {
    he: "מזון לגזעים גדולים; תמיכה במפרקים; משקל תקין.",
    en: "Large-breed food; joint support; maintain healthy weight.",
  },
  "jack-russell-terrier": {
    he: "אנרגיה גבוהה — חלבון 26–30% לכלבים פעילים.",
    en: "High energy — 26–30% protein for active dogs.",
  },
  whippet: {
    he: "רזה מטבעו — הימנעו מהאכלה מוגזמת; חלבון איכותי.",
    en: "Naturally lean — avoid overfeeding; quality protein.",
  },
  greyhound: {
    he: "רזה מטבעו; שומן בינוני; מנוחה אחרי ארוחה.",
    en: "Naturally lean; moderate fat; rest after meals.",
  },
  "portuguese-water-dog": {
    he: "חלבון איכותי; מתאים לרגישויות; אומגה 3 לפרווה.",
    en: "Quality protein; good for sensitivities; omega-3 for coat.",
  },
  pitbull: {
    he: "חלבון איכותי לתמיכה בשרירים; שליטה במשקל ופעילות יומית.",
    en: "Quality protein for muscle support; weight control and daily activity.",
  },
  amstaff: {
    he: "חלבון גבוה לכלב פעיל; שליטה במשקל; רגישויות עור — מזון מוגבל מרכיבים אפשרי.",
    en: "Higher protein for active dogs; weight control; skin sensitivities — limited-ingredient option.",
  },
  "staffordshire-bull-terrier": {
    he: "חלבון איכותי לשרירים; ארוחות מדודות — נטייה לעודף משקל.",
    en: "Quality protein for muscles; measured meals — obesity-prone.",
  },
  xoloitzcuintli: {
    he: "עור רגיש — חלבון איכותי; הגנה מהשמש.",
    en: "Sensitive skin — quality protein; sun protection.",
  },
};

/* ---- Helpers ---- */

function maxWeightKg(b) {
  const m = (b.weightEn || "").match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (m) return Math.max(+m[1], +m[2]);
  if (b.sizeRank === 1) return 10;
  if (b.sizeRank === 2) return 25;
  return 45;
}

function isHypoallergenic(b) {
  if (HYPOALLERGENIC.has(b.key)) return true;
  const text = `${b.descriptionEn} ${b.suitableForEn}`.toLowerCase();
  return /allerg|hypo|allergy suffer/.test(text);
}

function isActive(b) {
  return b.energy >= 4 || b.exerciseHours >= 2 || WORKING_SPORT.has(b.key);
}

function isSedentary(b) {
  return b.energy <= 2 && b.exerciseHours <= 1 && !WORKING_SPORT.has(b.key);
}

function isGiant(b) {
  return GIANT.has(b.key) || (b.sizeRank === 3 && maxWeightKg(b) >= 45);
}

function macroProfile(b) {
  if (LOW_FAT.has(b.key) || (isSedentary(b) && WEIGHT_PRONE.has(b.key))) {
    return {
      he: "חלבון 24–28%, שומן 8–12%",
      en: "24–28% protein, 8–12% fat",
      protein: "24–28%",
      fat: "8–12%",
    };
  }
  if (isActive(b)) {
    return {
      he: "חלבון 26–30%, שומן 14–18%",
      en: "26–30% protein, 14–18% fat",
      protein: "26–30%",
      fat: "14–18%",
    };
  }
  if (isSedentary(b)) {
    return {
      he: "חלבון 22–26%, שומן 10–14%",
      en: "22–26% protein, 10–14% fat",
      protein: "22–26%",
      fat: "10–14%",
    };
  }
  return {
    he: "חלבון 22–26%, שומן 12–15%",
    en: "22–26% protein, 12–15% fat",
    protein: "22–26%",
    fat: "12–15%",
  };
}

function baseFormula(b) {
  if (isGiant(b)) {
    return {
      he: "מזון יבש מלא לגזעים ענקיים (AAFCO) — צמיחה מבוקרת ותמיכה במפרקים",
      en: "Complete giant-breed dry food (AAFCO) — controlled growth and joint support",
    };
  }
  if (b.sizeRank === 1) {
    return {
      he: "מזון יבש מלא לגזעים קטנים (AAFCO) — גר גדול",
      en: "Complete small-breed dry food (AAFCO) — large kibble",
    };
  }
  if (b.sizeRank === 3) {
    return {
      he: "מזון יבש מלא לגזעים גדולים (AAFCO) — תמיכה במפרקים",
      en: "Complete large-breed dry food (AAFCO) — joint support",
    };
  }
  return {
    he: "מזון יבש מלא לגזעים בינוניים (AAFCO)",
    en: "Complete medium-breed dry food (AAFCO)",
  };
}

function mealSchedule(b) {
  if (TOY_HYPOGLYCEMIA.has(b.key) || (b.sizeRank === 1 && maxWeightKg(b) <= 5)) {
    return { he: "3 ארוחות קטנות ביום", en: "3 small meals daily" };
  }
  if (BLOAT_RISK.has(b.key) || isGiant(b)) {
    return {
      he: "2–3 ארוחות קטנות בקערת האכלה האיטית",
      en: "2–3 smaller meals, slow-feed bowl",
    };
  }
  if (b.sizeRank === 1) {
    return { he: "2–3 ארוחות ביום", en: "2–3 meals daily" };
  }
  return { he: "2 ארוחות מדודות ביום", en: "2 measured meals daily" };
}

function sentenceJoin(parts) {
  return parts
    .map((p) => p.trim().replace(/\.+$/, ""))
    .filter(Boolean)
    .join(". ") + ".";
}

function noteMentionsWeight(note) {
  return note && /weight|משקל|overfeed|obesity|עודף/i.test(note.he + note.en);
}

function hasWeightTip(list) {
  return list.some((t) => /משקל|weight|calor|קלור/i.test(t));
}

function hasOmegaTip(list) {
  return list.some((t) => /אומגה|omega/i.test(t));
}

function hasMealTip(list) {
  return list.some((t) => /ארוחות|meals|סוכר|hypogly/i.test(t));
}

function noteMentionsActivity(note) {
  return note && /activ|פעיל|protein|חלבון|muscle|שריר|exercise/i.test(note.he + note.en);
}

/**
 * Data-driven tips so every breed gets at least one accurate highlight
 * when no trait-set or breed note already covers it.
 */
function fillContextualHighlights(b, highlightsHe, highlightsEn) {
  const add = (he, en) => {
    if (!highlightsHe.includes(he)) {
      highlightsHe.push(he);
      highlightsEn.push(en);
    }
  };

  const note = BREED_NOTES[b.key];
  const moderateActivity = !isActive(b) && (b.energy >= 3 || b.exerciseHours >= 1);
  const lowActivity = b.energy <= 2 && b.exerciseHours <= 1;

  if (isActive(b) && !noteMentionsActivity(note)) {
    add(
      "חלבון איכותי — התאימו כמות לעומס הפעילות",
      "Quality protein — match portions to activity load"
    );
  } else if (moderateActivity && !noteMentionsActivity(note)) {
    add(
      "התאימו כמות מזון לפעילות היומית",
      "Adjust food amount to daily activity"
    );
  }

  if (lowActivity && !hasWeightTip(highlightsHe)) {
    add(
      "הימנעו מעודף קלוריות — גזע רגוע יחסית",
      "Avoid excess calories — relatively calm breed"
    );
  }

  if (
    (TOY_HYPOGLYCEMIA.has(b.key) || (b.sizeRank === 1 && maxWeightKg(b) <= 6)) &&
    !hasMealTip(highlightsHe)
  ) {
    add(
      "ארוחות קטנות ותכופות — יציבות סוכר",
      "Frequent small meals — blood sugar stability"
    );
  }

  if (b.shedding === 2 && !hasOmegaTip(highlightsHe)) {
    add("אומגה 3 לתמיכה בבריאות הפרווה", "Omega-3 to support coat health");
  }

  if (b.sizeRank === 1 && maxWeightKg(b) > 6 && maxWeightKg(b) <= 14 && !hasWeightTip(highlightsHe)) {
    add(
      "גר גדול ומנות מדודות — מניעת עודף משקל",
      "Large kibble and measured portions — prevent weight gain"
    );
  }

  if (
    (b.sizeRank >= 3 || isGiant(b)) &&
    !highlightsHe.some((t) => /מפרק|joint|glucosamine|condroitin/i.test(t))
  ) {
    add(
      "תמיכה במפרקים — חשוב בגזעים גדולים",
      "Joint support — important in large breeds"
    );
  }

  if (highlightsHe.length === 0) {
    add(
      "מזון מלא ומאוזן (AAFCO) — מים טריים תמיד",
      "Complete balanced diet (AAFCO) — fresh water always"
    );
  }
}

function extraNutrients(b, partsHe, partsEn) {
  const add = (he, en) => {
    if (!partsHe.includes(he)) {
      partsHe.push(he);
      partsEn.push(en);
    }
  };

  const note = BREED_NOTES[b.key];

  if (b.shedding >= 3 || b.key === "samoyed" || b.key === "akita") {
    add("אומגה 3 (EPA/DHA) לבריאות הפרווה", "omega-3 (EPA/DHA) for coat health");
  }
  if (JOINT_PRONE.has(b.key) || isGiant(b) || b.sizeRank === 3) {
    add("גלוקוזאמין/condroitin למפרקים", "glucosamine/chondroitin for joints");
  }
  if (isHypoallergenic(b) && !note) {
    add("חלבון ממקור יחיד או מזון מוגבל מרכיבים לרגישויות", "single-protein or limited-ingredient for sensitivities");
  }
  if (NORTHERN_SKIN.has(b.key) && b.key !== "samoyed" && b.key !== "husky" && b.key !== "alaskan-malamute") {
    add("אבץ ואומגה 3 לבריאות עור", "zinc and omega-3 for skin health");
  }
  if (GI_SENSITIVE.has(b.key) && !note) {
    add("פרוביוטיקה/מעבר הדרגתי בין מזונות", "probiotics/gradual diet transitions");
  }
  if (WEIGHT_PRONE.has(b.key) && !noteMentionsWeight(note)) {
    add("שליטה קפדנית במשקל", "strict weight management");
  }
  if (BRACHYCEPHALIC.has(b.key) && !note) {
    add("ארוחות קטנות — קלות לעיכול", "smaller, easily digestible meals");
  }
}

/**
 * @param {object} b – breed object from breeds.js
 * @returns {{ foodHe: string, foodEn: string, foodStructHe: object|null, foodStructEn: object|null }}
 */
function recommendedFoodFor(b) {
  if (b.foodHe && b.foodEn) {
    return { foodHe: b.foodHe, foodEn: b.foodEn, foodStructHe: null, foodStructEn: null };
  }

  const base = baseFormula(b);
  const macros = macroProfile(b);
  const meals = mealSchedule(b);

  const extrasHe = [];
  const extrasEn = [];
  extraNutrients(b, extrasHe, extrasEn);

  const note = BREED_NOTES[b.key];
  const noteHe = note && note.he ? note.he : null;
  const noteEn = note && note.en ? note.en : null;

  const highlightsHe = extrasHe.slice();
  const highlightsEn = extrasEn.slice();
  if (noteHe) highlightsHe.push(noteHe);
  if (noteEn) highlightsEn.push(noteEn);
  fillContextualHighlights(b, highlightsHe, highlightsEn);

  const portionHe = "כמות לפי משקל, גיל ופעילות (וטרינר).";
  const portionEn = "Amount by weight, age, and activity (vet).";

  const partsHe = [base.he, macros.he];
  const partsEn = [base.en, macros.en];

  if (extrasHe.length) {
    partsHe.push(extrasHe.join("; "));
    partsEn.push(extrasEn.join("; "));
  }
  if (noteHe) partsHe.push(noteHe);
  if (noteEn) partsEn.push(noteEn);

  partsHe.push(meals.he + " — " + portionHe);
  partsEn.push(meals.en + " — " + portionEn);

  return {
    foodHe: sentenceJoin(partsHe),
    foodEn: sentenceJoin(partsEn),
    foodStructHe: {
      formula: base.he,
      protein: macros.protein,
      fat: macros.fat,
      highlights: highlightsHe,
      schedule: meals.he,
      portionNote: portionHe,
    },
    foodStructEn: {
      formula: base.en,
      protein: macros.protein,
      fat: macros.fat,
      highlights: highlightsEn,
      schedule: meals.en,
      portionNote: portionEn,
    },
  };
}

/** Flags used by filters and cards (bloat risk, weight-prone, hypoallergenic). */
function foodTraitFlags(b) {
  if (!b || !b.key) return { bloatRisk: false, weightProne: false, hypoallergenic: false };
  return {
    bloatRisk: BLOAT_RISK.has(b.key),
    weightProne: WEIGHT_PRONE.has(b.key),
    hypoallergenic: HYPOALLERGENIC.has(b.key),
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { recommendedFoodFor, foodTraitFlags };
}
if (typeof globalThis !== "undefined") {
  globalThis.recommendedFoodFor = recommendedFoodFor;
  globalThis.foodTraitFlags = foodTraitFlags;
}
