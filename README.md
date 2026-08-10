# — A Fairytale Wedding Invitation

A single-page, fully responsive, fairytale-themed wedding invitation with three
Google integrations:

- **Google Sheets (via Apps Script)** — the RSVP form and the Messages-for-the-Couple wall both post into one Google Sheet (separate tabs), through a single Apps Script web app.
- **Google Maps** — an embedded venue map plus a one-tap "Get Directions" link.
- **Google Calendar** — an "Add to Google Calendar" button pre-filled with the event details.

Plus:

- A **Save the Date** video section (shows a "coming soon" placeholder until you add a video link).
- A **Program Schedule** timeline for the day of the wedding.

No build step and no dependencies — just static HTML, CSS, and vanilla JS.

## File structure

```
claude_weedding/
├── index.html        # Page markup
├── css/style.css     # All styling
└── js/
    ├── config.js     # ← Edit this: names, dates, venue, Apps Script URLs
    └── main.js       # Countdown, animations, calendar + RSVP logic
```

## Quick start

Open `index.html` in a browser, or serve the folder:

```bash
cd claude_weedding
python3 -m http.server 8000
# visit http://localhost:8000
```

## 1. Customize the basics

Edit `js/config.js`:

- `coupleNames`, `venueName`, `venueAddress`
- `eventStart` / `eventEnd` — used by the countdown and the calendar link.
  Format: `new Date(YYYY, MM, DD, HH, MM)` where **MM is 0-based** (0 = Jan, 8 = Sep).

Update the copy (story, program schedule, details, dress code) directly in
`index.html`.

## 2. Add the Save-the-Date video

Once your video is ready, upload it to YouTube (unlisted works fine) or Google
Drive, then set `saveTheDateVideoUrl` in `js/config.js` to the embed URL, e.g.
`https://www.youtube.com/embed/VIDEO_ID`. Until it's set, the site shows a
styled "coming soon" placeholder automatically.

## 3. Connect RSVP, Messages & Password (one Google Apps Script + Sheet)

RSVPs, the Messages-for-the-Couple wall, and the password gate all share a
**single Google Sheet** (two tabs: `RSVPs` and `Messages`) through **one
small free Google Apps Script** web app — no Google Form, no extra sheet,
no server needed.

1. Open the Google Sheet you want everything saved to (e.g. the one you
   already created for this project). Both tabs are created automatically
   the first time each is written to.
