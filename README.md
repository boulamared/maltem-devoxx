# Maltem · Devoxx Morocco booth

Landing page for the Maltem Africa booth at Devoxx Morocco (4–5 Nov 2026). Visitors scan a QR code or tap an NFC tag, then:

- **Candidates** upload their resume. It lands in a Google Drive folder.
- **Partners and executives** request a meeting with the leadership team.

Every submission is logged in a Google Sheet (`Devoxx 2026 – Maltem leads`) created in the same Drive folder, with a link to each resume.

## How it works

```
Phone ──scan──▶ GitHub Pages (web/)  ──POST JSON──▶  Google Apps Script (apps-script/)
                landing page + forms                   ├─ resume file → Drive folder
                                                       └─ row → "Candidates" / "Partners" Sheet
```

| Folder | What it is |
|---|---|
| `web/` | Static site served by GitHub Pages. `config.js` holds the backend URL. |
| `apps-script/` | Backend. Receives the forms, writes to Drive and Sheets. Runs under your Google account. |
| `.github/workflows/pages.yml` | Publishes `web/` on every push to `main`. |
| `.github/workflows/apps-script.yml` | Optional: pushes the backend to Google with clasp. |
| `scripts/qr.mjs` | Generates the printable QR code. |

## Alternative backend: your own VPS

`server/` is a drop-in replacement for the Apps Script: same JSON API, but it runs in Docker on your server and talks to Drive and Sheets through the Google APIs. Use either one, not both.

1. **DNS:** point a domain, e.g. `api.example.com`, at the VPS (A record). Open ports 80 and 443.
2. **Google OAuth client:** in <https://console.cloud.google.com> create a project, enable the **Google Drive API** and **Google Sheets API**, configure the OAuth consent screen (add yourself as a test user), then **Credentials → Create OAuth client ID → Desktop app**.
3. **Refresh token** (run on your laptop, signed in as the Google account that owns the Drive folder):
   ```bash
   cd server && npm install && npm run token -- <client_id> <client_secret>
   ```
   Open the printed URL, accept, and copy the `GOOGLE_REFRESH_TOKEN=…` line. While the consent screen is in "Testing" the token expires after 7 days: publish the app (Production) to make it permanent. An unverified app shows a warning screen, which is fine for your own account.
4. **On the VPS:**
   ```bash
   cd server && cp .env.example .env   # fill in every value
   docker compose up -d --build
   ```
   Open `https://api.example.com/`: it should show `{"ok":true,…}`. The leads Sheet is created in your Drive folder on first start.
5. **Connect the page:** set `API_URL: "https://api.example.com/"` in [`web/config.js`](web/config.js) and `ALLOWED_ORIGIN` in `.env` to your Pages origin.

## Deploy with Apps Script (about 15 minutes)

### 1. Drive folder

Create a folder in Google Drive, for example `Devoxx 2026 – Resumes`. Open it and copy the ID from the address bar (the part after `/folders/`).

> Use a Maltem Google Workspace account if you can, so resumes stay in company Drive.

### 2. Backend (Apps Script)

1. Go to <https://script.google.com> → **New project** → name it `Maltem Devoxx Booth API`.
2. Replace the content of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
3. Paste your folder ID into `FOLDER_ID`. Optionally set `NOTIFY_EMAIL`.
4. In the function menu pick **setup** → **Run** → accept the permissions. This creates the leads Sheet in your folder.
5. **Deploy → New deployment →** type **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the **Web app URL** (ends in `/exec`). Opening it in a browser should show `{"ok":true,...}`.

### 3. Connect the page

Put that URL in [`web/config.js`](web/config.js):

```js
API_URL: "https://script.google.com/macros/s/XXXX/exec",
```

Commit and push.

### 4. Turn on GitHub Pages

Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The `Deploy landing page` workflow then publishes the site at:

```
https://<your-github-user>.github.io/maltem-devoxx-booth/
```

> GitHub Pages is free for public repositories. The repo only holds code: resumes and leads stay in your Google Drive.

### 5. QR code and NFC

```bash
npm install
npm run qr -- "https://<your-github-user>.github.io/maltem-devoxx-booth/"
```

This writes `qr/qr-devoxx.png` (2000 px, for print) and `qr/qr-devoxx.svg`.

- **Booth screen:** open `…/maltem-devoxx-booth/?view=booth` on a tablet for a full-screen QR code.
- **NFC:** write the page URL to an NTAG213/215 sticker with the free **NFC Tools** app (Write → Add a record → URL).

### 6. Test before the event

Open the page on your phone in a private window. Send one resume and one meeting request, then check the Drive folder and the Sheet.

## Updating

- **Page:** edit `web/`, push to `main`. Live in about a minute.
- **Backend from the editor:** paste the new `Code.gs`, then **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Editing the existing deployment keeps the same URL.
- **Backend from GitHub (optional):** add three repository secrets and the `Deploy Apps Script backend` workflow runs on every change to `apps-script/`:
  - `CLASPRC_JSON`: content of `~/.clasprc.json` after `npx clasp login`
  - `SCRIPT_ID`: Apps Script editor → Project settings → Script ID
  - `DEPLOYMENT_ID`: Deploy → Manage deployments → the web app's deployment ID

  Enable the Apps Script API once at <https://script.google.com/home/usersettings>.

## Local preview

```bash
npm run dev   # http://localhost:5173
```

Forms only send once `API_URL` is set.

## Notes

- Accepted resumes: PDF, Word, JPEG, PNG, up to 10 MB.
- A hidden honeypot field drops most bot submissions.
- Values that look like spreadsheet formulas are stored as plain text.
- Both forms ask for consent under Moroccan law 09-08. Check with HR that the CNDP declaration covers event recruiting.
- The logo is `web/logo.png` (200×44), and `--brand` in `web/index.html` is `#EA4135`, sampled from it. For sharper print and tablet display, swap in an SVG and update the two `<img>` tags.
