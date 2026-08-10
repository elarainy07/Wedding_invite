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
├── checkin.html      # Private coordinator QR check-in page (not linked from the site)
├── css/style.css     # All styling
└── js/
    ├── config.js     # ← Edit this: names, dates, venue, Apps Script URLs
    ├── main.js       # Countdown, animations, calendar + RSVP logic
    └── checkin.js    # Reception QR scanner (camera + lookup/check-in)
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

## 8. Guest check-in (QR scanner)

`checkin.html` is a **private, coordinator-only** page (not linked from the
guest site) for the reception registration desk. Your coordinator opens it on
a phone, enters a PIN, then uses the phone camera to scan each guest's QR
code. The page shows the guest's name, group, seat and the couple's note, with
a **Confirm arrived** button that marks them checked in — all in the same
Google Sheet, no hardware scanner or app install needed. It's backed by the
same Apps Script web app; just set `checkinApi.url` in `js/config.js` to the
same `/exec` URL as everything else.

### 8a. Create a separate Guests spreadsheet

The `Guests` tab lives in its **own Google Sheet**, separate from the RSVPs/
Messages Sheet. That way you can share it directly with your coordinator
(edit access, if you want them adding seats/notes themselves) without giving
them access to guest RSVP messages.

1. Create a new, blank Google Sheet (e.g. name it "Wedding Guests &
   Check-in").
2. Rename its first tab to **`Guests`** with these column headers in row 1
   (the order matters — the script reads by position):

| GuestID | First Name | Last Name | Email | Group | Seat | Note | CheckedIn | CheckInTime | QR Sent |
| ------- | ---------- | --------- | ----- | ----- | ---- | ---- | --------- | ----------- | ------- |

- **GuestID** — a random, opaque token per guest (e.g. `g_8f3a1c…`). This is
  what gets encoded in the QR code. Never use the guest's name/email as the ID,
  and don't use sequential numbers (so a stray QR photo can't be guessed or
  incremented into someone else's record).
- **Group** — e.g. `Family`, `College Friends`, `HS Friends`, `Work`,
  `Entourage` (free text; shown as a badge).
- **Seat** — table/seat label shown large on screen.
- **Note** — a short line from the couple shown to the coordinator.
- **CheckedIn** / **CheckInTime** — leave blank; the scanner fills these in.
- **QR Sent** — leave blank; `emailGuestQRCodes` (below) marks it once that
  guest's QR email goes out, so re-running the function never double-emails
  anyone.

You can build this tab from your confirmed **RSVPs** rows after the RSVP
deadline (copy names/emails over, then add IDs, seats, groups and notes).

3. Open the new Sheet's URL and copy its **spreadsheet ID** — the long string
   between `/d/` and `/edit`, e.g.
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`.
4. Paste that ID into `GUESTS_SPREADSHEET_ID` in the Apps Script (added in
   [8c](#8c-add-the-check-in-logic-to-the-same-apps-script) below). The Apps
   Script project itself stays attached to (or standalone alongside) the
   original RSVP/Messages Sheet — it just opens the Guests Sheet by ID.
5. If your coordinator needs to edit seats/notes/groups directly, share this
   new Sheet with them (**Share** → their email → **Editor**). They don't
   need any access to the RSVP/Messages Sheet.

> ⚠️ **Don't generate GuestID with a formula like
> `="g_"&ROW()&"_"&RANDBETWEEN(100000,999999)`.** `RANDBETWEEN` is volatile —
> it recalculates (and produces a *new* random number) on every edit anywhere
> in the spreadsheet or whenever the sheet is reopened. That silently changes
> the ID after it's already been baked into an emailed QR code, so the
> scanner reports "not on the guest list" for a guest who genuinely RSVP'd.
> Use the formula once to generate an ID, then immediately freeze the whole
> column to plain text by running this from the Apps Script editor:
>
> ```javascript
> function freezeGuestIds() {
>   const sheet = getGuestsSheet();
>   const last = sheet.getLastRow();
>   if (last < 2) return;
>   const range = sheet.getRange(2, GUEST_COLS.id, last - 1, 1);
>   range.setValues(range.getValues()); // evaluate formulas once, write back as static text
> }
> ```
>
> Run `freezeGuestIds` **before** `emailGuestQRCodes`, and again any time you
> add new rows with the formula. If a QR was already emailed before freezing
> and no longer matches, clear that guest's `CheckedIn`, `CheckInTime` and
> `QR Sent` cells and re-run `emailGuestQRCodes` to resend a corrected QR.

### 8b. Set the coordinator PIN

Like the site password, the check-in PIN is verified server-side and never
ships in the repo:

1. In the same Apps Script project: **Project Settings** (gear) → **Script
   Properties** → **Add script property** → name `CHECKIN_PIN`, value = a PIN
   you give only to your coordinator.
2. Redeploy with a **New version** (**Deploy → Manage deployments** → edit →
   New version) so the change goes live on the same URL.

### 8c. Add the check-in logic to the same Apps Script

Route the three new actions in `doPost` (add these `if` blocks **above** the
final `return saveRsvp(data);` line):

```javascript
   if (data.action === "checkinAuth") {
     return jsonResponse({ ok: checkinPinOk(data.pin) });
   }

   if (data.action === "lookup") {
     return jsonResponse(lookupGuest(data.id));
   }

   if (data.action === "checkin") {
     return jsonResponse(checkinGuest(data.id));
   }
```

Then paste these helper functions into the same script:

```javascript
// Spreadsheet ID of the separate Guests Sheet (from its URL, between /d/ and /edit).
const GUESTS_SPREADSHEET_ID = "PASTE_YOUR_GUESTS_SHEET_ID_HERE";
const GUESTS_SHEET_NAME = "Guests";
// Column order in the Guests tab (1-based).
const GUEST_COLS = {
  id: 1, first: 2, last: 3, email: 4,
  group: 5, seat: 6, note: 7, checkedIn: 8, checkInTime: 9, qrSent: 10,
};
// NOTE: GUEST_COLS must include qrSent: 10 or emailGuestQRCodes()
// throws "getRange (number,null)" when it reads/writes that column.

// Opens the Guests tab in the separate Guests spreadsheet (not the RSVP/Messages one).
function getGuestsSheet() {
  const ss = SpreadsheetApp.openById(GUESTS_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(GUESTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(GUESTS_SHEET_NAME);
    sheet.appendRow([
      "GuestID", "First Name", "Last Name", "Email",
      "Group", "Seat", "Note", "CheckedIn", "CheckInTime", "QR Sent",
    ]);
  }
  return sheet;
}

function checkinPinOk(candidate) {
  const real = PropertiesService.getScriptProperties().getProperty("CHECKIN_PIN") || "";
  return !!real && (candidate || "").toString() === real;
}

function findGuestRow(sheet, id) {
  const wanted = (id || "").toString().trim();
  if (!wanted) return -1;
  const ids = sheet.getRange(2, GUEST_COLS.id, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if ((ids[i][0] || "").toString().trim() === wanted) return i + 2; // 1-based, skip header
  }
  return -1;
}

function lookupGuest(id) {
  const sheet = getGuestsSheet();
  const row = findGuestRow(sheet, id);
  if (row === -1) return { found: false };

  const values = sheet.getRange(row, 1, 1, 9).getValues()[0];
  return {
    found: true,
    firstName: values[GUEST_COLS.first - 1],
    lastName:  values[GUEST_COLS.last - 1],
    email:     values[GUEST_COLS.email - 1],
    group:     values[GUEST_COLS.group - 1],
    seat:      values[GUEST_COLS.seat - 1],
    note:      values[GUEST_COLS.note - 1],
    checkedIn: !!values[GUEST_COLS.checkedIn - 1],
    checkInTime: values[GUEST_COLS.checkInTime - 1]
      ? Utilities.formatDate(new Date(values[GUEST_COLS.checkInTime - 1]),
          "Asia/Manila", "h:mm a")
      : "",
  };
}

function checkinGuest(id) {
  const sheet = getGuestsSheet();
  const row = findGuestRow(sheet, id);
  if (row === -1) return { ok: false };

  const already = !!sheet.getRange(row, GUEST_COLS.checkedIn).getValue();
  if (!already) {
    const now = new Date();
    sheet.getRange(row, GUEST_COLS.checkedIn).setValue(true);
    sheet.getRange(row, GUEST_COLS.checkInTime).setValue(now);
    return {
      ok: true, alreadyCheckedIn: false,
      checkInTime: Utilities.formatDate(now, "Asia/Manila", "h:mm a"),
    };
  }
  const prev = sheet.getRange(row, GUEST_COLS.checkInTime).getValue();
  return {
    ok: true, alreadyCheckedIn: true,
    checkInTime: prev ? Utilities.formatDate(new Date(prev), "Asia/Manila", "h:mm a") : "",
  };
}
```

Redeploy a **New version** so the endpoints go live.

### 8d. Generate & email each guest their QR code

Once the `Guests` tab is filled in (IDs + emails), run this function from the
Apps Script editor (select `emailGuestQRCodes` in the toolbar → **Run**,
authorize when prompted). It creates a QR image encoding each guest's
`GuestID` and emails it to them:

```javascript
function emailGuestQRCodes() {
  // 190 covers the full guest list in one run on a Workspace account
  // (1,500/day quota). On personal @gmail.com (100/day), Apps Script
  // stops mid-run once the quota is hit — the try/catch below catches
  // that so the run ends cleanly instead of crashing.
  const BATCH_LIMIT = 190;

  const sheet = getGuestsSheet();
  const last = sheet.getLastRow();
  let sent = 0;

  for (let row = 2; row <= last && sent < BATCH_LIMIT; row++) {
    const id      = (sheet.getRange(row, GUEST_COLS.id).getValue() || "").toString().trim();
    const email   = (sheet.getRange(row, GUEST_COLS.email).getValue() || "").toString().trim();
    const first   = (sheet.getRange(row, GUEST_COLS.first).getValue() || "").toString().trim();
    const qrSent  = sheet.getRange(row, GUEST_COLS.qrSent).getValue();
    if (!id || !email || qrSent) continue; // skip incomplete rows + already-emailed guests

    // Render the QR as a PNG via a public QR image endpoint.
    const url = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" +
      encodeURIComponent(id);
    const qrPng = UrlFetchApp.fetch(url).getBlob().setName("wedding-checkin-qr.png");

    try {
      MailApp.sendEmail({
        to: email,
        subject: "Your wedding check-in QR code — Jude & Nica",
        htmlBody:
          "<p>Hi " + first + ",</p>" +
          "<p>Your RSVP is confirmed — we can't wait to celebrate with you!</p>" +
          "<p><b>Saturday, January 23, 2027</b><br>" +
          "Ceremony: 3:00 PM — San Antonio de Padua Chapel, Tagaytay City, Cavite<br>" +
          "Reception: 7:30 PM — Alta D&#39; Tagaytay, Tagaytay City, Cavite</p>" +
          "<p>Please <b>save the attached QR code</b> and show it at the reception " +
          "registration desk so we can check you in quickly.</p>" +
          "<p>With love,<br>Jude &amp; Nica</p>",
        attachments: [qrPng],
      });
    } catch (err) {
      // Daily email quota reached — stop here, already-sent guests stay
      // marked, and the rest go out next time the function is run.
      Logger.log("Stopped after " + sent + " emails: " + err.message);
      return;
    }

    sheet.getRange(row, GUEST_COLS.qrSent).setValue(true);
    sent++;
    Utilities.sleep(300); // be gentle on quotas
  }

  Logger.log("Sent " + sent + " QR emails this run.");
}
```

> Update the date/venue/time lines above if these ever change — they're
> plain text in the script, not pulled from `js/config.js` (Apps Script
> can't read that file).

**Quotas:** personal `@gmail.com` accounts get **100 email recipients/day**;
Google Workspace accounts get 1,500/day. On a Workspace account, one run
sends all ~190 guests. On personal Gmail, the run stops itself cleanly
around 100 (via the `try/catch`) and marks each sent guest `QR Sent`; just
**run the function again the next day** (quota resets daily) to send the
rest — already-sent guests are skipped automatically. Check your remaining
quota anytime by running `Logger.log(MailApp.getRemainingDailyQuota())` in
the editor.

### 8e. Use it on the day

Deploy the site (below), open `checkin.html` on the coordinator's phone (e.g.
`https://your-site/checkin.html`), enter the PIN, allow camera access, and
scan away. The **Checked in** counter and every guest's `CheckedIn` /
`CheckInTime` update live in the Sheet, so you can watch arrivals from a laptop
too. Because the page is never linked from the guest invitation, only people
with the URL **and** the PIN can use it.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Just
upload the folder contents.
