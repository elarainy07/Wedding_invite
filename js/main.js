/**
 * Wedding invitation — interactions & Google integrations.
 */

/* ================================================================
 *  Per-page teardown registry
 *  The seamless router (bottom of this file) re-executes this
 *  script after swapping in a new page's content. Any per-page
 *  timers, animation loops, observers or global listeners must be
 *  disposed before the next page re-binds, so modules register a
 *  cleanup here and the router runs them on each navigation.
 * ================================================================ */
window.__onCleanup = function (fn) {
    (window.__njCleanups = window.__njCleanups || []).push(fn);
};

(function () {
    "use strict";

    var cfg = window.WEDDING_CONFIG || {};

    /* ---------------------------------------------------------
     *  Navigation: scroll state + mobile toggle
     * ------------------------------------------------------- */
    var nav = document.getElementById("nav");
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");

    function onNavScroll() {
        if (window.scrollY > 60) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }
    }
    window.addEventListener("scroll", onNavScroll);
    window.__onCleanup(function () {
        window.removeEventListener("scroll", onNavScroll);
    });

    /* ---------------------------------------------------------
     *  Section indicator: show current section name in the nav
     * ------------------------------------------------------- */
    var sectionLabel = document.getElementById("navSectionLabel");
    var sectionMap = {
        top: "",
        story: "Our Story",
        savethedate: "Save the Date",
        prenup: "Prenup Gallery",
        venue: "Venue",
        attire: "Attire Guide",
        program: "Program",
        entourage: "Entourage",
        reminders: "Reminders",
        rsvp: "RSVP",
        messages: "Messages"
    };
    var sectionIds = Object.keys(sectionMap);
    var allNavAnchors = navLinks ? navLinks.querySelectorAll("a[href^='#']") : [];

    function updateSectionLabel() {
        var current = "top";
        var scrollPos = window.scrollY + window.innerHeight * 0.35;
        for (var i = sectionIds.length - 1; i >= 0; i--) {
            var el = document.getElementById(sectionIds[i]);
            if (
                el &&
                el.offsetParent !== null &&
                el.getBoundingClientRect().top + window.scrollY <= scrollPos
            ) {
                current = sectionIds[i];
                break;
            }
        }
        if (sectionLabel) {
            var label = sectionMap[current] || "";
            sectionLabel.textContent = label;
            if (label) {
                sectionLabel.classList.add("visible");
            } else {
                sectionLabel.classList.remove("visible");
            }
        }
        // Highlight active nav link
        allNavAnchors.forEach(function (a) {
            if (a.getAttribute("href") === "#" + current) {
                a.classList.add("active");
            } else {
                a.classList.remove("active");
            }
        });
    }

    window.addEventListener("scroll", updateSectionLabel, { passive: true });
    updateSectionLabel();
    window.__onCleanup(function () {
        window.removeEventListener("scroll", updateSectionLabel);
    });

    var navScrollY = 0;

    function openNavMenu() {
        navScrollY = window.scrollY;
        document.body.style.top = (-navScrollY) + "px";
        document.body.classList.add("nav-open");
        navToggle.classList.add("open");
        navLinks.classList.add("open");
    }

    function closeNavMenu() {
        document.body.classList.remove("nav-open");
        document.body.style.top = "";
        window.scrollTo(0, navScrollY);
        navToggle.classList.remove("open");
        navLinks.classList.remove("open");
    }

    if (navToggle) {
        navToggle.addEventListener("click", function () {
            if (navLinks.classList.contains("open")) {
                closeNavMenu();
            } else {
                openNavMenu();
            }
        });
        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                closeNavMenu();
            });
        });
    }

    /* ---------------------------------------------------------
     *  Reveal-on-scroll animations
     * ------------------------------------------------------- */
    var revealEls = document.querySelectorAll(".reveal");

    // Give grouped siblings a staggered order so they cascade in
    // subtly one after another the first time they scroll into view.
    revealEls.forEach(function (el) {
        var siblings = Array.prototype.filter.call(
            el.parentNode.children,
            function (c) {
                return c.classList && c.classList.contains("reveal");
            }
        );
        var idx = siblings.indexOf(el);
        if (idx > 0) {
            el.style.setProperty("--reveal-order", Math.min(idx, 6));
        }
    });

    if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            // threshold is intentionally low: it's a ratio of the target's own
            // height, so tall elements (e.g. stacked columns on mobile) would
            // otherwise need a huge scroll before becoming "visible enough".
            { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
        );
        revealEls.forEach(function (el) {
            observer.observe(el);
        });
        window.__onCleanup(function () {
            observer.disconnect();
        });
    } else {
        revealEls.forEach(function (el) {
            el.classList.add("visible");
        });
    }

    /* ---------------------------------------------------------
     *  Countdown timer
     * ------------------------------------------------------- */
    var target = cfg.eventStart ? cfg.eventStart.getTime() : null;
    var elDays = document.getElementById("cd-days");
    var elHours = document.getElementById("cd-hours");
    var elMins = document.getElementById("cd-mins");
    var elSecs = document.getElementById("cd-secs");
    var hasCountdown = elDays && elHours && elMins && elSecs;

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function tick() {
        if (!target || !hasCountdown) return;
        var diff = target - Date.now();
        if (diff <= 0) {
            elDays.textContent = elHours.textContent = "00";
            elMins.textContent = elSecs.textContent = "00";
            return;
        }
        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var mins = Math.floor((diff % 3600000) / 60000);
        var secs = Math.floor((diff % 60000) / 1000);
        elDays.textContent = pad(days);
        elHours.textContent = pad(hours);
        elMins.textContent = pad(mins);
        elSecs.textContent = pad(secs);
    }

    if (target && hasCountdown) {
        tick();
        var countdownTimer = setInterval(tick, 1000);
        window.__onCleanup(function () {
            clearInterval(countdownTimer);
        });
    }

    /* ---------------------------------------------------------
     *  Save the Date video: swap the placeholder for a real
     *  embed once WEDDING_CONFIG.saveTheDateVideoUrl is set.
     * ------------------------------------------------------- */
    // Convert any YouTube URL format to embed URL
    function toYTEmbed(url) {
        if (!url) return url;
        if (url.indexOf("youtube.com/embed/") !== -1) return url; // already embed
        var m = url.match(/[?&]v=([^&#]+)/);      // watch?v=ID
        if (m) return "https://www.youtube.com/embed/" + m[1];
        m = url.match(/youtu\.be\/([^?&#]+)/);     // youtu.be/ID
        if (m) return "https://www.youtube.com/embed/" + m[1];
        return url; // pass through as-is
    }

    var videoFrame = document.getElementById("videoFrame");
    var videoPlaceholder = document.getElementById("videoPlaceholder");
    if (videoFrame && cfg.saveTheDateVideoUrl) {
        var iframeEl = document.createElement("iframe");
        iframeEl.id = "ytPlayer";
        // Convert any YouTube URL format to embed and add params required by the IFrame Player API
        var _vsrc = toYTEmbed(cfg.saveTheDateVideoUrl);
        var _isYouTube = _vsrc.indexOf("youtube.com/embed/") !== -1;
        if (_isYouTube) {
            var _origin = encodeURIComponent(window.location.origin);
            _vsrc += (_vsrc.indexOf("?") === -1 ? "?" : "&") +
                "enablejsapi=1&origin=" + _origin;
        }
        iframeEl.src = _vsrc;
        iframeEl.title = "Save the Date video";
        iframeEl.allow =
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframeEl.allowFullscreen = true;
        iframeEl.loading = "lazy";
        videoFrame.replaceChild(iframeEl, videoPlaceholder);

        // Use the official YouTube IFrame Player API for a reliable play/pause
        // signal — raw postMessage "infoDelivery" events never arrive unless the
        // player has been initialized through the API, which is why the video
        // previously didn't pause the background music.
        if (_isYouTube) {
            function bindYTPlayer() {
                new window.YT.Player("ytPlayer", {
                    events: {
                        onStateChange: function (e) {
                            if (e.data === window.YT.PlayerState.PLAYING) {
                                if (window._wPause) window._wPause();
                            } else if (
                                e.data === window.YT.PlayerState.PAUSED ||
                                e.data === window.YT.PlayerState.ENDED
                            ) {
                                if (window._wResume) window._wResume();
                            }
                        },
                    },
                });
            }

            if (window.YT && window.YT.Player) {
                bindYTPlayer();
            } else {
                var _prevReady = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = function () {
                    if (typeof _prevReady === "function") _prevReady();
                    bindYTPlayer();
                };
                if (!document.getElementById("ytIframeApi")) {
                    var ytScript = document.createElement("script");
                    ytScript.id = "ytIframeApi";
                    ytScript.src = "https://www.youtube.com/iframe_api";
                    document.head.appendChild(ytScript);
                }
            }
        }
    }

    /* ---------------------------------------------------------
     *  Google Calendar "Add to calendar" link
     * ------------------------------------------------------- */
    function toGCalDate(date) {
        // Format as YYYYMMDDTHHMMSSZ (UTC)
        return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    }

    var calBtn = document.getElementById("addToCalendar");
    if (calBtn && cfg.eventStart && cfg.eventEnd) {
        var params = new URLSearchParams({
            action: "TEMPLATE",
            text: (cfg.coupleNames || "Our") + " Wedding",
            dates: toGCalDate(cfg.eventStart) + "/" + toGCalDate(cfg.eventEnd),
            ctz: "Asia/Manila",
            details:
                "We can't wait to celebrate with you! Join us for the wedding of " +
                (cfg.coupleNames || "the happy couple") +
                ".",
            location:
                (cfg.venueName ? cfg.venueName + ", " : "") +
                (cfg.venueAddress || ""),
        });
        calBtn.href =
            "https://calendar.google.com/calendar/render?" + params.toString();
    }

    /* ---------------------------------------------------------
     *  Messages for the Couple
     *  Notes left in the RSVP form are shown on a shared message
     *  wall for every visitor. Backed by a Google Apps Script web
     *  app (see js/config.js → messagesApi) so all guests — not
     *  just the one who submitted — can see the notes. Falls back
     *  to this browser's localStorage if no API is configured.
     * ------------------------------------------------------- */
    var MESSAGES_KEY = "wedding_messages";
    var MESSAGES_VISIBLE = 4;
    var messagesWall = document.getElementById("messagesWall");
    var messagesEmpty = document.getElementById("messagesEmpty");
    var messagesApi = cfg.messagesApi || {};
    var messagesApiReady =
        !!messagesApi.url && messagesApi.url.indexOf("SCRIPT_ID") === -1;

    function loadLocalMessages() {
        try {
            var raw = window.localStorage.getItem(MESSAGES_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (err) {
            return [];
        }
    }

    function saveLocalMessage(entry) {
        try {
            var list = loadLocalMessages();
            list.push(entry);
            window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(list));
        } catch (err) {
            /* storage unavailable — message just won't persist */
        }
    }

    function renderMessage(entry) {
        if (!messagesWall) return;
        var card = document.createElement("figure");
        card.className = "messages__card";

        var name = document.createElement("figcaption");
        name.className = "messages__name";
        name.textContent = entry.name;

        var quote = document.createElement("blockquote");
        quote.className = "messages__text";
        quote.textContent = entry.message;

        card.appendChild(name);
        card.appendChild(quote);
        // Newest message always sits at the very top of the wall.
        messagesWall.insertBefore(card, messagesWall.firstChild);
    }

    // Caps the wall's visible height to the first MESSAGES_VISIBLE cards so
    // only that many show at once; any extra messages scroll into view.
    function updateMessagesWallHeight() {
        if (!messagesWall) return;
        var cards = messagesWall.querySelectorAll(".messages__card");
        if (!cards.length) {
            messagesWall.style.maxHeight = "";
            return;
        }
        var visibleCount = Math.min(cards.length, MESSAGES_VISIBLE);
        var height = 0;
        for (var i = 0; i < visibleCount; i++) {
            height += cards[i].getBoundingClientRect().height;
        }
        var styles = window.getComputedStyle(messagesWall);
        var paddingY =
            (parseFloat(styles.paddingTop) || 0) +
            (parseFloat(styles.paddingBottom) || 0);
        messagesWall.style.maxHeight = Math.ceil(height + paddingY) + "px";
    }

    function showMessages(list) {
        if (!messagesWall) return;
        if (messagesEmpty) {
            messagesEmpty.style.display = list.length ? "none" : "";
        }
        // List arrives oldest → newest; each is prepended so newest ends up first.
        list.forEach(renderMessage);
        updateMessagesWallHeight();
    }

    var messagesResizeTimer;
    function onMessagesResize() {
        clearTimeout(messagesResizeTimer);
        messagesResizeTimer = setTimeout(updateMessagesWallHeight, 150);
    }
    window.addEventListener("resize", onMessagesResize);
    window.__onCleanup(function () {
        window.removeEventListener("resize", onMessagesResize);
    });

    function renderAllMessages() {
        if (!messagesWall) return;
        if (messagesApiReady) {
            fetch(messagesApi.url)
                .then(function (res) { return res.json(); })
                .then(function (list) {
                    showMessages(Array.isArray(list) ? list : []);
                })
                .catch(function () {
                    // API unreachable — show whatever this browser has saved locally.
                    showMessages(loadLocalMessages());
                });
        } else {
            showMessages(loadLocalMessages());
        }
    }

    function addMessage(name, message) {
        var trimmed = (message || "").trim();
        if (!trimmed) return;
        var entry = { action: "message", name: (name || "A guest").trim(), message: trimmed };

        if (messagesApiReady) {
            // text/plain avoids a CORS preflight, which Apps Script web apps don't handle.
            fetch(messagesApi.url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(entry),
            }).catch(function () {
                /* couldn't reach the sheet — note still shows locally below */
            });
        } else {
            saveLocalMessage(entry);
        }

        if (messagesEmpty) messagesEmpty.style.display = "none";
        renderMessage(entry);
        updateMessagesWallHeight();
    }

    renderAllMessages();

    /* ---------------------------------------------------------
     *  RSVP form -> Google Apps Script submission
     *  Posts straight into a Google Sheet via the Apps Script web
     *  app configured in js/config.js -> rsvpApi. Uses text/plain
     *  so the browser skips a CORS preflight (Apps Script web apps
     *  don't handle OPTIONS requests).
     * ------------------------------------------------------- */
    var form = document.getElementById("rsvpForm");
    var status = document.getElementById("formStatus");
    var submitBtn = document.getElementById("rsvpSubmit");
    var rsvpSection = document.getElementById("rsvp");
    var successModal = document.getElementById("rsvpSuccessModal");
    var successBackdrop = document.getElementById("rsvpSuccessBackdrop");
    var successClose = document.getElementById("rsvpSuccessClose");
    var successTitle = document.getElementById("rsvpSuccessTitle");
    var successMain = document.getElementById("rsvpSuccessMain");
    var successQrNote = document.getElementById("rsvpSuccessQrNote");

    function setStatus(message, type) {
        status.textContent = message;
        status.className = "form__status" + (type ? " " + type : "");
    }

    function showSuccessModal(attending) {
        if (!successModal) return;
        var isDeclining = attending === "Regretfully declines";
        if (successTitle) {
            successTitle.textContent = isDeclining ? "We\u2019ll miss you!" : "Thank you!";
        }
        if (successMain) {
            successMain.textContent = isDeclining
                ? "Thank you for letting us know. We\u2019re sorry you won\u2019t be able to join us, and we truly appreciate you taking the time to respond."
                : "Your RSVP has been received.";
        }
        if (successQrNote) {
            successQrNote.hidden = isDeclining;
        }
        successModal.hidden = false;
        // Force reflow so the appear transition runs.
        void successModal.offsetWidth;
        successModal.classList.add("is-visible");
        document.body.classList.add("modal-open");
    }

    function hideSuccessModal() {
        if (!successModal) return;
        successModal.classList.remove("is-visible");
        document.body.classList.remove("modal-open");
        setTimeout(function () {
            successModal.hidden = true;
        }, 250);
    }

    if (successClose) successClose.addEventListener("click", hideSuccessModal);
    if (successBackdrop) successBackdrop.addEventListener("click", hideSuccessModal);
    function onSuccessKeydown(e) {
        if (e.key === "Escape" && successModal && !successModal.hidden) {
            hideSuccessModal();
        }
    }
    document.addEventListener("keydown", onSuccessKeydown);
    window.__onCleanup(function () {
        document.removeEventListener("keydown", onSuccessKeydown);
    });

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var rsvpApi = cfg.rsvpApi || {};
            var rsvpApiReady =
                !!rsvpApi.url && rsvpApi.url.indexOf("SCRIPT_ID") === -1;

            if (!rsvpApiReady) {
                setStatus(
                    "RSVP isn't connected yet. Add your Google Apps Script details in js/config.js.",
                    "error"
                );
                return;
            }

            submitBtn.disabled = true;
            setStatus("Sending your RSVP…", "");

            var data = new FormData(form);
            var guestName = [data.get("firstname"), data.get("lastname")]
                .filter(Boolean)
                .join(" ")
                .trim();
            var guestMessage = (data.get("message") || "").trim();
            var payload = {
                action: "rsvp",
                firstname: data.get("firstname") || "",
                lastname: data.get("lastname") || "",
                email: data.get("email") || "",
                attending: data.get("attending") || "",
                flightHelp: data.get("flightHelp") || "",
                message: guestMessage,
            };

            fetch(rsvpApi.url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
            })
                .then(function () {
                    if (guestMessage) {
                        addMessage(guestName, guestMessage);
                    }
                    form.reset();
                    setStatus("", "");
                    if (rsvpSection) rsvpSection.hidden = true;
                    showSuccessModal(payload.attending);
                })
                .catch(function () {
                    setStatus(
                        "Something went wrong sending your RSVP. Please try again.",
                        "error"
                    );
                })
                .then(function () {
                    submitBtn.disabled = false;
                });
        });
    }
})();

