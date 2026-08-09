/**
 * Wedding invitation — interactions & Google integrations.
 */
(function () {
    "use strict";

    var cfg = window.WEDDING_CONFIG || {};

    /* ---------------------------------------------------------
     *  Navigation: scroll state + mobile toggle
     * ------------------------------------------------------- */
    var nav = document.getElementById("nav");
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");

    window.addEventListener("scroll", function () {
        if (window.scrollY > 60) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }
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
            if (el && el.getBoundingClientRect().top + window.scrollY <= scrollPos) {
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
            { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        );
        revealEls.forEach(function (el) {
            observer.observe(el);
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
        setInterval(tick, 1000);
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

    function showMessages(list) {
        if (!messagesWall) return;
        if (messagesEmpty) {
            messagesEmpty.style.display = list.length ? "none" : "";
        }
        // List arrives oldest → newest; each is prepended so newest ends up first.
        list.forEach(renderMessage);
    }

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
        var entry = { name: (name || "A guest").trim(), message: trimmed };

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
    }

    renderAllMessages();

    /* ---------------------------------------------------------
     *  RSVP form -> Google Form submission
     *  Uses a hidden iframe so the browser's no-cors policy
     *  doesn't block the POST and the page doesn't navigate away.
     * ------------------------------------------------------- */
    var form = document.getElementById("rsvpForm");
    var status = document.getElementById("formStatus");
    var submitBtn = document.getElementById("rsvpSubmit");

    function setStatus(message, type) {
        status.textContent = message;
        status.className = "form__status" + (type ? " " + type : "");
    }

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var gf = cfg.googleForm || {};
            if (
                !gf.actionUrl ||
                gf.actionUrl.indexOf("FORM_ID") !== -1
            ) {
                setStatus(
                    "RSVP isn't connected yet. Add your Google Form details in js/config.js.",
                    "error"
                );
                return;
            }

            submitBtn.disabled = true;
            setStatus("Sending your RSVP…", "");

            // Capture the note (and guest name) before the form resets so we
            // can post it to the "Messages for the Couple" wall on success.
            var data = new FormData(form);
            var guestName = [data.get("firstname"), data.get("lastname")]
                .filter(Boolean)
                .join(" ")
                .trim();
            var guestMessage = (data.get("message") || "").trim();

            // Build a hidden form that targets a hidden iframe.
            var iframeName = "gform_target_" + Date.now();
            var iframe = document.createElement("iframe");
            iframe.name = iframeName;
            iframe.style.display = "none";
            document.body.appendChild(iframe);

            var hiddenForm = document.createElement("form");
            hiddenForm.action = gf.actionUrl;
            hiddenForm.method = "POST";
            hiddenForm.target = iframeName;
            hiddenForm.style.display = "none";

            var entries = gf.entries || {};
            Object.keys(entries).forEach(function (field) {
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = entries[field];
                input.value = data.get(field) || "";
                hiddenForm.appendChild(input);
            });

            document.body.appendChild(hiddenForm);

            var done = false;
            function finish() {
                if (done) return;
                done = true;
                if (guestMessage) {
                    addMessage(guestName, guestMessage);
                }
                setStatus(
                    "Thank you! Your RSVP has been received.",
                    "success"
                );
                form.reset();
                submitBtn.disabled = false;
                setTimeout(function () {
                    hiddenForm.remove();
                    iframe.remove();
                }, 1000);
            }

            // Google Forms returns an opaque response; the iframe load
            // event is our best signal that the POST completed.
            iframe.addEventListener("load", finish);
            // Fallback in case the load event never fires.
            setTimeout(finish, 2500);

            hiddenForm.submit();
        });
    }
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
    var cfg         = window.WEDDING_CONFIG || {};
    var pwGate      = document.getElementById("pwGate");
    var pwForm      = document.getElementById("pwForm");
    var pwInput     = document.getElementById("pwInput");
    var pwError     = document.getElementById("pwError");
    var sitePass    = (cfg.sitePassword || "").trim();

    if (!pwGate) return;

    function unlockSite() {
        pwGate.classList.add("pw-gate--hidden");
        document.body.style.overflow = "";
        try { sessionStorage.setItem("nj_unlocked", "ok:" + sitePass); } catch (e) {}
        window.dispatchEvent(new CustomEvent("siteUnlocked"));
    }

    var alreadyUnlocked = false;
    try { alreadyUnlocked = sessionStorage.getItem("nj_unlocked") === ("ok:" + sitePass); } catch (e) {}

    if (!sitePass || alreadyUnlocked) { unlockSite(); return; }

    document.body.style.overflow = "hidden";
    setTimeout(function () { if (pwInput) pwInput.focus(); }, 100);

    if (pwForm) {
        pwForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var val = pwInput ? pwInput.value.trim() : "";
            if (val === sitePass) {
                unlockSite();
            } else {
                if (pwError) pwError.textContent = "Incorrect password. Please try again. \u2728";
                if (pwInput) {
                    pwInput.value = "";
                    pwInput.classList.remove("pw-gate__input--shake");
                    void pwInput.offsetWidth;
                    pwInput.classList.add("pw-gate__input--shake");
                    pwInput.focus();
                }
            }
        });
    }
})();

/* ================================================================
 *  BACKGROUND MUSIC
 * ================================================================ */
(function () {
    "use strict";
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
    var INTERNAL_PAGES = ["index.html", "love-story.html", "entourage.html"];

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
    window.addEventListener("pagehide", function () {
        setStore(STORE_TIME, String(bgMusic.currentTime));
    });

    // Stamp any link to one of our own pages with the current playback
    // position/state right before the browser navigates, so the next page
    // can pick it up from the URL even if storage isn't shared (e.g. file://).
    document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || (a.target && a.target !== "" && a.target !== "_self")) return;

        var url;
        try { url = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
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
    var alreadyUnlocked = false;
    try { alreadyUnlocked = sessionStorage.getItem("nj_unlocked") === ("ok:" + (cfg.sitePassword || "")); } catch (e) {}
    if ((!(cfg.sitePassword || "") || alreadyUnlocked || cameFromInternalNav) && !userPaused) setTimeout(doPlay, 300);
})();

