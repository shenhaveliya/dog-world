# סוגי כלבים – מדריך אינטראקטיבי לבחירת הגזע המתאים

אתר סטטי שמציג מידע על 37 גזעי כלבים נפוצים, עם חיפוש, סינון, השוואה, מועדפים, חידון התאמה, מצב כהה, החלפת שפה (עברית/אנגלית), תמיכה בעבודה לא מקוונת ועוד.

## איך מריצים

הדרך הכי פשוטה: לחיצה כפולה על `index.html`. הקובץ ייפתח בדפדפן ברירת המחדל.

לחווייה מלאה (כולל PWA וניהול cache תקין), עדיף להריץ דרך שרת מקומי:

```bash
# Python (מותקן בדרך כלל ב-Windows)
python -m http.server 8000

# או Node
npx serve .
```

ואז לפתוח את <http://localhost:8000/> בדפדפן.

## תכונות

- 37 גזעי כלבים עם תיאור מפורט, מקור, משקל, אורך חיים, צרכי פעילות, קושי באילוף, התאמה לילדים/חתולים ועוד
- **כפתור החלפת שפה (HE / EN)** – כל הממשק וכל פרטי הגזעים מתורגמים, כולל החלפת `dir` ל-RTL/LTR; הבחירה נשמרת
- חיפוש חופשי + סינון לפי גודל (multi-select), אנרגיה נמוכה, נשירה, התאמה לכלב ראשון
- מועדפים נשמרים ב-`localStorage`
- השוואה side-by-side של עד 4 גזעים בו-זמנית
- חידון התאמה (6 שאלות) שממליץ על top-3
- מצב כהה / בהיר עם זיהוי אוטומטי של העדפת המערכת
- תמונות נטענות לפי הצורך (lazy load) עם cache של 24 שעות
- 4 תמונות שונות לכל גזע במסך הפרטים
- קישורים ניתנים לשיתוף (`#breed/akita` יפתח את הגזע ישירות)
- נגישות מלאה: focus trap, skip link, aria-live, ניווט במקלדת
- עובד גם ללא חיבור לאינטרנט (Service Worker)

## מבנה הקבצים

```
Dog Web/
├── index.html                       ← קובץ HTML ראשי (ה-shell)
├── styles.css                       ← כל ה-CSS
├── script.js                        ← כל ה-JS (לוגיקה, רנדור, אירועים)
├── breeds.js                        ← נתוני הגזעים – ערוך כאן כדי להוסיף/לשנות
├── i18n.js                          ← מילוני תרגום לעברית ולאנגלית
├── build.js                         ← סקריפט שמייצר עמוד נפרד לכל גזע (SEO)
├── breeds/                          ← עמודי HTML סטטיים, אחד לכל גזע (he + en)
├── service-worker.js                ← PWA: עבודה ללא חיבור
├── manifest.json                    ← PWA: נתוני האפליקציה
├── icon.svg                         ← אייקון האפליקציה
├── sitemap.xml, robots.txt          ← SEO
└── README.md                        ← הקובץ הזה
```

## ייצור עמודים סטטיים (אופציונלי, ל-SEO)

האתר עובד מצוין בלי שום שלב build. אם רוצים שמנועי חיפוש יוכלו לאנדקס
כל גזע בנפרד (כולל תיאור, מקור, וקישור לוויקיפדיה), מריצים:

```bash
node build.js
# או עם דומיין מותאם:
SITE_URL=https://my-domain.com node build.js
```

זה ייצור 111 קבצי HTML סטטיים בתיקיית `breeds/` ויעדכן את `sitemap.xml`
עם רשומה לכל גזע + הקישורים לכל שפה. מריצים שוב בכל פעם שמשנים את `breeds.js`.

## פרמטרים ב-URL

- `?lang=en` – פותח את האתר באנגלית (גובר על הבחירה השמורה)
- `#breed/<key>` – פותח ישירות את חלון הפרטים של גזע מסוים
- `#quiz` – פותח את חידון ההתאמה
- `#compare` – פותח את חלון ההשוואה (אם נבחרו לפחות 2 גזעים)

## הוספת גזע חדש

פותחים את `breeds.js` ומוסיפים אובייקט חדש למערך `BREEDS`:

```js
{
  key: "samoyed",
  nameHe: "סמויד",
  nameEn: "Samoyed",
  apiName: "samoyed",        // השם של הגזע ב-dog.ceo API
  size: "גדול",              // קטן | בינוני | גדול
  sizeRank: 3,               // 1=קטן, 2=בינוני, 3=גדול
  energy: 3,                 // 1-4
  shedding: 3,               // 1-3
  experience: 2,             // 1-3 (קושי לבעלים)
  lifespan: 13,              // ממוצע שנים
  description: "כלב לבן ושמח...",
  descriptionEn: "A happy white dog...",
  energyLabel: "גבוהה",
  energyLabelEn: "High",
  lifespanLabel: "12–14 שנים",
  lifespanLabelEn: "12–14 years",
  sheddingLabel: "גבוהה",
  sheddingLabelEn: "High",
  character: "שמח, חברותי, ידידותי",
  characterEn: "Happy, friendly, sociable",
  suitableFor: "אקלים קר, משפחות, אילוף",
  suitableForEn: "Cool climate, families, training",
  origin: "סיביר",
  originEn: "Siberia",
  weight: "20–30 ק״ג",
  weightEn: "20–30 kg",
  exerciseHours: 1.5,
  trainingDifficulty: 3,     // 1=קל מאוד, 5=קשה מאוד
  goodWithCats: true,
  goodWithKids: true,
}
```

הגזע יופיע אוטומטית בעמוד עם כל התכונות (חיפוש, סינון, השוואה, חידון).

## טכנולוגיות

HTML, CSS, ו-JavaScript בלבד – ללא כלי build, ללא תלויות.

תמונות מגיעות מה-API החינמי [dog.ceo](https://dog.ceo/dog-api/).