2. Open **Extensions → Apps Script**, delete any starter code, and paste in:

   ```javascript
   const RSVP_SHEET_NAME = "RSVPs";
   const MESSAGES_SHEET_NAME = "Messages";
   const FLIGHT_HELP_EMAIL = "judeaeddrian@gmail.com";
   const FLIGHT_HELP_YES = "Yes, please help me find a cheap flight";

   function doGet(e) {
     const rows = getSheet(MESSAGES_SHEET_NAME, ["Name", "Message", "Timestamp"])
       .getDataRange()
       .getValues()
       .slice(1); // skip header
     const messages = rows
       .filter(function (r) { return r[0] && r[1]; })
       .map(function (r) { return { name: r[0], message: r[1] }; })
       .reverse(); // newest first
     return jsonResponse(messages);
   }

   function doPost(e) {
     const data = JSON.parse(e.postData.contents);

     if (data.action === "checkPassword") {
       return jsonResponse({ ok: checkPassword(data.password) });
     }

     if (data.action === "message") {
       return saveMessage(data);
     }

     return saveRsvp(data);
   }

   function saveRsvp(data) {
     const flightHelp = (data.flightHelp || "").toString().trim();

     getSheet(RSVP_SHEET_NAME, [
       "Timestamp",
       "First Name",
       "Last Name",
       "Email",
       "Attending",
       "Flight Help",
       "Message",
     ]).appendRow([
       new Date(),
       (data.firstname || "").toString().trim(),
       (data.lastname || "").toString().trim(),
       (data.email || "").toString().trim(),
       (data.attending || "").toString().trim(),
       flightHelp,
       (data.message || "").toString().trim(),
     ]);

     if (flightHelp === FLIGHT_HELP_YES) {
       notifyJude(data);
     }

     return jsonResponse({ ok: true });
   }

   function saveMessage(data) {
     const name = (data.name || "A guest").toString().trim().slice(0, 100);
     const message = (data.message || "").toString().trim().slice(0, 1000);
     if (!message) return jsonResponse({ ok: false, error: "Empty message" });
     getSheet(MESSAGES_SHEET_NAME, ["Name", "Message", "Timestamp"]).appendRow([
       name,
       message,
       new Date(),
     ]);
     return jsonResponse({ ok: true });
   }

   function notifyJude(data) {
     const name = [
       (data.firstname || "").toString().trim(),
       (data.lastname || "").toString().trim(),
     ]
       .filter(Boolean)
       .join(" ") || "A guest";
     const email = (data.email || "").toString().trim() || "not provided";

     MailApp.sendEmail({
       to: FLIGHT_HELP_EMAIL,
       subject: "Flight help requested: " + name,
       body:
         name + " would like help finding a cheap flight for the wedding.\n\n" +
         "Guest email: " + email,
     });
   }

   function checkPassword(candidate) {
     const real = PropertiesService.getScriptProperties().getProperty("SITE_PASSWORD") || "";
     return !!real && (candidate || "").toString() === real;
   }

   function getSheet(name, headerRow) {
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     let sheet = ss.getSheetByName(name);
     if (!sheet) {
       sheet = ss.insertSheet(name);
       sheet.appendRow(headerRow);
     }
     return sheet;
   }

   function jsonResponse(obj) {
     return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
       ContentService.MimeType.JSON
     );
   }
   ```

3. Click **Deploy → New deployment**, select type **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, authorize the script, then copy the **Web app URL**
   (it ends in `/exec`).
5. Paste that **same URL** into `js/config.js` in all three places:
   `rsvpApi.url`, `messagesApi.url`, and `passwordApi.url`.

RSVPs land in the **RSVPs** tab and guest notes land in the **Messages**
tab, both auto-created on first write, newest rows at the bottom. If
`rsvpApi.url` is left unconfigured (`SCRIPT_ID`), the RSVP form shows a
"not connected yet" message instead of failing silently; if
`messagesApi.url` is left unconfigured, messages are only saved in each
guest's own browser (`localStorage`).

### Add the site password

The password gate keeps the invitation private, but a plain password stored
in `js/config.js` isn't real security — anyone can view page source and read
it. The `checkPassword` function pasted above already handles this
server-side, so the real password never ships to the browser — you just
need to set it:

1. In the Apps Script project from above: **Project Settings** (gear icon)
   → **Script Properties** → **Add script property** → name
   `SITE_PASSWORD`, value = the real password (never committed to this
   repo).
2. **Deploy → Manage deployments** → edit the existing deployment → under
   **Version** choose **New version** → **Deploy**, so the URL stays the
   same but picks up the change.

If `passwordApi.url` is left empty, the site falls back to comparing against
`localPassword` in `js/config.js` — fine for local testing, but not secure
for real guests since that value ships in plain text.

## 5. Google Maps

The venue map is an `<iframe>` in `index.html`. To change the location, edit the
`src` query in the map iframe and the `destination` in the **Get Directions**
link. For an API-key-based dynamic map you can swap in the
[Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started),
but the current embed needs **no API key**.

## 6. Google Calendar

Handled automatically in `js/main.js` from `eventStart` / `eventEnd` in the
config — no setup required.

## 7. Messages for the Couple (shared guest message wall)

The **Messages for the Couple** section (right under RSVP) shows every guest's
note to everyone who visits the site, newest first, in a scrollable block.
It's powered by the same Apps Script + Sheet set up in
[step 3](#3-connect-rsvp-messages--password-one-google-apps-script--sheet) —
there's nothing extra to deploy here.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Just
upload the folder contents.