/* ---------------------------------------------------------
 *  Gift QR modal
 * ------------------------------------------------------- */
(function () {
    var openBtn = document.getElementById("giftQrBtn");
    var modal = document.getElementById("giftQrModal");
    var backdrop = document.getElementById("giftQrBackdrop");
    var closeBtn = document.getElementById("giftQrClose");
    if (!openBtn || !modal) return;

    function showModal() {
        modal.hidden = false;
        // Force reflow so the appear transition runs.
        void modal.offsetWidth;
        modal.classList.add("is-visible");
        document.body.classList.add("modal-open");
    }

    function hideModal() {
        modal.classList.remove("is-visible");
        document.body.classList.remove("modal-open");
        setTimeout(function () {
            modal.hidden = true;
        }, 250);
    }

    openBtn.addEventListener("click", showModal);
    if (closeBtn) closeBtn.addEventListener("click", hideModal);
    if (backdrop) backdrop.addEventListener("click", hideModal);
    function onGiftKeydown(e) {
        if (e.key === "Escape" && !modal.hidden) {
            hideModal();
        }
    }
    document.addEventListener("keydown", onGiftKeydown);
    window.__onCleanup(function () {
        document.removeEventListener("keydown", onGiftKeydown);
    });
})();

/* ---------------------------------------------------------
 *  Prenup gallery — slow auto-scroll (left → right → reset)
 *  Pauses on any user interaction; resumes after 2.5 s.
 * ------------------------------------------------------- */
