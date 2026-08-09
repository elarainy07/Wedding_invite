# — A Fairytale Wedding Invitation

A single-page, fully responsive, fairytale-themed wedding invitation with three
Google integrations:

- **Google Sheets (via Apps Script)** — the RSVP form posts guest responses straight into a Google Sheet.
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

## 3. Connect the RSVP (Google Apps Script + Sheet)

RSVPs post straight into a Google Sheet via a small free **Google Apps
Script** web app — same approach as the Messages wall in step 6, no Google
Form needed.

1. Open the Google Sheet you want RSVPs saved to (e.g. the one you already
   created for this project).
2. Open **Extensions → Apps Script**, delete any starter code, and paste in:

   ```javascript
   const SHEET_NAME = "RSVPs";

   function doPost(e) {
     const data = JSON.parse(e.postData.contents);
     getSheet().appendRow([
       new Date(),
       (data.firstname || "").toString().trim(),
       (data.lastname || "").toString().trim(),
       (data.email || "").toString().trim(),
       (data.attending || "").toString().trim(),
       (data.flightHelp || "").toString().trim(),
       (data.message || "").toString().trim(),
     ]);
     return jsonResponse({ ok: true });
   }

   function getSheet() {
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     let sheet = ss.getSheetByName(SHEET_NAME);
     if (!sheet) {
       sheet = ss.insertSheet(SHEET_NAME);
       sheet.appendRow([
         "Timestamp",
         "First Name",
         "Last Name",
         "Email",
         "Attending",
         "Flight Help",
         "Message",
       ]);
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
5. Paste it into `js/config.js` as `rsvpApi.url`.

Responses land in the sheet's **RSVPs** tab, newest at the bottom. If
`rsvpApi.url` is left unconfigured (`SCRIPT_ID`), the RSVP form shows a
"not connected yet" message instead of failing silently.

## 4. Google Maps

The venue map is an `<iframe>` in `index.html`. To change the location, edit the
`src` query in the map iframe and the `destination` in the **Get Directions**
link. For an API-key-based dynamic map you can swap in the
[Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started),
but the current embed needs **no API key**.

## 5. Google Calendar

Handled automatically in `js/main.js` from `eventStart` / `eventEnd` in the
config — no setup required.

## 6. Messages for the Couple (shared guest message wall)

The **Messages for the Couple** section (right under RSVP) shows every guest's
note to everyone who visits the site, newest first, in a scrollable block. It's
powered by a small free **Google Apps Script** web app backed by a Google
Sheet — no server needed.

1. Go to [sheet.new](https://sheet.new) to create a blank Google Sheet.
2. Open **Extensions → Apps Script**, delete any starter code, and paste in:

   ```javascript
   const SHEET_NAME = "Messages";

   function doGet(e) {
     const sheet = getSheet();
     const rows = sheet.getDataRange().getValues().slice(1); // skip header
     const messages = rows
       .filter(function (r) { return r[0] && r[1]; })
       .map(function (r) { return { name: r[0], message: r[1] }; })
       .reverse(); // newest first
     return jsonResponse(messages);
   }

   function doPost(e) {
     const data = JSON.parse(e.postData.contents);
     const name = (data.name || "A guest").toString().trim().slice(0, 100);
     const message = (data.message || "").toString().trim().slice(0, 1000);
     if (!message) return jsonResponse({ ok: false, error: "Empty message" });
     getSheet().appendRow([name, message, new Date()]);
     return jsonResponse({ ok: true });
   }

   function getSheet() {
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     let sheet = ss.getSheetByName(SHEET_NAME);
     if (!sheet) {
       sheet = ss.insertSheet(SHEET_NAME);
       sheet.appendRow(["Name", "Message", "Timestamp"]);
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
5. Paste it into `js/config.js` as `messagesApi.url`.

If `messagesApi.url` is left unconfigured, the site quietly falls back to
saving messages only in each guest's own browser (`localStorage`), so nothing
breaks — but only that guest will see their own notes.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Just
upload the folder contents.
