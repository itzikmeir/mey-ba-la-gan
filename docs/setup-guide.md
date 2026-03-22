# מדריך התקנה – "מי בה לה גן"

## שלב 1 – Google Sheets (בסיס הנתונים)

1. פתח [Google Sheets](https://sheets.google.com) וצור גיליון חדש בשם: **מי בה לה גן - נתונים**

2. צור 6 גיליונות עם השמות המדויקים הבאים:
   - `Parents`
   - `DailyConfig`
   - `Submissions`
   - `RotationTracking`
   - `History`
   - `SwapRequests`

3. הוסף שורת כותרות לכל גיליון:

   **Parents:**
   `phone | family_id | children | display_name | active | notes | created_at`

   **DailyConfig:**
   `date | shift1_name | shift1_arrival | shift1_end | shift1_teachers | shift2_name | shift2_arrival | shift2_end | shift2_teachers | shift_duration_min | deadline | special_parent_code | special_phone_list | status | created_at | updated_at`

   **Submissions:**
   `date | family_id | phone | child_id | child_name | preference_1 | preference_2 | is_special | assigned_shift | assignment_reason | submitted_at | updated_at`

   **RotationTracking:**
   `child_id | child_name | family_id | shift1_count | shift2_count | bumped_count | last_bumped_date | bump_debt | last_updated`

   **History:**
   `date | child_id | child_name | family_id | preference_1 | preference_2 | is_special | assigned_shift | assignment_reason | shift1_count | shift2_count | was_oversubscribed`

   **SwapRequests:**
   `request_id | date | family_id | phone | child_id | child_name | current_shift | requested_shift | reason | status | admin_note | requested_at | resolved_at`

---

## שלב 2 – Google Apps Script (השרת)

1. בגיליון Sheets: **Extensions → Apps Script**

2. מחק את הקוד הקיים ב-Code.gs

3. צור קבצים חדשים (**+** ← Script) עם השמות:
   - `Auth`
   - `Config`
   - `Submissions`
   - `Algorithm`
   - `Rotation`
   - `Parents`
   - `WhatsApp`
   - `History`

4. העתק את תוכן כל קובץ מתיקיית `gas/` בפרויקט לקובץ המתאים ב-Apps Script

5. **Project Settings** ← **Script Properties** ← הוסף:

   | מפתח | ערך |
   |------|-----|
   | `SPREADSHEET_ID` | ID הגיליון (מהURL: `...spreadsheets/d/XXX/edit`) |
   | `ADMIN_PASSWORD` | סיסמת מנהל לבחירתך |
   | `SESSION_SALT` | מחרוזת אקראית ארוכה (ליצירה: [random.org](https://www.random.org/strings)) |
   | `KINDERGARTEN_PHONE` | מספר הטלפון של מנהל הגן (לקבלת התראות) |
   | `APP_URL` | כתובת האפליקציה לאחר פריסה |
   | `GREEN_API_INSTANCE` | (אופציונלי) מזהה Green API |
   | `GREEN_API_TOKEN` | (אופציונלי) טוקן Green API |

6. **Deploy → New Deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - לחץ Deploy

7. **העתק את ה-URL** של ה-deployment – תצטרך אותו בשלב הבא

---

## שלב 3 – Frontend (ממשק המשתמש)

1. פתח את תיקיית הפרויקט בטרמינל

2. צור קובץ `.env.local` (העתק מ-`.env.example`):
   ```
   VITE_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
   ```
   החלף `YOUR_ID` ב-ID שקיבלת בשלב 2

3. **הרץ מקומית לבדיקה:**
   ```bash
   npm install
   npm run dev
   ```
   האפליקציה תיפתח בכתובת: http://localhost:3000/mey-ba-la-gan/

---

## שלב 4 – פריסה ב-GitHub Pages

1. צור repository ב-GitHub בשם: `mey-ba-la-gan`

2. הרץ בטרמינל:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git remote add origin https://github.com/YOUR_USERNAME/mey-ba-la-gan.git
   git push -u origin main
   ```

3. ב-GitHub repository:
   - **Settings → Pages → Source: GitHub Actions**
   - **Settings → Secrets and variables → Actions → New repository secret**
     - שם: `VITE_GAS_URL`
     - ערך: כתובת ה-Apps Script Web App

4. הגיוס יתחיל אוטומטית. לאחר כ-2 דקות האפליקציה תהיה זמינה ב:
   `https://YOUR_USERNAME.github.io/mey-ba-la-gan/`

---

## שלב 5 – הגדרת הורים ראשונית

1. כנס לאפליקציה בכתובת `/admin/login` עם סיסמת המנהל
2. לחץ על **הורים**
3. הוסף כל הורה עם: טלפון, שם משפחה, וילדים

---

## שלב 6 – Green API (אופציונלי – WhatsApp אוטומטי)

1. הירשם ב: https://green-api.com/
2. צור instance חדש
3. סרוק QR עם WhatsApp של הגן
4. העתק Instance ID ו-API Token לScript Properties

---

## רשימת בדיקה יומית (Smoke Test)

לפני כל יום, המנהל מריץ:

```
[ ] תאריך מחר הוגדר נכון
[ ] Deadline הוגדר (לדוגמה: 20:00)
[ ] שתי המשמרות עם שמות, שעות, וגננות
[ ] הורים מיוחדים הוגדרו (אם יש)
[ ] קוד יומי נשלח להורים המיוחדים
[ ] הלינק לאפליקציה נפתח בנייד ומציג טיימר
```

---

## פתרון בעיות נפוצות

**"מספר הטלפון אינו רשום"** – הטלפון לא נוסף לגיליון Parents. הוסף דרך ממשק המנהל.

**"הגדרות יום מחר עוד לא הוכנסו"** – המנהל צריך להגדיר את פרטי היום בטאב "הגדרות".

**CORS Error** – ודא ש-Apps Script deployed כ-"Anyone" access ושה-URL ב-.env.local נכון.

**"שגיאת שרת (403)"** – ה-Apps Script לא deployed בצורה נכונה. Deploy מחדש.

**הספירה לאחור לא מדויקת** – ודא שהגדרת את Timezone ב-appsscript.json ל-`Asia/Jerusalem`.
