/* ════════════════════════════════════════════════════════════════════════
   DENVER ELYSIUM — Behavior engine (v2)
   Preloader · page transitions · scroll-animation engine · parallax ·
   counters · magnetic buttons · custom cursor · lightbox · nav · booking
   Vanilla JS, no dependencies. Reduced-motion aware.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var WA = "256705359522";
  var EMAIL = "stay@denverelysium.com";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var html = document.documentElement;

  /* ─────────────────────────────────────────────────────────────────────
     1. PRELOADER  (full on first session visit, quick afterwards)
     ───────────────────────────────────────────────────────────────────── */
  function runPreloader() {
    var pl = $(".preloader");
    if (!pl) { html.classList.remove("preloading"); startup(); return; }
    var seen = false;
    try { seen = sessionStorage.getItem("denver_seen") === "1"; } catch (e) {}
    var arc = $(".pl-arc", pl);
    var bar = $(".pl-bar span", pl);
    var count = $(".pl-count", pl);
    var ARC = 289;
    var pct = 0, target = 0, raf;
    var full = !seen && !reduce;
    var minDur = full ? 1500 : 420;
    var t0 = performance.now();
    var loaded = false;

    function paint() {
      pct += (target - pct) * 0.12;
      if (pct > 99.6) pct = target >= 100 ? 100 : pct;
      var v = Math.min(100, Math.round(pct));
      if (count) count.innerHTML = v + "<small>%</small>";
      if (bar) bar.style.width = v + "%";
      if (arc) arc.style.strokeDashoffset = (ARC - (ARC * v) / 100).toFixed(1);
      if (pct < 99.9 || target < 100) raf = requestAnimationFrame(paint);
      else finish();
    }
    // ease target toward 90% while loading, snap to 100 when ready + min time passed
    var creep = setInterval(function () {
      if (target < 90) target += full ? 2.4 : 9;
      if (target > 90) target = 90;
    }, 70);

    function ready() {
      loaded = true;
      var wait = Math.max(0, minDur - (performance.now() - t0));
      setTimeout(function () { clearInterval(creep); target = 100; }, wait);
    }
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready);
    setTimeout(function () { if (!loaded) ready(); }, 3200); // failsafe

    var done = false;
    function finish() {
      if (done) return; done = true;
      cancelAnimationFrame(raf); clearInterval(creep);
      try { sessionStorage.setItem("denver_seen", "1"); } catch (e) {}
      setTimeout(function () {
        pl.classList.add("done");
        html.classList.remove("preloading");
        startup();
        setTimeout(function () { if (pl && pl.parentNode) pl.parentNode.removeChild(pl); }, 900);
      }, full ? 260 : 80);
    }
    if (reduce) { target = 100; if (count) count.textContent = "100"; paint(); }
    else raf = requestAnimationFrame(paint);
  }

  /* ─────────────────────────────────────────────────────────────────────
     2. PAGE TRANSITIONS (outgoing curtain → navigate; incoming preloader reveals)
     ───────────────────────────────────────────────────────────────────── */
  function initTransitions() {
    // bfcache restore must run even for reduced-motion users
    window.addEventListener("pageshow", function (ev) {
      if (!ev.persisted) return;
      var c = $(".curtain"); if (c) c.classList.remove("in");
      var pl = $(".preloader"); if (pl) pl.classList.add("done");
      html.classList.remove("preloading");
    });
    if (reduce) return;
    var curtain = document.createElement("div");
    curtain.className = "curtain";
    curtain.innerHTML = '<span class="c-mark serif">Denver Elysium</span>';
    document.body.appendChild(curtain);

    function isInternal(a) {
      if (!a) return false;
      if (a.target === "_blank" || a.hasAttribute("download")) return false;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return false;
      if (/^(mailto:|tel:|https?:\/\/|wa\.me|\/\/)/i.test(href) && a.host !== location.host) return false;
      if (a.host && a.host !== location.host) return false;
      return /\.html$/.test(href) || href === "/" || (!/^https?:/i.test(href) && !/\.[a-z]+$/i.test(href));
    }
    document.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var a = e.target.closest("a");
      if (!a || !isInternal(a)) return;
      e.preventDefault();
      var href = a.href;
      curtain.classList.add("in");
      setTimeout(function () { window.location.href = href; }, 560);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     3. SCROLL ANIMATION ENGINE  (runs after preloader → startup())
     ───────────────────────────────────────────────────────────────────── */
  function initReveal() {
    var els = $$("[data-animate],[data-stagger],.img-reveal,.reveal-lines");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    els.forEach(function (el) {
      if (el.hasAttribute("data-delay")) el.style.transitionDelay = el.getAttribute("data-delay") + "ms";
      if (el.hasAttribute("data-stagger")) {
        var step = parseInt(el.getAttribute("data-stagger"), 10) || 80;
        $$(":scope > *", el).forEach(function (c, i) { c.style.transitionDelay = (i * step) + "ms"; });
      }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -4% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // failsafe: never leave content invisible — reveal anything still hidden
    // once it is scrolled past (top above viewport middle).
    var sweep = function () {
      var mid = window.innerHeight * 0.92;
      els.forEach(function (el) {
        if (!el.classList.contains("in") && el.getBoundingClientRect().top < mid) {
          el.classList.add("in"); io.unobserve(el);
        }
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", sweep);
  }

  /* ─────────────────────────────────────────────────────────────────────
     4. COUNTERS
     ───────────────────────────────────────────────────────────────────── */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;
    function up(el) {
      var tgt = parseFloat(el.getAttribute("data-count"));
      var suf = el.getAttribute("data-suffix") || "";
      var dec = (el.getAttribute("data-dec") || "0") | 0;
      if (reduce) { el.textContent = tgt.toFixed(dec) + suf; return; }
      var s = null, dur = 1400;
      function step(ts) {
        if (!s) s = ts;
        var p = Math.min(1, (ts - s) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (tgt * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(up); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { up(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ─────────────────────────────────────────────────────────────────────
     5. PARALLAX  (rAF, transform only)
     ───────────────────────────────────────────────────────────────────── */
  function initParallax() {
    if (reduce) return;
    var els = $$("[data-parallax]");
    if (!els.length) return;
    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.18;
        var off = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    frame();
  }

  /* hero bloom: pause the full-viewport screen-blend once the hero scrolls away */
  function initHeroBloom() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var hero = $(".hero"), bloom = $(".hero-bloom");
    if (!hero || !bloom) return;
    new IntersectionObserver(function (es) {
      bloom.style.animationPlayState = es[0].isIntersecting ? "running" : "paused";
    }, { threshold: 0 }).observe(hero);
  }

  /* ─────────────────────────────────────────────────────────────────────
     6. MAGNETIC BUTTONS + CUSTOM CURSOR
     ───────────────────────────────────────────────────────────────────── */
  function initMagnetic() {
    if (!fine || reduce) return;
    $$("[data-magnetic]").forEach(function (el) {
      var str = parseFloat(el.getAttribute("data-magnetic")) || 0.3;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * str;
        var y = (e.clientY - r.top - r.height / 2) * str;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }
  function initCursor() {
    if (!fine || reduce) return;
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = 0, my = 0, rx = 0, ry = 0, shown = false;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px"; dot.style.top = my + "px";
      if (!shown) { shown = true; dot.style.opacity = "1"; ring.style.opacity = "1"; }
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a,button,[data-magnetic],.gal-item,.faq-q,input,select,textarea")) {
        ring.classList.add("hover"); dot.classList.add("hover");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest("a,button,[data-magnetic],.gal-item,.faq-q,input,select,textarea")) {
        ring.classList.remove("hover"); dot.classList.remove("hover");
      }
    });
    document.addEventListener("mouseleave", function () { dot.style.opacity = "0"; ring.style.opacity = "0"; });
  }

  /* ─────────────────────────────────────────────────────────────────────
     7. NAV  (scrolled, auto-hide, mobile, scroll progress)
     ───────────────────────────────────────────────────────────────────── */
  function initNav() {
    var nav = $(".nav"); if (!nav) return;
    var prog = $(".scroll-progress");
    var lastY = window.scrollY;
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("scrolled", y > 36);
      if (y > 380 && y > lastY + 6) nav.classList.add("hide");
      else if (y < lastY - 6 || y < 380) nav.classList.remove("hide");
      lastY = y;
      if (prog) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    var toggle = $(".nav-toggle"), overlay = $("#navOverlay");
    if (toggle && overlay) {
      function setMenu(open) {
        overlay.classList.toggle("open", open);
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        overlay.setAttribute("aria-hidden", String(!open));
        document.body.style.overflow = open ? "hidden" : "";
        if (open) { var a = overlay.querySelector("a"); if (a) setTimeout(function () { a.focus(); }, 80); }
        else toggle.focus();
      }
      toggle.addEventListener("click", function () { setMenu(!overlay.classList.contains("open")); });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay || e.target.closest("a")) setMenu(false);
      });
      document.addEventListener("keydown", function (e) {
        if (!overlay.classList.contains("open")) return;
        if (e.key === "Escape") setMenu(false);
        else if (e.key === "Tab") {
          var f = focusables(overlay); f.unshift(toggle);
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     8. FAQ ACCORDION
     ───────────────────────────────────────────────────────────────────── */
  function initFaq() {
    $$(".faq-q").forEach(function (btn, i) {
      var panel = btn.parentElement.querySelector(".faq-a");
      if (panel) {
        if (!btn.id) btn.id = "faq-btn-" + i;
        panel.id = "faq-panel-" + i;
        btn.setAttribute("aria-controls", panel.id);
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", btn.id);
      }
      btn.addEventListener("click", function () {
        var item = btn.parentElement, open = item.classList.contains("open");
        $$(".faq-item.open").forEach(function (o) {
          if (o !== item) { o.classList.remove("open"); var b = $(".faq-q", o); if (b) b.setAttribute("aria-expanded", "false"); }
        });
        item.classList.toggle("open", !open);
        btn.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     9. VIDEO TOUR FACADE
     ───────────────────────────────────────────────────────────────────── */
  function initTour() {
    var tv = $("#tourVideo"), tp = $("#tourPlay"), cap = $("#tourCap");
    if (!tv || !tp) return;
    tp.addEventListener("click", function () {
      tp.style.display = "none"; if (cap) cap.style.display = "none";
      var p = tv.play(); if (p && p.catch) p.catch(function () {});
    });
    tv.addEventListener("play", function () { tp.style.display = "none"; if (cap) cap.style.display = "none"; });
    tv.addEventListener("pause", function () { if (tv.currentTime === 0) tp.style.display = ""; });
  }

  /* ─────────────────────────────────────────────────────────────────────
     10. LIGHTBOX
     ───────────────────────────────────────────────────────────────────── */
  function focusables(c) {
    return $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', c)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  /* gallery category filter */
  function initGalleryFilter() {
    var chips = $$(".gal-chip"); if (!chips.length) return;
    var items = $$(".gal-item");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) { var on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", String(on)); });
        items.forEach(function (it) {
          var show = f === "all" || it.getAttribute("data-cat") === f;
          it.classList.toggle("is-hidden", !show);
          if (show && !reduce) { it.style.animation = "none"; void it.offsetWidth; it.style.animation = "galpop .45s var(--e-out)"; }
        });
      });
    });
  }

  function initLightbox() {
    var all = $$(".gal-item");
    var lb = $("#lightbox");
    if (!all.length || !lb) return;
    var img = $("#lbImg", lb), cap = $("#lbCap", lb);
    var list = [], idx = 0, last = null;
    function visible() { return all.filter(function (e) { return !e.classList.contains("is-hidden"); }); }
    function show(i) {
      idx = (i + list.length) % list.length;
      var el = list[idx];
      img.src = el.getAttribute("data-full") || (el.querySelector("img") && el.querySelector("img").src);
      img.alt = el.getAttribute("data-cap") || "";
      if (cap) cap.textContent = el.getAttribute("data-cap") || "";
    }
    function open(el) {
      last = document.activeElement; list = visible(); idx = list.indexOf(el); if (idx < 0) idx = 0;
      show(idx); lb.classList.add("open"); document.body.style.overflow = "hidden";
      var c = $("#lbClose", lb); if (c) c.focus();
    }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; if (last) last.focus(); }
    all.forEach(function (el) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "View " + (el.getAttribute("data-cap") || "image") + " full-screen");
      el.addEventListener("click", function () { open(el); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
    });
    var c = $("#lbClose", lb), n = $("#lbNext", lb), p = $("#lbPrev", lb);
    if (c) c.addEventListener("click", close);
    if (n) n.addEventListener("click", function () { show(idx + 1); });
    if (p) p.addEventListener("click", function () { show(idx - 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "Tab") {                      // focus trap
        var f = focusables(lb); if (!f.length) return;
        var first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     11. BOOKING  (form → WhatsApp / email, hero quick-bar, date logic)
     ───────────────────────────────────────────────────────────────────── */
  function initBooking() {
    function val(id) { var el = $("#" + id); return el ? el.value.trim() : ""; }
    function mark(id, bad) { var el = $("#" + id); if (el) { el.classList.toggle("invalid", !!bad); el.setAttribute("aria-invalid", bad ? "true" : "false"); } }
    function getForm() {
      var n = val("f-name"), p = val("f-phone"), ci = val("f-checkin"), co = val("f-checkout"),
          rm = val("f-room"), g = val("f-guests"), nt = val("f-notes");
      mark("f-name", !n); mark("f-checkin", !ci); mark("f-checkout", !co); mark("f-room", !rm);
      if (!n || !ci || !co || !rm) {
        alert("Please fill in your name, dates and room type to continue.");
        var bad = $(".field .invalid"); if (bad) bad.focus();
        return null;
      }
      if (new Date(co) <= new Date(ci)) { mark("f-checkout", true); alert("Check-out must be after check-in."); return null; }
      return { n: n, p: p, ci: ci, co: co, rm: rm, g: g, nt: nt };
    }
    ["f-name", "f-checkin", "f-checkout", "f-room"].forEach(function (id) {
      var el = $("#" + id); if (el) el.addEventListener("input", function () { el.classList.remove("invalid"); el.removeAttribute("aria-invalid"); });
    });
    function msg(b) {
      var m = "Hello Denver Elysium!%0A%0AI'd like to book a stay:%0A%0A" +
        "Name: " + encodeURIComponent(b.n) + "%0A" +
        "Room: " + encodeURIComponent(b.rm) + "%0A" +
        "Check-in: " + b.ci + "%0ACheck-out: " + b.co + "%0AGuests: " + b.g;
      if (b.p) m += "%0APhone: " + encodeURIComponent(b.p);
      if (b.nt) m += "%0ANotes: " + encodeURIComponent(b.nt);
      return m;
    }
    function confirmMsg(b, custom) {
      var el = $("#bookConfirm"); if (!el) return;
      el.className = "book-confirm"; el.style.display = "block";
      el.innerHTML = custom || ("✓ Thank you, " + b.n.split(" ")[0] + "! Your request for the " +
        b.rm.split("—")[0].trim() + " is ready — send it through and we'll confirm your dates shortly.");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function errorMsg(text) {
      var el = $("#bookConfirm"); if (!el) return;
      el.className = "book-confirm is-error"; el.style.display = "block"; el.textContent = text;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function setBusy(btn, on) {
      if (!btn) return;
      btn.classList.toggle("is-busy", on); btn.disabled = on;
      var lbl = btn.querySelector(".btn-label"); if (lbl) lbl.textContent = on ? "Sending…" : "Send request";
    }
    var wa = $("#btnWA"), em = $("#btnEmail");
    if (wa) wa.addEventListener("click", function () { var b = getForm(); if (!b) return; window.open("https://wa.me/" + WA + "?text=" + msg(b), "_blank", "noopener"); confirmMsg(b); });
    if (em) em.addEventListener("click", function () { var b = getForm(); if (!b) return; var body = msg(b).replace(/%0A/g, "%0D%0A"); window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Booking request — " + b.n) + "&body=" + body; confirmMsg(b); });

    // real form submission → Web3Forms (falls back to WhatsApp/email)
    var form = $("#bookForm");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = form.querySelector("[name=botcheck]"); if (hp && hp.checked) return;   // honeypot
      var b = getForm(); if (!b) return;
      var keyEl = form.querySelector("[name=access_key]"), key = keyEl ? keyEl.value : "";
      if (!key || key.indexOf("YOUR_") === 0) {                                        // not configured yet
        confirmMsg(b, "Your request is ready — tap <b>Send via WhatsApp</b> or <b>Send by email</b> below to deliver it to our team.");
        return;
      }
      var sendBtn = $("#btnSend"); setBusy(sendBtn, true);
      var fd = new FormData(form);
      fd.set("subject", "Booking request — " + b.n);
      fd.append("Stay summary", b.rm + " · " + b.ci + " to " + b.co + " · " + b.g + " guest(s)");
      fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          setBusy(sendBtn, false);
          if (j && j.success) { confirmMsg(b, "✓ Thank you, " + b.n.split(" ")[0] + "! Your request has been sent — we'll confirm your dates shortly."); form.reset(); }
          else throw new Error("web3forms");
        })
        .catch(function () {
          setBusy(sendBtn, false);
          errorMsg("We couldn't send that automatically — please tap “Send via WhatsApp” or “Send by email” below and it'll reach us right away.");
        });
    });

    function stash(o) { try { sessionStorage.setItem("denver_prefill", JSON.stringify(o)); } catch (e) {} }

    $$("[data-room]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var room = btn.getAttribute("data-room"), sel = $("#f-room");
        if (sel && $("#book")) {            // form is on this page (contact)
          e.preventDefault(); sel.value = room;
          $("#book").scrollIntoView({ behavior: "smooth" });
          setTimeout(function () { var nm = $("#f-name"); if (nm) nm.focus({ preventScroll: true }); }, 650);
        } else {                            // carry selection across to contact page
          stash({ room: room });            // <a href="contact.html"> then navigates
        }
      });
    });

    var hero = $("#heroCheck");
    if (hero) hero.addEventListener("click", function () {
      var ci = val("h-checkin"), co = val("h-checkout"), g = (val("h-guests").match(/\d+/) || ["2"])[0];
      if ($("#book")) {                     // booking form on this page
        if (ci && $("#f-checkin")) $("#f-checkin").value = ci;
        if (co && $("#f-checkout")) $("#f-checkout").value = co;
        if ($("#f-guests")) $("#f-guests").value = g;
        $("#book").scrollIntoView({ behavior: "smooth" });
      } else {                              // carry dates to contact page
        stash({ ci: ci, co: co, g: g });
        window.location.href = "contact.html";
      }
    });

    // apply any prefill carried from another page
    (function () {
      if (!$("#f-room") && !$("#f-checkin")) return;
      var pf; try { pf = JSON.parse(sessionStorage.getItem("denver_prefill") || "null"); } catch (e) {}
      if (!pf) return;
      try { sessionStorage.removeItem("denver_prefill"); } catch (e) {}
      if (pf.room && $("#f-room")) $("#f-room").value = pf.room;
      if (pf.ci && $("#f-checkin")) $("#f-checkin").value = pf.ci;
      if (pf.co && $("#f-checkout")) $("#f-checkout").value = pf.co;
      if (pf.g && $("#f-guests")) $("#f-guests").value = pf.g;
      var bk = $("#book");
      if (bk) setTimeout(function () { bk.scrollIntoView({ behavior: "smooth" }); }, 400);
    })();

    // date minimums + linkage
    function ymd(d) { var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day); }
    var today = ymd(new Date()), tmrw = ymd(new Date(Date.now() + 864e5));
    ["f-checkin", "h-checkin"].forEach(function (id) { var el = $("#" + id); if (el) el.min = today; });
    ["f-checkout", "h-checkout"].forEach(function (id) { var el = $("#" + id); if (el) el.min = tmrw; });
    [["f-checkin", "f-checkout"], ["h-checkin", "h-checkout"]].forEach(function (pair) {
      var ci = $("#" + pair[0]), co = $("#" + pair[1]);
      if (!ci || !co) return;
      ci.addEventListener("change", function () {
        if (!ci.value) return;
        var next = ymd(new Date(new Date(ci.value).getTime() + 864e5));
        co.min = next; if (co.value && co.value <= ci.value) co.value = next;
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     12. MISC  (year, image fallback)
     ───────────────────────────────────────────────────────────────────── */
  function initMisc() {
    $$(".year").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    // graceful fallback: if a remote placeholder image fails, swap to local photo
    $$("img[data-fallback]").forEach(function (img) {
      function swap() { var fb = img.getAttribute("data-fallback"); if (fb && img.getAttribute("src") !== fb) img.src = fb; }
      if (img.complete && img.naturalWidth === 0) swap();
      img.addEventListener("error", function handler() { img.removeEventListener("error", handler); swap(); });
    });
  }

  /* ── startup: everything that should run after the preloader reveals ── */
  var started = false;
  function startup() {
    if (started) return; started = true;
    initReveal();
    initCounters();
    initParallax();
    initMagnetic();
    initHeroBloom();
  }

  /* ── boot ── */
  function boot() {
    initNav();
    initFaq();
    initTour();
    initLightbox();
    initGalleryFilter();
    initBooking();
    initMisc();
    initCursor();
    initTransitions();
    runPreloader(); // calls startup() when it reveals (or immediately if none)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
