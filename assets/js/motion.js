/* The Things That I See: motion layer.
   GSAP + ScrollTrigger drive the cinematic effects; every effect
   degrades gracefully (content stays visible) if a library fails to load. */
(function () {
  "use strict";
  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var hasGsap = !!(gsap && ST) && !reduce;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function finishLoading() {
    html.classList.remove("is-loading");
    try { sessionStorage.setItem("ttis-seen", "1"); } catch (e) {}
  }
  if (reduce) { finishLoading(); html.classList.remove("is-entering"); return; }

  if (hasGsap) { gsap.registerPlugin(ST); html.classList.add("has-gsap"); }

  /* Native scrolling is used on purpose: no scroll hijacking, so wheel,
     trackpad, touch, keyboard and scrollbar all behave exactly as expected. */

  /* ---------- Scroll progress ---------- */
  var bar = $(".scroll-progress");
  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty("--sp", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  }
  window.addEventListener("scroll", progress, { passive: true });
  progress();

  /* ---------- Preloader / page entry ---------- */
  var introStarted = false;
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    startHero();
    if (hasGsap) ST.refresh();
  }

  if (html.classList.contains("is-loading")) {
    var count = $("[data-count-loader]");
    var loaderBar = $(".preloader__bar");
    var heroImg = $(".hero img, .page-hero--image img, main img");
    var loaded = !heroImg || heroImg.complete;
    if (heroImg && !loaded) {
      heroImg.addEventListener("load", function () { loaded = true; });
      heroImg.addEventListener("error", function () { loaded = true; });
    }
    var fontsReady = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { fontsReady = true; });
    var t0 = performance.now(), shown = 0, MIN = 2100, MAX = 3500;
    (function tick(now) {
      var elapsed = now - t0;
      var ready = (loaded && fontsReady) || elapsed > MAX;
      var target = ready ? 100 : Math.min(90, (elapsed / MIN) * 90);
      var timeCap = Math.min(100, (elapsed / MIN) * 100);
      shown += (Math.min(target, timeCap) - shown) * 0.12;
      if (ready && timeCap >= 100 && shown > 99.4) shown = 100;
      var n = Math.round(shown);
      if (count) count.textContent = ("00" + n).slice(-3);
      if (loaderBar) loaderBar.style.setProperty("--p", (shown / 100).toFixed(3));
      if (n < 100) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        html.classList.add("is-loaded");
        finishLoading();
        startIntro();
        setTimeout(function () { html.classList.remove("is-loaded"); }, 1300);
      }, 180);
    })(t0);
  } else if (html.classList.contains("is-entering")) {
    setTimeout(function () {
      requestAnimationFrame(function () {
        html.classList.add("is-entered");
        startIntro();
        setTimeout(function () { html.classList.remove("is-entering", "is-entered"); }, 1200);
      });
    }, 260);
  } else {
    startIntro();
  }

  /* ---------- Page transitions ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download") || a.classList.contains("g-link")) return;
    var url = new URL(a.getAttribute("href"), location.href);
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return;
    if (document.body.classList.contains("menu-open")) { document.body.classList.remove("menu-open"); }
    e.preventDefault();
    var next = transitionFor(url);
    var curtain = $(".curtain");
    if (curtain && next) {
      $$(".curtain__frame span", curtain).forEach(function (s, i) {
        s.classList.remove("is-shown");
        s.style.backgroundImage = "url(" + next.p[i][0] + ")";
        s.style.backgroundPosition = next.p[i][1];
        s.style.animation = "none"; void s.offsetWidth; s.style.animation = "";
      });
      $("[data-curtain-title]", curtain).textContent = next.t;
    }
    try {
      sessionStorage.setItem("ttis-nav", "1");
      if (next) sessionStorage.setItem("ttis-nav-data", JSON.stringify({ t: next.t, u: next.p[2][0], pos: next.p[2][1] }));
    } catch (err) {}
    html.classList.add("is-leaving");
    setTimeout(function () { location.href = url.href; }, 1000);
  });
  // Photo sets for each page's transition, warmed up as soon as a link is hovered or touched.
  var transitions = {};
  try { transitions = JSON.parse(document.getElementById("ttis-transitions").textContent); } catch (err) {}
  function transitionFor(url) {
    var file = url.pathname.split("/").pop() || "index.html";
    return transitions[file] || transitions["index.html"];
  }
  var warmed = {};
  function warm(e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var url = new URL(a.getAttribute("href"), location.href);
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
    var next = transitionFor(url);
    if (!next || warmed[url.pathname]) return;
    warmed[url.pathname] = true;
    next.p.forEach(function (p) { var im = new Image(); im.src = p[0]; });
    // Fetch the next page ahead of the click so it opens as the curtain finishes.
    var link = document.createElement("link");
    link.rel = "prefetch"; link.href = url.href;
    document.head.appendChild(link);
  }
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("touchstart", warm, { passive: true });
  document.addEventListener("focusin", warm);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) html.classList.remove("is-leaving", "is-entering", "is-entered");
  });

  /* ---------- Hero slideshow + rotating word ---------- */
  function startHero() {
    var rot = $(".rotator");
    if (rot) {
      var words = $$(".rotator__word", rot), wi = words.length - 1;
      words[wi].classList.add("is-current");
      rot.classList.add("is-live");
      // Size the slot to the visible word so there is no gap before "again".
      var fit = function () {
        var max = Math.max.apply(null, words.map(function (w) { return w.offsetWidth; }));
        rot.style.width = "";
        var extra = rot.offsetWidth - max;
        rot.style.width = (words[wi].offsetWidth + extra) + "px";
      };
      fit();
      window.addEventListener("resize", fit);
      if (document.fonts) document.fonts.ready.then(fit);
      setInterval(function () {
        if (document.hidden) return;
        var prev = words[wi];
        wi = (wi + 1) % words.length;
        prev.classList.remove("is-current");
        prev.classList.add("is-out");
        words[wi].classList.remove("is-out");
        words[wi].classList.add("is-current");
        fit();
        setTimeout(function () { prev.classList.remove("is-out"); }, 950);
      }, 2600);
    }

    var wrap = $("[data-hero-slides]");
    if (!wrap) return;
    var slides = $$(".hero__slide", wrap);
    var idx = 0, current = $("[data-hero-current]"), index = $(".hero__index");
    slides.forEach(function (s, i) {
      if (i > 0) { var im = s.querySelector("img"); if (im) im.loading = "eager"; }
    });
    function runBar() {
      if (!index) return;
      index.classList.remove("is-running");
      void index.offsetWidth;
      index.classList.add("is-running");
    }
    runBar();
    setInterval(function () {
      if (document.hidden || window.scrollY > window.innerHeight) return;
      var prev = slides[idx];
      idx = (idx + 1) % slides.length;
      slides.forEach(function (s) { s.classList.remove("is-prev"); });
      prev.classList.remove("is-active");
      prev.classList.add("is-prev");
      slides[idx].classList.add("is-active");
      if (current) current.textContent = ("0" + (idx + 1)).slice(-2);
      runBar();
    }, 6000);
  }

  /* ---------- Count-up numbers ---------- */
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1800;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(end * eased);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { c.textContent = "0"; cio.observe(c); });
  }

  /* ---------- Velocity marquee ---------- */
  var lastY = window.scrollY, velocity = 0, direction = 1;
  (function sample() {
    var y = window.scrollY, d = y - lastY;
    velocity += (d - velocity) * 0.2;
    if (Math.abs(d) > 0.5) direction = d > 0 ? 1 : -1;
    lastY = y;
    requestAnimationFrame(sample);
  })();
  $$(".marquee__track").forEach(function (track) {
    var x = 0;
    function loop() {
      x -= (0.55 + Math.min(Math.abs(velocity) * 0.25, 14)) * direction;
      var half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
      requestAnimationFrame(loop);
    }
    if (hasGsap) requestAnimationFrame(loop);
  });

  /* ---------- Custom cursor, magnetic buttons, hover previews ---------- */
  if (fine) {
    html.classList.add("has-cursor");
    var cursor = $(".cursor"), ring = $(".cursor__ring"), dot = $(".cursor__dot"), label = $(".cursor__label");
    var preview = $(".hover-preview"), pInner = $(".hover-preview__inner");
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, px = mx, py = my, lastPx = mx;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!cursor.classList.contains("is-ready")) { rx = px = lastPx = mx; ry = py = my; cursor.classList.add("is-ready"); }
      cursor.classList.remove("is-hidden");
    }, { passive: true });
    document.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });
    window.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });
    // A link that opens a new tab takes the mouseup with it, so release the press when this window loses focus.
    var release = function () { cursor.classList.remove("is-down"); };
    window.addEventListener("blur", release);
    window.addEventListener("pagehide", release);
    document.addEventListener("visibilitychange", release);
    window.addEventListener("dragend", release);
    (function follow() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      px += (mx - px) * 0.12; py += (my - py) * 0.12;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      if (preview) {
        var vx = Math.max(-14, Math.min(14, (px - lastPx) * 0.6));
        preview.style.transform = "translate3d(" + px + "px," + py + "px,0) rotate(" + vx.toFixed(2) + "deg)";
        lastPx = px;
      }
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      var lab = e.target.closest("[data-cursor]");
      var hov = e.target.closest("a, button, summary, label, .chip, input, select, textarea");
      if (lab) {
        label.textContent = lab.dataset.cursor;
        cursor.classList.add("is-label"); cursor.classList.remove("is-hover");
      } else if (hov) {
        cursor.classList.add("is-hover"); cursor.classList.remove("is-label");
      } else {
        cursor.classList.remove("is-hover", "is-label");
      }
      var pv = e.target.closest("[data-preview]");
      if (pv && preview) {
        pInner.style.backgroundImage = "url('" + pv.dataset.preview + "')";
        preview.classList.add("is-active");
      } else if (preview) {
        preview.classList.remove("is-active");
      }
    });

    if (hasGsap) {
      $$(".btn, .icon-btn, .hscroll__end-circle, .menu-toggle, .footer-cta__btn").forEach(function (el) {
        if (el.closest(".inline-form, .lightbox, .summary-bar, .step-actions")) return;
        el.setAttribute("data-magnetic", "");
        var strength = el.classList.contains("btn") ? 0.28 : 0.4;
        var host = el;
        host.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.6, ease: "power3.out" });
        });
        host.addEventListener("mouseleave", function () {
          gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)" });
        });
      });
    }
  }

  if (!hasGsap) return;

  /* ====================== GSAP scroll choreography ====================== */

  // Hero: the framed image eases back and the copy lifts away as you scroll.
  $$(".hero").forEach(function (hero) {
    var frame = hero.querySelector(".hero__frame");
    var mediaEl = hero.querySelector(".hero__media");
    var content = hero.querySelector(".hero__content");
    var trig = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
    if (frame) gsap.to(frame, { scale: 0.92, yPercent: 6, ease: "none", transformOrigin: "50% 0%", scrollTrigger: trig });
    if (mediaEl) gsap.to(mediaEl, { yPercent: 14, scale: 1.06, ease: "none", scrollTrigger: trig });
    if (content) gsap.to(content, { yPercent: -14, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom 20%", scrub: true } });
  });

  // Feature frames open up as they arrive.
  $$(".feature__frame").forEach(function (f) {
    gsap.fromTo(f, { scale: 0.9, borderRadius: "48px" }, { scale: 1, borderRadius: "24px", ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "top 25%", scrub: true } });
  });

  // Parallax inside image frames, pivoting around the faces.
  $$(".media").forEach(function (m) {
    if (m.closest(".masonry, .index-row, .hero, .hcard, .marquee, .stack-card, .nav__sub")) return;
    var im = m.querySelector("img");
    if (!im) return;
    im.classList.add("parallax-img");
    im.style.transformOrigin = getComputedStyle(im).objectPosition;
    gsap.fromTo(im, { yPercent: -6, scale: 1.16 }, {
      yPercent: 6, scale: 1.16, ease: "none",
      scrollTrigger: { trigger: m, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  $$("[data-parallax]").forEach(function (bg) {
    gsap.fromTo(bg, { yPercent: -9 }, { yPercent: 9, ease: "none", scrollTrigger: { trigger: bg.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Quote that lights up word by word.
  $$("[data-scrub-words]").forEach(function (el) {
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span"); s.className = "sw"; s.textContent = w; f.appendChild(s);
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1) wrap(c);
      });
    })(el);
    gsap.to($$(".sw, .inline-img", el), {
      opacity: 1, stagger: 0.12, ease: "none",
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 42%", scrub: 0.6 }
    });
  });

  // Portfolio grid: staggered rise as rows enter.
  var items = $$(".masonry .g-link");
  if (items.length) {
    gsap.set(items, { opacity: 0, y: 70 });
    ST.batch(items, {
      start: "top 96%",
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.09, overwrite: true }); }
    });
    document.addEventListener("ttis:filter", function (e) {
      var shown = $$(".g-link", e.detail.target).filter(function (i) { return !i.hidden; });
      gsap.fromTo(shown, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.03, overwrite: true });
      setTimeout(function () { ST.refresh(); }, 60);
    });
  }

  // Pinned horizontal love stories (desktop).
  var mm = gsap.matchMedia();
  mm.add("(min-width: 1024px)", function () {
    var section = $("[data-hscroll]");
    if (!section) return;
    var track = $(".hscroll__track", section);
    var prog = $(".hscroll__progress", section);
    section.classList.add("is-pinned");
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: {
        trigger: section, start: "top top", end: function () { return "+=" + dist(); },
        pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) { if (prog) prog.style.setProperty("--hp", self.progress.toFixed(4)); }
      }
    });
    $$(".hcard__media img", section).forEach(function (im) {
      im.style.transformOrigin = getComputedStyle(im).objectPosition;
      gsap.fromTo(im, { xPercent: -7, scale: 1.18 }, {
        xPercent: 7, scale: 1.18, ease: "none",
        scrollTrigger: { trigger: im.closest(".hcard"), containerAnimation: tween, start: "left right", end: "right left", scrub: true }
      });
    });
    return function () { section.classList.remove("is-pinned"); gsap.set(track, { x: 0 }); };
  });

  // Process cards stack: each covered card eases back and dims.
  var cards = window.innerWidth >= 900 ? $$("[data-stack] .stack-card") : [];
  cards.forEach(function (card, i) {
    var next = cards[i + 1];
    if (!next) return;
    gsap.to(card, { scale: 0.93, ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top " + (96 + (i + 1) * 22) + "px", scrub: true }
    });
    gsap.to(card.querySelector(".stack-card__shade"), {
      opacity: 0.6, ease: "none",
      scrollTrigger: { trigger: next, start: "top bottom", end: "top " + (96 + (i + 1) * 22) + "px", scrub: true }
    });
  });

  // Footer: giant wordmark letters rise into place.
  var wm = $(".footer-wordmark");
  if (wm) {
    $$(".fw-line", wm).forEach(function (line) {
      line.innerHTML = line.textContent.split("").map(function (ch) {
        return ch === " " ? " " : '<span class="fw-char">' + ch + "</span>";
      }).join("");
    });
    gsap.from($$(".fw-char", wm), { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.035, scrollTrigger: { trigger: wm, start: "top 98%" } });
  }

  // Section headings get a gentle drift for depth.
  mm.add("(min-width: 900px)", function () {
    $$(".head--split h2, .page-hero__title").forEach(function (h) {
      gsap.fromTo(h, { y: 18 }, { y: -18, ease: "none", scrollTrigger: { trigger: h, start: "top bottom", end: "bottom top", scrub: true } });
    });
  });

  window.addEventListener("load", function () { ST.refresh(); });
  if (document.fonts) document.fonts.ready.then(function () { ST.refresh(); });
})();
