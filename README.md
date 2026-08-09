# — A Fairytale Wedding Invitation

A single-page, fully responsive, fairytale-themed wedding invitation with three
Google integrations:

- **Google Forms** — the RSVP form posts guest responses straight into a Google Form (and its linked Sheet).
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
    ├── config.js     # ← Edit this: names, dates, venue, Google Form IDs
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

## 3. Connect the RSVP (Google Forms)

1. Create a **Google Form** with fields matching the site: Name, Email,
   Attending, Guests, Meal, Message.
2. In the form editor, open the **⋮ menu → Get pre-filled link**.
3. Fill in each field with any placeholder text and click **Get link / Copy**.
4. The copied URL contains parameters like `entry.123456789=Placeholder`.
   Copy each `entry.XXXXXXXXX` id.
5. In `js/config.js`, set:
   - `googleForm.actionUrl` — your form URL with `/viewform` replaced by
     `/formResponse`.
   - `googleForm.entries` — map each site field to its matching `entry.` id.

That's it — responses land in the Form's **Responses** tab and any linked Sheet.

> The form submits via a hidden iframe, so guests stay on the page and see a
> friendly confirmation message.

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
