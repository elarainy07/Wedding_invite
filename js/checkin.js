/**
 * ============================================================
 *  GUEST CHECK-IN — reception QR scanner (coordinator tool)
 * ------------------------------------------------------------
 *  Powers checkin.html. Flow:
 *    1. Coordinator enters a PIN (verified server-side against
 *       the CHECKIN_PIN Script Property — never stored here).
 *    2. The phone's rear camera scans a guest's QR code, which
 *       encodes only an opaque GuestID.
 *    3. We look that ID up in the Google Sheet "Guests" tab and
 *       show name, group, seat and the couple's note.
 *    4. "Confirm arrived" marks CheckedIn + timestamp in the Sheet.
 *
 *  All requests hit the same Apps Script web app as the rest of
 *  the site (config.js -> checkinApi.url). text/plain bodies are
 *  used so Apps Script doesn't get a CORS preflight it can't answer.
 * ============================================================
 */
(function () {
    "use strict";

    var cfg = window.WEDDING_CONFIG || {};
    var apiUrl = ((cfg.checkinApi || {}).url || "").trim();
    var apiReady = !!apiUrl && apiUrl.indexOf("SCRIPT_ID") === -1;

    /* -------- Element refs -------- */
    var pinGate    = document.getElementById("pinGate");
    var pinForm    = document.getElementById("pinForm");
    var pinInput   = document.getElementById("pinInput");
    var pinBtn     = document.getElementById("pinBtn");
    var pinMsg     = document.getElementById("pinMsg");

    var scanCard   = document.getElementById("scanCard");
    var scanHint   = document.getElementById("scanHint");
    var countLabel = document.getElementById("countLabel");
    var lockBtn    = document.getElementById("lockBtn");

    var resultCard   = document.getElementById("resultCard");
    var resultStatus = document.getElementById("resultStatus");
    var resultBody   = document.getElementById("resultBody");
    var confirmBtn   = document.getElementById("confirmBtn");
    var confirmLabel = document.getElementById("confirmLabel");
    var scanNextBtn  = document.getElementById("scanNextBtn");

    var UNLOCK_KEY = "nj_checkin_unlocked";
    var COUNT_KEY  = "nj_checkin_count";

    var scanner = null;          // Html5Qrcode instance
    var scanning = false;
    var currentGuestId = null;   // ID of the guest shown in the result card
    var lastScanned = "";        // debounce repeated frames of the same code
    var lastScanAt = 0;

    /* ============================================================
     *  Small helpers
     * ========================================================== */
    function postJson(payload) {
        return fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
        }).then(function (res) { return res.json(); });
    }

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function show(el) { el.classList.remove("hidden"); }
    function hide(el) { el.classList.add("hidden"); }

    function getCount() {
        var n = parseInt(sessionStorage.getItem(COUNT_KEY) || "0", 10);
        return isNaN(n) ? 0 : n;
    }
    function setCount(n) {
        try { sessionStorage.setItem(COUNT_KEY, String(n)); } catch (e) {}
        countLabel.textContent = n;
    }

    /* ============================================================
     *  PIN gate
     * ========================================================== */
    if (!apiReady) {
        pinMsg.textContent =
            "Check-in isn't connected yet. Set checkinApi.url in js/config.js.";
        pinBtn.disabled = true;
        pinInput.disabled = true;
        return;
    }

    var alreadyUnlocked = false;
    try { alreadyUnlocked = sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) {}

    if (alreadyUnlocked) {
        enterScanner();
    } else {
        setTimeout(function () { pinInput.focus(); }, 150);
    }

    pinForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var pin = pinInput.value.trim();
        if (!pin) return;

        pinBtn.disabled = true;
        pinInput.disabled = true;
        pinMsg.className = "msg";
        pinMsg.textContent = "Checking\u2026";

        postJson({ action: "checkinAuth", pin: pin })
            .then(function (data) {
                if (data && data.ok) {
                    try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch (e) {}
                    enterScanner();
                } else {
                    pinBtn.disabled = false;
                    pinInput.disabled = false;
                    pinInput.value = "";
                    pinMsg.className = "msg msg--error";
                    pinMsg.textContent = "Incorrect PIN. Please try again.";
                    pinInput.focus();
                }
            })
            .catch(function () {
                pinBtn.disabled = false;
                pinInput.disabled = false;
                pinMsg.className = "msg msg--error";
                pinMsg.textContent = "Couldn't verify right now. Check your connection and try again.";
            });
    });

    lockBtn.addEventListener("click", function () {
        try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
        location.reload();
    });

    /* ============================================================
     *  Scanner
     * ========================================================== */
    function enterScanner() {
        hide(pinGate);
        show(scanCard);
        setCount(getCount());
        startScanner();
    }

    function startScanner() {
        if (typeof Html5Qrcode === "undefined") {
            scanHint.textContent =
                "Scanner library failed to load. Check the internet connection and reload.";
            return;
        }
        if (!scanner) scanner = new Html5Qrcode("reader");

        var config = { fps: 10, qrbox: { width: 240, height: 240 } };

        scanner
            .start({ facingMode: "environment" }, config, onScan, function () {})
            .then(function () { scanning = true; })
            .catch(function () {
                scanHint.textContent =
                    "Couldn't open the camera. Allow camera access in your browser and reload.";
            });
    }

    function pauseScanner() {
        if (scanner && scanning) {
            try { scanner.pause(true); } catch (e) {}
        }
    }

    function resumeScanner() {
        if (scanner && scanning) {
            try { scanner.resume(); } catch (e) {}
        }
    }

    function onScan(decodedText) {
        var now = Date.now();
        // Ignore the same code decoded repeatedly within a couple seconds.
        if (decodedText === lastScanned && now - lastScanAt < 2500) return;
        lastScanned = decodedText;
        lastScanAt = now;

        var guestId = decodedText.trim();
        if (!guestId) return;

        pauseScanner();
        lookupGuest(guestId);
    }

    /* ============================================================
     *  Lookup + result card
     * ========================================================== */
    function lookupGuest(guestId) {
        hide(scanCard);
        show(resultCard);
        currentGuestId = guestId;

        resultStatus.className = "result__status";
        resultStatus.textContent = "Looking up\u2026";
        resultBody.innerHTML = "";
        confirmBtn.classList.add("hidden");
        scanNextBtn.classList.add("hidden");

        postJson({ action: "lookup", id: guestId })
            .then(function (data) {
                if (!data || !data.found) {
                    renderMissing(guestId);
                    return;
                }
                renderGuest(data);
            })
            .catch(function () {
                resultStatus.className = "result__status result__status--missing";
                resultStatus.textContent = "Network error";
                resultBody.innerHTML =
                    '<p class="center" style="color:var(--muted)">Couldn\'t reach the guest list. Try scanning again.</p>';
                scanNextBtn.classList.remove("hidden");
            });
    }

    function renderMissing(guestId) {
        resultStatus.className = "result__status result__status--missing";
        resultStatus.textContent = "Not on the guest list";
        resultBody.innerHTML =
            '<p class="center" style="color:var(--muted)">This QR code (<code>' +
            esc(guestId) +
            '</code>) doesn\'t match a confirmed guest. Please check with the couple.</p>';
        confirmBtn.classList.add("hidden");
        scanNextBtn.classList.remove("hidden");
    }

    function renderGuest(g) {
        var name = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest";
        var alreadyIn = !!g.checkedIn;

        resultStatus.className =
            "result__status " +
            (alreadyIn ? "result__status--dupe" : "result__status--new");
        resultStatus.textContent = alreadyIn
            ? "Already checked in" + (g.checkInTime ? " \u00b7 " + g.checkInTime : "")
            : "Confirmed guest";

        var html = '<div class="guest-name">' + esc(name) + "</div>";
        if (g.group) {
            html += '<div class="center"><span class="badge">' + esc(g.group) + "</span></div>";
        }

        html += '<div class="info-rows">';
        if (g.seat) {
            html +=
                '<div class="info-row"><div class="k">Seat</div>' +
                '<div class="v"><span class="seat-big">' + esc(g.seat) + "</span></div></div>";
        }
        if (g.email) {
            html +=
                '<div class="info-row"><div class="k">Email</div>' +
                '<div class="v">' + esc(g.email) + "</div></div>";
        }
        html += "</div>";

        if (g.note) {
            html +=
                '<div class="note"><span class="note__label">Note from the couple</span>' +
                esc(g.note) + "</div>";
        }

        resultBody.innerHTML = html;

        if (alreadyIn) {
            confirmBtn.classList.add("hidden");
        } else {
            confirmBtn.classList.remove("hidden");
            confirmBtn.disabled = false;
            confirmLabel.textContent = "Confirm arrived";
        }
        scanNextBtn.classList.remove("hidden");
    }

    confirmBtn.addEventListener("click", function () {
        if (!currentGuestId) return;
        confirmBtn.disabled = true;
        confirmLabel.innerHTML = '<span class="spinner"></span> Saving';

        postJson({ action: "checkin", id: currentGuestId })
            .then(function (data) {
                if (data && data.ok) {
                    if (!data.alreadyCheckedIn) {
                        setCount(getCount() + 1);
                    }
                    resultStatus.className = "result__status result__status--new";
                    resultStatus.textContent =
                        "\u2713 Checked in" + (data.checkInTime ? " \u00b7 " + data.checkInTime : "");
                    confirmBtn.classList.add("hidden");
                    // Give the coordinator a beat to see the confirmation.
                    setTimeout(backToScanner, 1100);
                } else {
                    confirmBtn.disabled = false;
                    confirmLabel.textContent = "Try again";
                }
            })
            .catch(function () {
                confirmBtn.disabled = false;
                confirmLabel.textContent = "Try again";
            });
    });

    scanNextBtn.addEventListener("click", backToScanner);

    function backToScanner() {
        currentGuestId = null;
        lastScanned = "";
        hide(resultCard);
        show(scanCard);
        scanHint.textContent = "Point the camera at the guest's QR code\u2026";
        resumeScanner();
    }
})();