(function () {
    var wrap = document.querySelector(".prenup__scroll-wrap");
    if (!wrap) return;

    var speed = 0.35; // px per animation frame — very slow
    var paused = false;
    var resumeTimer;
    var stopped = false;
    window.__onCleanup(function () {
        stopped = true;
        clearTimeout(resumeTimer);
    });

    function pause() {
        paused = true;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
            paused = false;
        }, 2500);
    }

    // Pause on any manual interaction
    wrap.addEventListener("mousedown",  pause);
    wrap.addEventListener("touchstart", pause, { passive: true });
    wrap.addEventListener("wheel",      pause, { passive: true });

    function tick() {
        if (stopped) return;
        if (!paused) {
            var max = wrap.scrollWidth - wrap.clientWidth;
            if (max > 0) {
                if (wrap.scrollLeft >= max - 1) {
                    // Reached the end — reset smoothly to the start
                    wrap.scrollLeft = 0;
                } else {
                    wrap.scrollLeft += speed;
                }
            }
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();

/* ================================================================
 *  PASSWORD GATE
 * ================================================================ */
(function () {
    "use strict";
    // Runs once for the life of the document — the seamless router keeps the
    // same document alive across pages, so the gate must not re-initialize.
    if (window.__pwBooted) return;
    window.__pwBooted = true;
    var cfg         = window.WEDDING_CONFIG || {};
    var pwGate      = document.getElementById("pwGate");
    var pwForm      = document.getElementById("pwForm");
    var pwInput     = document.getElementById("pwInput");
    var pwError     = document.getElementById("pwError");
    var pwSubmit    = pwForm ? pwForm.querySelector(".pw-gate__btn") : null;
    var apiUrl      = ((cfg.passwordApi || {}).url || "").trim();
    var localPass   = (cfg.localPassword || "").trim();

    if (!pwGate) return;

    function unlockSite() {
        // Dismiss the mobile keyboard first — on iOS/Android, focusing the
        // password input can silently scroll the page behind the fixed
        // overlay, so we force the hero section back into view on unlock.
        if (pwInput) pwInput.blur();
        pwGate.classList.add("pw-gate--hidden");
        document.body.style.overflow = "";
        window.scrollTo(0, 0);
        // The keyboard-dismiss animation on mobile can re-settle the scroll
        // position a moment later, so reassert it once more after it closes.
        setTimeout(function () { window.scrollTo(0, 0); }, 350);
        try { sessionStorage.setItem("nj_unlocked", "1"); } catch (e) {}
        window.dispatchEvent(new CustomEvent("siteUnlocked"));
    }

    var alreadyUnlocked = false;
    try { alreadyUnlocked = sessionStorage.getItem("nj_unlocked") === "1"; } catch (e) {}

    if ((!apiUrl && !localPass) || alreadyUnlocked) { unlockSite(); return; }

    document.body.style.overflow = "hidden";
    setTimeout(function () { if (pwInput) pwInput.focus(); }, 100);

    function showError(msg) {
        if (pwError) pwError.textContent = msg;
        if (pwInput) {
            pwInput.value = "";
            pwInput.classList.remove("pw-gate__input--shake");
            void pwInput.offsetWidth;
            pwInput.classList.add("pw-gate__input--shake");
            pwInput.focus();
        }
    }

    var pwSubmitHtml = pwSubmit ? pwSubmit.innerHTML : "";

    function setChecking(isChecking) {
        if (pwSubmit) {
            pwSubmit.disabled = isChecking;
            pwSubmit.innerHTML = isChecking
                ? '<span class="spinner" aria-hidden="true"></span> Checking\u2026'
                : pwSubmitHtml;
        }
        if (pwInput) pwInput.disabled = isChecking;
    }


    if (pwForm) {
        pwForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var val = pwInput ? pwInput.value.trim() : "";
            if (!val) return;

            if (!apiUrl) {
                // Insecure fallback for local testing only — see config.js.
                if (val === localPass) unlockSite();
                else showError("Incorrect password. Please try again. \u2728");
                return;
            }

            setChecking(true);
            // text/plain avoids a CORS preflight, which Apps Script web apps don't handle.
            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "checkPassword", password: val }),
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    setChecking(false);
                    if (data && data.ok) {
                        unlockSite();
                    } else {
                        showError("Incorrect password. Please try again. \u2728");
                    }
                })
                .catch(function () {
                    setChecking(false);
                    showError("Couldn't verify the password right now. Please try again. \u2728");
                });
        });
    }
})();

