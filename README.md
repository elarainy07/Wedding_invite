# — A Fairytale Wedding Invitation

A single-page, fully responsive, fairytale-themed wedding invitation with three
Google integrations:

- **Google Sheets (via Apps Script)** — the RSVP form, the Messages-for-the-Couple wall, and the guest check-in list all live in **one Google Sheet** (separate tabs: `RSVPs`, `Messages`, `Guests`), through a single Apps Script web app.
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

RSVPs, the Messages-for-the-Couple wall, the password gate, and the guest
check-in list all share a **single Google Sheet** (three tabs: `RSVPs`,
`Messages`, and `Guests`) through **one small free Google Apps Script** web
app — no Google Form, no extra sheet, no server needed.

1. Open the Google Sheet you want everything saved to (e.g. the one you
   already created for this project). The `RSVPs` and `Messages` tabs are
   created automatically the first time each is written to; the `Guests`
   tab is created automatically too, but see [step 8a](#8a-add-a-guests-tab-to-the-same-spreadsheet)
   before you rely on it — you'll want to fill it in with real guest rows.
2. Open **Extensions → Apps Script**, delete any starter code, and paste in:

   ```javascript
   const RSVP_SHEET_NAME = "RSVPs";
   const MESSAGES_SHEET_NAME = "Messages";
   const FLIGHT_HELP_EMAIL = "email_address";
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

## 4. Add / replace photos (use `.jpg`!)

**Always save photos as `.jpg` (JPEG), not `.png`.** PNG keeps every pixel
lossless, which is great for logos/icons but makes real photos huge — one
photo in this project was **8.9MB as a PNG**. The same photo as a JPG is
usually **150–300KB**, and no one can tell the difference on a phone or
browser screen.

- **Logos / icons with transparency** (e.g. `wedding_logo_transparent.png`) →
  keep as `.png`, they need the transparent background.
- **Everything else** (couple photos, venue photos, entourage group shot,
  dress code guide, background images) → **`.jpg`**.

Before committing a new photo, run it through the optimizer script so it's
resized and compressed automatically (same filename, so no HTML/CSS edits
needed):

```bash
# one-time setup
sudo apt install python3-pil

# after adding/replacing a photo in Pictures/
python3 scripts/optimize-images.py Pictures/your-photo.jpg
```

If you ever **replace** an existing photo with a new version under the same
filename, add a version query string to its `src` in the HTML (e.g.
`Pictures/dress_code.jpeg?v=2`) — otherwise returning visitors' browsers may
keep showing the old cached copy for up to a year.

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

### 8a. Add a `Guests` tab to the same spreadsheet

The `Guests` tab lives in the **same Google Sheet** as `RSVPs` and
`Messages` — one spreadsheet, one Apps Script, one deployment URL for
everything on the site. (If your coordinator only needs to scan QR codes,
they don't need Sheet access at all — `checkin.html` + the PIN is all
they use. Only give them **Editor** access to the whole spreadsheet if you
want them editing seats/notes/groups directly in the Sheet, in which case
they'll also be able to see the `RSVPs` and `Messages` tabs.)

1. In the same Google Sheet used for `RSVPs`/`Messages`, add a new tab and
   rename it to **`Guests`** (it's also created automatically, with the
   header row below, the first time the script writes to it — but create
   it up front if you want to fill it in manually before the RSVP
   deadline).
2. Give it these column headers in row 1 (the order matters — the script
   reads by position):

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
deadline (copy names/emails over, then add IDs, seats, groups and notes) —
just paste them into the `Guests` tab in the same spreadsheet, right next
to `RSVPs` and `Messages`.

> **Migrating from a previous separate Guests spreadsheet?** Open the old
> Guests spreadsheet, select all its data (including the header row), copy
> it, then paste it into the new `Guests` tab in the main spreadsheet. Once
> confirmed, you can delete the old spreadsheet (or keep it as a backup) —
> the Apps Script below no longer reads from it.

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

Route the check-in actions in `doPost` (add these `if` blocks **above** the
final `return saveRsvp(data);` line):

```javascript
   if (data.action === "checkinAuth") {
     return jsonResponse({ ok: checkinPinOk(data.pin) });
   }

   // checkinApi.url is public in js/config.js, so every action below that
   // reads or writes guest data must re-verify the PIN itself — a
   // client-side "unlocked" flag is never proof of authorization on its own.
   if (data.action === "lookup" || data.action === "checkin" ||
       data.action === "checkinCount" || data.action === "guestList") {
     if (!checkinPinOk(data.pin)) {
       return jsonResponse({ error: "unauthorized" });
     }
   }

   if (data.action === "lookup") {
     return jsonResponse(lookupGuest(data.id));
   }

   if (data.action === "checkin") {
     return jsonResponse(checkinGuest(data.id));
   }

   if (data.action === "checkinCount") {
     return jsonResponse({ count: countCheckedIn() });
   }

   if (data.action === "guestList") {
     return jsonResponse({ guests: listGuests() });
   }
```

Then paste these helper functions into the same script:

```javascript
const GUESTS_SHEET_NAME = "Guests";
// Column order in the Guests tab (1-based).
const GUEST_COLS = {
  id: 1, first: 2, last: 3, email: 4,
  group: 5, seat: 6, note: 7, checkedIn: 8, checkInTime: 9, qrSent: 10,
};
// NOTE: GUEST_COLS must include qrSent: 10 or emailGuestQRCodes()
// throws "getRange (number,null)" when it reads/writes that column.

// Opens the Guests tab in the same spreadsheet as RSVPs/Messages.
function getGuestsSheet() {
  return getSheet(GUESTS_SHEET_NAME, [
    "GuestID", "First Name", "Last Name", "Email",
    "Group", "Seat", "Note", "CheckedIn", "CheckInTime", "QR Sent",
  ]);
}

function checkinPinOk(candidate) {
  const real = PropertiesService.getScriptProperties().getProperty("CHECKIN_PIN") || "";
  return !!real && (candidate || "").toString() === real;
}

const GUESTS_CACHE_KEY = "guests_data_v1";
const GUESTS_CACHE_TTL_SEC = 30; // short-lived; a check-in always invalidates it immediately

// Reads the whole Guests tab once per cache window instead of on every
// request. lookup/guestList/checkinCount all read from this in-memory
// snapshot, which is what actually makes the scanner and guest list feel
// fast — each SpreadsheetApp call is a network round trip on Google's end,
// and this cuts that down to (at most) one per 30s per Apps Script instance.
function getGuestsData_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(GUESTS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const sheet = getGuestsSheet();
  const last = sheet.getLastRow();
  const rows = last < 2 ? [] : sheet.getRange(2, 1, last - 1, 9).getValues();
  const data = rows
    .filter(function (r) { return (r[GUEST_COLS.id - 1] || "").toString().trim(); })
    .map(function (r) { return { values: r }; });

  cache.put(GUESTS_CACHE_KEY, JSON.stringify(data), GUESTS_CACHE_TTL_SEC);
  return data;
}

function invalidateGuestsCache_() {
  CacheService.getScriptCache().remove(GUESTS_CACHE_KEY);
}

function findGuestEntry_(id) {
  const wanted = (id || "").toString().trim();
  if (!wanted) return null;
  const data = getGuestsData_();
  for (let i = 0; i < data.length; i++) {
    if ((data[i].values[GUEST_COLS.id - 1] || "").toString().trim() === wanted) return data[i];
  }
  return null;
}

function lookupGuest(id) {
  const entry = findGuestEntry_(id);
  if (!entry) return { found: false };

  const values = entry.values;
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
  // Check-ins are writes, so they always go straight to the sheet (never
  // the cache) and take a lock — two coordinator phones could otherwise
  // both read "not checked in" for the same guest at the same instant.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = getGuestsSheet();
    const wanted = (id || "").toString().trim();
    const last = sheet.getLastRow();
    if (!wanted || last < 2) return { ok: false };

    const ids = sheet.getRange(2, GUEST_COLS.id, last - 1, 1).getValues();
    let row = -1;
    for (let i = 0; i < ids.length; i++) {
      if ((ids[i][0] || "").toString().trim() === wanted) { row = i + 2; break; }
    }
    if (row === -1) return { ok: false };

    const already = !!sheet.getRange(row, GUEST_COLS.checkedIn).getValue();
    if (!already) {
      const now = new Date();
      sheet.getRange(row, GUEST_COLS.checkedIn).setValue(true);
      sheet.getRange(row, GUEST_COLS.checkInTime).setValue(now);
      invalidateGuestsCache_();
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
  } finally {
    lock.releaseLock();
  }
}

// Shared checked-in total, read straight from the Sheet so every
// coordinator's phone shows the same live number (see 8e).
function countCheckedIn() {
  const data = getGuestsData_();
  let n = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].values[GUEST_COLS.checkedIn - 1]) n++;
  }
  return n;
}

