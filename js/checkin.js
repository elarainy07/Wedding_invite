/**
 * ============================================================
 *  GUEST CHECK-IN — reception QR scanner (coordinator tool)
 * ------------------------------------------------------------
 *  Powers checkin.html. Flow:
 *    1. Coordinator enters a PIN, verified server-side against the
 *       CHECKIN_PIN Script Property. It's kept in sessionStorage
 *       (cleared on lock/tab close) and sent with every guest-data
 *       request below, since the server re-checks it on each one —
 *       checkinApi.url is public in js/config.js, so a client-side
 *       "unlocked" flag alone can't gate access to guest data.
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
    var listBtn    = document.getElementById("listBtn");

    var listCard        = document.getElementById("listCard");
    var listCloseBtn    = document.getElementById("listCloseBtn");
    var listSearch      = document.getElementById("listSearch");
    var listCountLabel  = document.getElementById("listCountLabel");
    var listTotalLabel  = document.getElementById("listTotalLabel");
    var guestListEl     = document.getElementById("guestList");
    var listFilters     = listCard ? listCard.querySelectorAll(".chip") : [];

    var resultCard   = document.getElementById("resultCard");
    var resultStatus = document.getElementById("resultStatus");
    var resultBody   = document.getElementById("resultBody");
    var confirmBtn   = document.getElementById("confirmBtn");
    var confirmLabel = document.getElementById("confirmLabel");
    var scanNextBtn  = document.getElementById("scanNextBtn");

    var UNLOCK_KEY = "nj_checkin_pin";  // sessionStorage key holding the entered PIN itself
    var COUNT_POLL_MS = 8000;    // how often to re-sync the shared count
    var GUEST_POLL_MS = 20000;   // how often to quietly refresh the cached roster

    var scanner = null;          // Html5Qrcode instance
    var scanning = false;
    var currentGuestId = null;   // ID of the guest shown in the result card
    var lastScanned = "";        // debounce repeated frames of the same code
    var lastScanAt = 0;
    var countTimer = null;       // interval handle for live count polling
    var guestTimer = null;       // interval handle for background roster refresh

    var allGuests = [];          // full guest list, cached for search/filter
    var guestIndex = {};         // id -> guest, for instant local lookup on scan
    var listFilter = "all";      // "all" | "pending" | "in"
    var listQuery = "";          // current search text

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

    // The PIN itself (not just a boolean) is kept so every request below can
    // prove it to the server — checkinApi.url is public in js/config.js, so
    // the server must re-check the PIN on every guest-data action, not just
    // trust that this page happened to show the scanner.
    function storedPin() {
        try { return sessionStorage.getItem(UNLOCK_KEY) || ""; } catch (e) { return ""; }
    }

    // Wraps postJson for actions that require the coordinator PIN.
    function postSecure(payload) {
        payload.pin = storedPin();
        return postJson(payload).then(function (data) {
            if (data && data.error === "unauthorized") {
                forceRelock();
            }
            return data;
        });
    }

    // The server rejected our stored PIN (changed, expired, or tampered
    // sessionStorage) — send the coordinator back to the PIN gate.
    function forceRelock() {
        try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
        location.reload();
    }

    // The checked-in total is shared across every coordinator's device, so it
    // lives in the Google Sheet — not in this browser. We fetch it from the
    // server and refresh it on a timer so all registration phones stay in sync.
    function refreshCount() {
        return postSecure({ action: "checkinCount" })
            .then(function (data) {
                if (data && typeof data.count === "number") {
                    countLabel.textContent = data.count;
                }
            })
            .catch(function () { /* keep the last known number on a hiccup */ });
    }

    function startCountPolling() {
        if (countTimer) return;
        countTimer = setInterval(refreshCount, COUNT_POLL_MS);
    }

    // Keeps the local roster (used for instant scan lookups and the guest
    // list view) reasonably fresh across multiple coordinator devices.
    function startGuestPolling() {
        if (guestTimer) return;
        guestTimer = setInterval(loadGuests, GUEST_POLL_MS);
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

    var alreadyUnlocked = !!storedPin();

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
                    try { sessionStorage.setItem(UNLOCK_KEY, pin); } catch (e) {}
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
        refreshCount();
        startCountPolling();
        // Warm the local roster cache right away so the first QR scan can
        // render instantly instead of waiting on a "lookup" round trip.
        loadGuests();
        startGuestPolling();
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

        var cached = guestIndex[guestId];

        if (cached) {
            // Show what we already know instantly; the network call below
            // re-verifies the checked-in status before enabling the write.
            renderGuest(cached, true);
        } else {
            resultStatus.className = "result__status";
            resultStatus.textContent = "Looking up\u2026";
            resultBody.innerHTML = "";
            confirmBtn.classList.add("hidden");
            scanNextBtn.classList.add("hidden");
        }

        postSecure({ action: "lookup", id: guestId })
            .then(function (data) {
                if (!data || data.error === "unauthorized") return;
                if (!data.found) {
                    renderMissing(guestId);
                    return;
                }
                renderGuest(data);
            })
            .catch(function () {
                // Couldn't re-verify — fall back to the cached copy so the
                // coordinator isn't stuck on a disabled "Confirming..." button.
                if (cached) {
                    renderGuest(cached, false);
                    return;
                }
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

    function renderGuest(g, pending) {
        var name = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest";
        var alreadyIn = !!g.checkedIn;

        resultStatus.className =
            "result__status " +
            (alreadyIn ? "result__status--dupe" : "result__status--new");
        resultStatus.textContent = alreadyIn
            ? "Already checked in" + (g.checkInTime ? " \u00b7 " + g.checkInTime : "")
            : pending
            ? "Confirming\u2026"
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
            confirmBtn.disabled = !!pending;
            confirmLabel.textContent = pending ? "Confirming\u2026" : "Confirm arrived";
        }
        scanNextBtn.classList.remove("hidden");
    }

    confirmBtn.addEventListener("click", function () {
        if (!currentGuestId) return;
        confirmBtn.disabled = true;
        confirmLabel.innerHTML = '<span class="spinner"></span> Saving';

        postSecure({ action: "checkin", id: currentGuestId })
            .then(function (data) {
                if (data && data.ok) {
                    refreshCount();
                    var cached = guestIndex[currentGuestId];
                    if (cached) {
                        cached.checkedIn = true;
                        cached.checkInTime = data.checkInTime || cached.checkInTime;
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

    /* ============================================================
     *  Guest list + manual check-in
     * ========================================================== */
    listBtn.addEventListener("click", openList);
    listCloseBtn.addEventListener("click", closeList);

    listSearch.addEventListener("input", function () {
        listQuery = listSearch.value.trim().toLowerCase();
        renderList();
    });

    Array.prototype.forEach.call(listFilters, function (chip) {
        chip.addEventListener("click", function () {
            listFilter = chip.getAttribute("data-filter") || "all";
            Array.prototype.forEach.call(listFilters, function (c) {
                c.classList.toggle("chip--active", c === chip);
            });
            renderList();
        });
    });

    function openList() {
        pauseScanner();
        hide(scanCard);
        show(listCard);
        if (allGuests.length) {
            renderList(); // show the cached roster instantly
        } else {
            guestListEl.innerHTML =
                '<p class="list-empty">Loading guest list\u2026</p>';
        }
        loadGuests(); // refresh in the background either way
    }

    function closeList() {
        hide(listCard);
        show(scanCard);
        resumeScanner();
    }

    function loadGuests() {
        return postSecure({ action: "guestList" })
            .then(function (data) {
                if (data && data.error === "unauthorized") return;
                allGuests = (data && data.guests) || [];
                guestIndex = {};
                for (var i = 0; i < allGuests.length; i++) {
                    if (allGuests[i].id) guestIndex[allGuests[i].id] = allGuests[i];
                }
                renderList();
            })
            .catch(function () {
                if (!allGuests.length) {
                    guestListEl.innerHTML =
                        '<p class="list-empty">Couldn\'t load the guest list. Check your connection and try again.</p>';
                }
            });
    }

    function guestFullName(g) {
        return [g.firstName, g.lastName].filter(Boolean).join(" ") || "Guest";
    }

    function renderList() {
        var total = allGuests.length;
        var checkedIn = 0;
        for (var i = 0; i < total; i++) {
            if (allGuests[i].checkedIn) checkedIn++;
        }
        listTotalLabel.textContent = total;
        listCountLabel.textContent = checkedIn;

        var rows = allGuests.filter(function (g) {
            if (listFilter === "in" && !g.checkedIn) return false;
            if (listFilter === "pending" && g.checkedIn) return false;
            if (listQuery) {
                var hay = [guestFullName(g), g.group, g.seat]
                    .join(" ").toLowerCase();
                if (hay.indexOf(listQuery) === -1) return false;
            }
            return true;
        });

        rows.sort(function (a, b) {
            return guestFullName(a).localeCompare(guestFullName(b));
        });

        if (!rows.length) {
            guestListEl.innerHTML =
                '<p class="list-empty">No guests match your search.</p>';
            return;
        }

        var html = "";
        for (var j = 0; j < rows.length; j++) {
            var g = rows[j];
            var meta = [g.group, g.seat ? "Seat " + g.seat : ""]
                .filter(Boolean).map(esc).join(" \u00b7 ");
            html += '<div class="guest-item" data-id="' + esc(g.id) + '">';
            html += '<div class="guest-item__info">';
            html += '<div class="guest-item__name">' + esc(guestFullName(g)) + "</div>";
            if (meta) html += '<div class="guest-item__meta">' + meta + "</div>";
            html += "</div>";
            if (g.checkedIn) {
                html += '<span class="guest-item__status guest-item__status--in">' +
                    "\u2713 In" + (g.checkInTime ? " \u00b7 " + esc(g.checkInTime) : "") +
                    "</span>";
            } else {
                html += '<button type="button" class="btn btn--mini" data-checkin="' +
                    esc(g.id) + '">Check in</button>';
            }
            html += "</div>";
        }
        guestListEl.innerHTML = html;
    }

    guestListEl.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-checkin]");
        if (!btn) return;
        var id = btn.getAttribute("data-checkin");
        if (!id) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        postSecure({ action: "checkin", id: id })
            .then(function (data) {
                if (data && data.ok) {
                    for (var i = 0; i < allGuests.length; i++) {
                        if (allGuests[i].id === id) {
                            allGuests[i].checkedIn = true;
                            allGuests[i].checkInTime = data.checkInTime || "";
                            break;
                        }
                    }
                    refreshCount();
                    renderList();
                } else {
                    btn.disabled = false;
                    btn.textContent = "Try again";
                }
            })
            .catch(function () {
                btn.disabled = false;
                btn.textContent = "Try again";
            });
    });
})();