/* ================================================================
 *  BACKGROUND MUSIC
 * ================================================================ */
(function () {
    "use strict";
    // Runs once for the life of the document. The seamless router keeps this
    // <audio> element alive across page swaps, so re-running would reset it.
    if (window.__musicBooted) return;
    window.__musicBooted = true;
    var cfg        = window.WEDDING_CONFIG || {};
    var musicUrl   = (cfg.bgMusicUrl || "").trim();
    var bgMusic    = document.getElementById("bgMusic");
    var musicBtn   = document.getElementById("musicBtn");
    var musicIcon  = document.getElementById("musicIcon");

    if (!bgMusic || !musicUrl) return;

    // Playback position/state is kept in sessionStorage (works when the site
    // is served over http/https) AND relayed through the URL of internal
    // links (works even when opened directly from disk via file://, where
    // each page can get an isolated/opaque storage origin). Whichever value
    // is available at load time is used to pick up right where guests left off.
    var STORE_TIME   = "nj_music_time";
    var STORE_PAUSED = "nj_music_userPaused";
    var INTERNAL_PAGES = ["index.html", "love-story.html", "entourage.html", "hotel-rates.html"];

    function getStore(key, fallback) {
        try {
            var v = sessionStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (e) { return fallback; }
    }
    function setStore(key, value) {
        try { sessionStorage.setItem(key, value); } catch (e) {}
    }

    bgMusic.src    = musicUrl;
    bgMusic.volume = 0.2;
    if (musicBtn) musicBtn.removeAttribute("hidden");

    var playing             = false;
    var userPaused          = getStore(STORE_PAUSED, "0") === "1";
    var resumeTime          = parseFloat(getStore(STORE_TIME, "0")) || 0;
    var timeRestored        = false;
    var cameFromInternalNav = false;

    // A navigation link (see below) can pass fresher state via ?bgt=&bgp=
    // query params — prefer those over whatever is in storage, then strip
    // them from the visible URL. Arriving with these params also proves the
    // guest came from an already-unlocked/playing page on this site, which
    // matters when sessionStorage isn't shared across pages (e.g. some
    // browsers isolate storage per file:// document).
    (function readStateFromUrl() {
        var params;
        try { params = new URLSearchParams(location.search); } catch (e) { return; }
        if (!params.has("bgt") && !params.has("bgp")) return;

        cameFromInternalNav = true;
        if (params.has("bgt")) {
            var qt = parseFloat(params.get("bgt"));
            if (!isNaN(qt) && qt >= 0) resumeTime = qt;
        }
        if (params.has("bgp")) userPaused = params.get("bgp") !== "1";

        params.delete("bgt");
        params.delete("bgp");
        var qs = params.toString();
        var cleanUrl = location.pathname + (qs ? "?" + qs : "") + location.hash;
        try { history.replaceState(null, "", cleanUrl); } catch (e) {}
    })();

    function restoreTime() {
        if (timeRestored) return;
        timeRestored = true;
        if (resumeTime > 0) {
            try { bgMusic.currentTime = resumeTime; } catch (e) {}
        }
    }
    bgMusic.addEventListener("loadedmetadata", restoreTime);

    function updateBtn() {
        if (!musicIcon) return;
        musicIcon.innerHTML = playing
            ? '<svg class="icon" aria-hidden="true"><use href="img/icons.svg#icon-pause"></use></svg>'
            : '<svg class="icon" aria-hidden="true"><use href="img/icons.svg#icon-music"></use></svg>';
        if (musicBtn) musicBtn.setAttribute("aria-label", playing ? "Pause music" : "Play music");
    }

    function doPlay() {
        restoreTime();
        var p = bgMusic.play();
        if (p) p.then(function () { playing = true; updateBtn(); }).catch(function () {});
    }

    function doPause(bySystem) {
        if (!bgMusic.paused) bgMusic.pause();
        playing = false;
        if (!bySystem) {
            userPaused = true;
            setStore(STORE_PAUSED, "1");
        }
        updateBtn();
    }

    // Persist playback position continuously so the next page can resume
    // from the same spot instead of restarting the track.
    bgMusic.addEventListener("timeupdate", function () {
        setStore(STORE_TIME, String(bgMusic.currentTime));
    });

    // Mobile browsers keep playing background audio after the guest
    // switches apps or locks the phone — treat that as "closing" the site:
    // stop the music immediately rather than let it run unattended.
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            doPause(true);
        } else if (!userPaused) {
            var stillUnlocked = false;
            try { stillUnlocked = sessionStorage.getItem("nj_unlocked") === "1"; } catch (e) {}
            if (stillUnlocked) doPlay();
        }
    });

    window.addEventListener("pagehide", function (e) {
        if (e.persisted) {
            // Page is going into the back/forward cache, not actually closing —
            // keep the saved position so a same-tab restore can pick up cleanly.
            setStore(STORE_TIME, String(bgMusic.currentTime));
            return;
        }
        // A real close/navigation away: don't let the next visit resume
        // mid-song or skip the password gate — start the site fresh.
        try {
            sessionStorage.removeItem(STORE_TIME);
            sessionStorage.removeItem(STORE_PAUSED);
            sessionStorage.removeItem("nj_unlocked");
        } catch (err) {}
        if (!bgMusic.paused) bgMusic.pause();
    });

    // Stamp any link to one of our own pages with the current playback
    // position/state right before the browser navigates, so the next page
    // can pick it up from the URL even if storage isn't shared (e.g. file://).
    document.addEventListener("click", function (e) {
        // When the seamless router is active it keeps this audio element alive
        // across pages, so the URL relay is unnecessary — leave links untouched.
        if (window.__njRouterBooted) return;
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || (a.target && a.target !== "" && a.target !== "_self")) return;

        var hrefAttr = a.getAttribute("href") || "";
        // Same-page hash links (nav/scroll indicator anchors) never cause a
        // reload, so leave them alone — stamping query params here would
        // turn an in-page jump into a full page navigation, sending the
        // guest back to the top instead of scrolling to the section.
        if (hrefAttr.charAt(0) === "#") return;

        var url;
        try { url = new URL(hrefAttr, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;

        var page = url.pathname.split("/").pop() || "index.html";
        if (INTERNAL_PAGES.indexOf(page) === -1) return;

        url.searchParams.set("bgt", bgMusic.currentTime.toFixed(2));
        url.searchParams.set("bgp", (playing && !userPaused) ? "1" : "0");
        a.href = url.toString();
    }, true);

    // Expose for video sync
    window._wPause  = function () { doPause(true); };
    window._wResume = function () { if (!userPaused) doPlay(); };

    if (musicBtn) {
        musicBtn.addEventListener("click", function () {
            if (playing) {
                doPause(false);
            } else {
                userPaused = false;
                setStore(STORE_PAUSED, "0");
                doPlay();
            }
        });
    }

    // Start after password unlock (user interaction = autoplay allowed)
    window.addEventListener("siteUnlocked", function () {
        if (!userPaused) doPlay();
    });

    // If no password / already unlocked — including guests navigating from an
    // already-unlocked page (either detected via sessionStorage, or proven by
    // arriving through one of our own tagged links) — resume automatically so
    // the music carries over from page to page instead of stopping.
    var gateEnabled = !!((cfg.passwordApi || {}).url || cfg.localPassword || "").trim();
    var alreadyUnlocked = false;
    try { alreadyUnlocked = sessionStorage.getItem("nj_unlocked") === "1"; } catch (e) {}
    if ((!gateEnabled || alreadyUnlocked || cameFromInternalNav) && !userPaused) setTimeout(doPlay, 300);
})();