// Returns the whole guest list (name, group, seat, status, email, note) so
// the coordinator page can show it, do manual check-ins by tapping a name,
// and render QR scan results instantly from its own local copy of this list.
function listGuests() {
  const data = getGuestsData_();
  return data.map(function (entry) {
    const r = entry.values;
    const t = r[GUEST_COLS.checkInTime - 1];
    return {
      id:        (r[GUEST_COLS.id - 1] || "").toString().trim(),
      firstName: r[GUEST_COLS.first - 1],
      lastName:  r[GUEST_COLS.last - 1],
      email:     r[GUEST_COLS.email - 1],
      group:     r[GUEST_COLS.group - 1],
      seat:      r[GUEST_COLS.seat - 1],
      note:      r[GUEST_COLS.note - 1],
      checkedIn: !!r[GUEST_COLS.checkedIn - 1],
      checkInTime: t ? Utilities.formatDate(new Date(t), "Asia/Manila", "h:mm a") : "",
    };
  });
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
too. The counter reads the shared total straight from the Sheet and re-syncs
every few seconds, so multiple coordinators scanning at once all see the same
accurate number in real time (and it stays correct if anyone closes and
reopens the page). Because the page is never linked from the guest invitation,
only people with the URL **and** the PIN can use it.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Just
upload the folder contents.
