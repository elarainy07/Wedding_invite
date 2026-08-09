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
     *  Set to "" to disable password protection.
     * ----------------------------------------------------- */
    sitePassword: "Cats123", // e.g. "jude2027"

    /* -------------------------------------------------------
     *  BACKGROUND MUSIC
     * -------------------------------------------------------
     *  Path to your audio file (mp3 / ogg recommended).
     *  e.g. "music/our-song.mp3"
     *  Set to "" to disable background music.
     * ----------------------------------------------------- */
    bgMusicUrl: "music/Be-Our-Guest.mp3", // e.g. "music/our-song.mp3"

    /* -------------------------------------------------------
     *  GOOGLE FORM (RSVP) INTEGRATION
     * -------------------------------------------------------
     *  1. Create a Google Form with the questions you want.
     *  2. Click the three-dot menu -> "Get pre-filled link".
     *  3. Fill each field with a placeholder and copy the link.
     *     You'll see parameters like:  entry.123456789=Sample
     *  4. Match each form field to your Google Form's entry ID
     *     below. The action URL is your form's URL with
     *     "/viewform" replaced by "/formResponse".
     * ----------------------------------------------------- */
    googleForm: {
        // Replace FORM_ID with your real form id.
        actionUrl:
            "https://docs.google.com/forms/d/e/FORM_ID/formResponse",

        // Map the site's fields -> your Google Form entry IDs.
        entries: {
            name: "entry.1111111111",
            email: "entry.2222222222",
            attending: "entry.3333333333",
            flightHelp: "entry.4444444444",
            message: "entry.6666666666",
        },
    },

    /* -------------------------------------------------------
     *  MESSAGES FOR THE COUPLE — shared guest message wall
     * -------------------------------------------------------
     *  Powers the "Messages for the Couple" section so every
     *  guest (not just the one who submitted) can see all the
     *  notes. Backed by a small Google Apps Script "web app" that
     *  reads/writes a Google Sheet — free, and no server needed.
     *
     *  Setup:
     *  1. Go to https://sheet.new to create a blank Google Sheet.
     *  2. Extensions -> Apps Script, delete any starter code, and
     *     paste in the contents of the Apps Script snippet from
     *     the project notes / README.
     *  3. Click Deploy -> New deployment -> select type "Web app".
     *     - Execute as: Me
     *     - Who has access: Anyone
     *  4. Click Deploy, authorize it, then copy the Web App URL
     *     (it ends in /exec) and paste it below.
     *
     *  If left as "SCRIPT_ID" (unconfigured), the site falls back
     *  to saving messages only in each guest's own browser.
     * ----------------------------------------------------- */
    messagesApi: {
        url: "https://script.google.com/macros/s/AKfycbynH-BMdw3l2ytY4glQ3mkoRXWA80TKZ83_N3aXwfinBFLqlET1UP4-HM1uI6DXp9lS/exec",
    },
};