/* ================================================================
 *  SEAMLESS NAVIGATION (single-page routing for our own pages)
 * ----------------------------------------------------------------
 *  Clicking a link to another page on this site normally reloads
 *  the whole document, which destroys the <audio> element and
 *  restarts the music (mobile browsers then block auto-resume).
 *  Instead we fetch the target page and swap its content into the
 *  live document while keeping the same #bgMusic element playing —
 *  so the background music is truly gapless from page to page.
 * ================================================================ */
(function () {
    "use strict";
    if (window.__njRouterBooted) return;
    window.__njRouterBooted = true;

    // Only these same-origin pages are handled in-place. checkin.html is a
    // standalone coordinator tool and is intentionally excluded.
    var INTERNAL = ["index.html", "love-story.html", "entourage.html", "hotel-rates.html"];
    var PERSIST_IDS = ["bgMusic", "musicBtn"];

    function pageName(u) {
        return u.pathname.split("/").pop() || "index.html";
    }
    function isInternal(u) {
        return u.origin === location.origin && INTERNAL.indexOf(pageName(u)) !== -1;
    }
    function isUnlocked() {
        try { return sessionStorage.getItem("nj_unlocked") === "1"; } catch (e) { return false; }
    }

    document.addEventListener("click", function (e) {
        if (e.defaultPrevented) return;
        // Let modified clicks (new tab/window, middle-click) behave normally.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || a.hasAttribute("download")) return;
        var t = a.getAttribute("target");
        if (t && t !== "" && t !== "_self") return;

        var hrefAttr = a.getAttribute("href") || "";
        if (hrefAttr.charAt(0) === "#") return; // in-page anchor — native scroll

        var url;
        try { url = new URL(hrefAttr, location.href); } catch (err) { return; }
        if (!isInternal(url)) return; // external link — let the browser handle it

        // Drop any leftover music-relay params so the address bar stays clean.
        url.searchParams.delete("bgt");
        url.searchParams.delete("bgp");

        e.preventDefault();
        go(url, true);
    });

    window.addEventListener("popstate", function () {
        go(new URL(location.href), false);
    });

    var navToken = 0;
    // Pathname of the content currently rendered in the document. We can't rely
    // on location.pathname here: during popstate the browser has already moved
    // it to the destination, which would make history navigations look "same
    // page" and skip the content swap.
    var currentPath = location.pathname;

    function go(url, push) {
        // Same document, just a different section — scroll instead of swapping.
        if (url.pathname === currentPath) {
            if (push) history.pushState(null, "", url.href);
            scrollToTarget(url.hash);
            return;
        }

        var token = ++navToken;
        document.documentElement.classList.add("is-navigating");

        fetch(url.href, { credentials: "same-origin" })
            .then(function (res) { return res.text(); })
            .then(function (html) {
                if (token !== navToken) return; // superseded by a newer click
                swap(html, url, push);
            })
            .catch(function () {
                window.location.href = url.href; // network hiccup — hard navigate
            });
    }

    function swap(html, url, push) {
        var doc = new DOMParser().parseFromString(html, "text/html");

        // An unauthenticated guest reaching a gated page can't be unlocked in
        // place (the gate module only runs once) — fall back to a full load so
        // the password gate initializes normally.
        if (!isUnlocked() && doc.body.querySelector("#pwGate")) {
            window.location.href = url.href;
            return;
        }

        // Dispose the outgoing page's timers, loops, observers and listeners.
        (window.__njCleanups || []).forEach(function (fn) {
            try { fn(); } catch (e) {}
        });
        window.__njCleanups = [];

        // Detach the live audio + music button so they keep playing untouched;
        // a detached HTMLMediaElement continues playback while JS holds a ref.
        var persisted = PERSIST_IDS
            .map(function (id) { return document.getElementById(id); })
            .filter(Boolean);
        persisted.forEach(function (n) { n.parentNode && n.parentNode.removeChild(n); });

        // Remove the incoming page's own copies so we don't duplicate them,
        // its inert <script> tags (we re-run main.js ourselves), and — since
        // we're already unlocked here — any password gate it ships with.
        PERSIST_IDS.forEach(function (id) {
            var n = doc.body.querySelector("#" + id);
            if (n) n.parentNode.removeChild(n);
        });
        Array.prototype.forEach.call(doc.body.querySelectorAll("script"), function (s) {
            s.parentNode.removeChild(s);
        });
        var gate = doc.body.querySelector("#pwGate");
        if (gate) gate.parentNode.removeChild(gate);

        document.title = doc.title;
        document.body.className = doc.body.className;
        document.body.style.overflow = "";
        document.body.style.top = "";
        document.body.innerHTML = doc.body.innerHTML;
        persisted.forEach(function (n) { document.body.appendChild(n); });

        if (push) history.pushState(null, "", url.href);
        currentPath = url.pathname;
        document.documentElement.classList.remove("is-navigating");

        reinit();
        scrollToTarget(url.hash);
    }

    function scrollToTarget(hash) {
        if (hash && hash.length > 1) {
            var el = document.getElementById(decodeURIComponent(hash.slice(1)));
            if (el) { el.scrollIntoView(); return; }
        }
        window.scrollTo(0, 0);
    }

    // Re-execute this script so every per-page module re-binds to the swapped
    // DOM. The music, password and router modules are guarded and skip re-runs.
    function reinit() {
        var s = document.createElement("script");
        s.src = "js/main.js";
        s.onload = function () { s.parentNode && s.parentNode.removeChild(s); };
        document.body.appendChild(s);
    }
})();

