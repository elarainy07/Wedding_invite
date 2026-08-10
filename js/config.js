/**
 * ============================================================
 *  WEDDING SITE CONFIGURATION
 * ------------------------------------------------------------
 *  Edit the values below to make this invitation your own.
 *  No other file needs to change for the Google integrations
 *  to work.
 * ============================================================
 */
window.WEDDING_CONFIG = {
    /* -------- Couple & event basics -------- */
    coupleNames: "Jude & Nica",

    /* Ceremony start — fixed to Manila time (UTC+8).
       3:00 PM Manila = 07:00 UTC | 11:00 PM Manila = 15:00 UTC */
    eventStart: new Date('2027-01-23T07:00:00Z'), // Jan 23 2027, 3:00 PM Manila
    eventEnd:   new Date('2027-01-23T15:00:00Z'), // Jan 23 2027, 11:00 PM Manila

    venueName: "San Antonio de Padua Chapel",
    venueAddress: "Tagaytay City, Cavite, Philippines",

    /* -------------------------------------------------------
     *  SAVE THE DATE VIDEO
     * -------------------------------------------------------
     *  Paste a YouTube (or Google Drive) embed URL here once
     *  the video is ready. Until then, the site shows a
     *  "coming soon" placeholder automatically.
     * ----------------------------------------------------- */
    saveTheDateVideoUrl: "https://www.youtube.com/embed/LCtxTeWFkQg", // e.g. "https://www.youtube.com/embed/VIDEO_ID"

    /* -------------------------------------------------------
     *  SITE PASSWORD
     * -------------------------------------------------------
     *  Guests must enter this password to view the invitation.
     *
     *  This is a static site, so anything stored in this file is
     *  visible to anyone who views source — a plaintext password
     *  here isn't real security. Instead, the password is checked
     *  server-side by the same Apps Script used for RSVPs and
     *  Messages (see the README, "Connect RSVP, Messages &
     *  Password" section):
     *    1. In that project's Project Settings -> Script
     *       Properties, add SITE_PASSWORD with the real password
     *       as the value (never committed to this repo).
     *    2. Set passwordApi.url below (same URL as rsvpApi.url
     *       and messagesApi.url — it's all one script + sheet).
     *
     *  Set passwordApi.url to "" to disable password protection.
     * ----------------------------------------------------- */
    passwordApi: {
        url: "https://script.google.com/macros/s/AKfycbzNawltDJHHztVGMs4Xyr8p6kPPG5uLpZWoibeyt6PsDvPtIko4NKDCBZxEBq4wxIWH/exec",
    },

    /* Insecure local fallback — only used when passwordApi.url above is
       left empty. Anyone can read this value in this file, so it's meant
       for local testing only, never for a real guest-facing password. */
    localPassword: "",

    /* -------------------------------------------------------
     *  BACKGROUND MUSIC
     * -------------------------------------------------------
     *  Path to your audio file (mp3 / ogg recommended).
     *  e.g. "music/our-song.mp3"
     *  Set to "" to disable background music.
     * ----------------------------------------------------- */
    bgMusicUrl: "music/Be-Our-Guest.mp3", // e.g. "music/our-song.mp3"

    /* -------------------------------------------------------
     *  RSVP + MESSAGES + PASSWORD — one Google Apps Script & Sheet
     * -------------------------------------------------------
     *  RSVPs and Messages-for-the-Couple both post into the same
     *  Google Sheet (different tabs: "RSVPs" and "Messages") via
     *  one small Google Apps Script "web app" — no Google Form,
     *  no separate sheet, no server needed.
     *
     *  Setup:
     *  1. Open (or create) the single Google Sheet you want RSVPs
     *     and Messages to land in.
     *  2. Extensions -> Apps Script, delete any starter code, and
     *     paste in the combined Apps Script snippet from the
     *     README ("Connect RSVP, Messages & Password" section).
     *  3. Deploy -> New deployment -> type "Web app".
     *     - Execute as: Me
     *     - Who has access: Anyone
     *  4. Copy the Web App URL (ends in /exec) and paste it below
     *     as rsvpApi.url, messagesApi.url, and passwordApi.url —
     *     all three should be the exact same URL.
     *
     *  If left as "SCRIPT_ID" (unconfigured), submitting the RSVP
     *  form shows a "not connected yet" message instead of failing
     *  silently.
     * ----------------------------------------------------- */
    rsvpApi: {
        url: "https://script.google.com/macros/s/AKfycbzNawltDJHHztVGMs4Xyr8p6kPPG5uLpZWoibeyt6PsDvPtIko4NKDCBZxEBq4wxIWH/exec",
    },

    /* -------------------------------------------------------
     *  MESSAGES FOR THE COUPLE — shared guest message wall
     * -------------------------------------------------------
     *  Powers the "Messages for the Couple" section so every
     *  guest (not just the one who submitted) can see all the
     *  notes. Backed by the same Apps Script "web app" and Sheet
     *  configured above as rsvpApi — set this to the identical
     *  URL, it just writes to the "Messages" tab instead.
     *
     *  If left as "SCRIPT_ID" (unconfigured), the site falls back
     *  to saving messages only in each guest's own browser.
     * ----------------------------------------------------- */
    messagesApi: {
        url: "https://script.google.com/macros/s/AKfycbzNawltDJHHztVGMs4Xyr8p6kPPG5uLpZWoibeyt6PsDvPtIko4NKDCBZxEBq4wxIWH/exec",
    },
};

