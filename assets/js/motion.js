(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!root.classList.contains("motion")) return;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    root.classList.remove("motion", "show-intro");
    return;
  }
  window.__motion = true;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fine = window.matchMedia("(pointer: fine)").matches;
  var EXCLUDE = ".reply *, [data-step] *, .mobile-menu *";
  var notExcluded = function (el) { return !el.matches(EXCLUDE); };

  // ---------- smooth scroll ----------
  var lenis = null;
  if (window.Lenis && fine) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.TTIS_LENIS = lenis;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      var target = document.querySelector(a.getAttribute("href"));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -90 }); }
    });
  }

  // ---------- word splitting ----------
  function splitInto(target, nodes) {
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(" ")); return; }
          var w = document.createElement("span"); w.className = "w";
          var wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
          w.appendChild(wi); target.appendChild(w);
        });
      } else if (n.nodeType === 1) {
        var clone = n.cloneNode(false);
        splitInto(clone, Array.prototype.slice.call(n.childNodes));
        target.appendChild(clone);
      }
    });
  }
  function split(el) {
    if (el.classList.contains("split-ready")) return $$(".wi", el);
    var label = el.textContent.replace(/\s+/g, " ").trim();
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = "";
    splitInto(el, nodes);
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
    $$(".w", el).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
    el.classList.add("split-ready");
    return $$(".wi", el);
  }

  // ---------- intro + hero ----------
  var hero = document.querySelector(".zoom-hero, .cover-hero, .hero, .page-hero");
  var heroTitle = hero && hero.querySelector(".zoom-title, .cover-title, .hero-title, .h1");
  var heroTl = gsap.timeline({ paused: true });
  if (heroTitle) {
    var words = split(heroTitle);
    gsap.set(words, { yPercent: 115 });
    heroTl.to(words, { yPercent: 0, duration: 1.25, ease: "power4.out", stagger: 0.07 }, 0.1);
  }
  if (hero && hero.classList.contains("zoom-hero")) {
    gsap.set(hero.querySelector(".zoom-frame"), { opacity: 0, scale: 0.86 });
    gsap.set(hero.querySelectorAll(".zoom-meta, .zoom-cue"), { opacity: 0 });
    heroTl.to(hero.querySelector(".zoom-frame"), { opacity: 1, scale: 1, duration: 1.6, ease: "expo.out" }, 0)
      .to(hero.querySelectorAll(".zoom-meta, .zoom-cue"), { opacity: 1, duration: 1 }, 0.8);
  }
  if (hero && hero.classList.contains("cover-hero")) {
    var cimg = hero.querySelector(".cover-media .img");
    gsap.set(cimg, { scale: 1.25 });
    gsap.set(hero.querySelectorAll(".cover-foot"), { opacity: 0, y: 30 });
    heroTl.to(cimg, { scale: 1.08, duration: 2.4, ease: "expo.out" }, 0)
      .to(hero.querySelectorAll(".cover-foot"), { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, 0.6);
  }

  function startPage() {
    heroTl.play();
    initReveals();
  }

  var intro = document.querySelector(".intro");
  if (root.classList.contains("show-intro") && intro) {
    var word = intro.querySelector(".intro-word");
    var iw = split(word);
    gsap.set(iw, { yPercent: 115 });
    if (lenis) lenis.stop();
    gsap.timeline({
      onComplete: function () { root.classList.remove("show-intro"); if (lenis) lenis.start(); }
    })
      .to(iw, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.05 })
      .from(".intro-sub", { opacity: 0, y: 10, duration: 0.6 }, "-=0.5")
      .to(".intro-bar span", { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, "-=0.6")
      .to(iw, { yPercent: -115, duration: 0.6, ease: "power3.in", stagger: 0.03 }, "+=0.15")
      .to(intro, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.25")
      .add(startPage, "-=0.45");
  } else {
    startPage();
  }

  // ---------- scroll reveals ----------
  function initReveals() {
    // headings
    initZoomHero();
    initCoverHero();

    $$(".h1, .h2, .hero-title, .footer-line, .footer-giant").filter(notExcluded).forEach(function (h) {
      if (h === heroTitle) return;
      var w = split(h);
      gsap.set(w, { yPercent: 115 });
      ST.create({
        trigger: h, start: "top 88%", once: true,
        onEnter: function () { gsap.to(w, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.045 }); }
      });
    });

    // blocks
    var blocks = ".eyebrow, .lede, .prose, .facts, .btn-row, .ticks > li, .quote, .price-card, .story, .service, " +
      ".step, .pillar, .faq details, .note, .date-check, .capture, .kicker-list, .hero-note, .featured-inner, " +
      ".stat, .toc, .guide-body > *, .summary, .aside-card, .link-arrow, .filters, .masonry > *, " +
      ".footer-grid > *, .footer-base";
    var els = $$(blocks).filter(notExcluded);
    ST.batch(els, {
      start: "top 94%", once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: Math.min(0.08, 0.5 / batch.length), overwrite: true,
          onComplete: function () { batch.forEach(function (b) { b.classList.add("is-in"); gsap.set(b, { clearProps: "transform" }); }); }
        });
      }
    });

    // frames: curtain wipe + settle
    var frames = $$(".frame").filter(function (f) { return notExcluded(f) && !f.classList.contains("no-clip"); });
    ST.batch(frames, {
      start: "top 96%", once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.out", stagger: Math.min(0.12, 0.5 / batch.length),
          onComplete: function () { batch.forEach(function (b) { b.classList.add("is-in"); }); }
        });
        batch.forEach(function (f) {
          var img = f.querySelector(".img");
          if (img && !f.classList.contains("px") && !f.closest(".hgal")) gsap.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.8, ease: "expo.out" });
        });
      }
    });

    // parallax inside large frames
    $$(".hero-media .frame, .page-hero .frame, .split-media .frame, .cta-media").forEach(function (f) {
      f.classList.add("px");
      var img = f.querySelector(".img");
      if (!img) return;
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: f, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // counters
    $$("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var obj = { v: 0 };
      el.textContent = "0";
      ST.create({
        trigger: el, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(obj, { v: end, duration: 2, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(obj.v); } });
        }
      });
    });

    // anything still waiting when the visitor reaches the bottom
    ST.create({
      start: function () { return ST.maxScroll(window) - 4; }, end: "max", once: true,
      onEnter: function () {
        var rest = els.concat(frames).filter(function (el) { return !el.classList.contains("is-in"); });
        gsap.to(rest, { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power3.out", stagger: Math.min(0.05, 0.4 / (rest.length || 1)),
          onComplete: function () { rest.forEach(function (el) { el.classList.add("is-in"); }); } });
        $$(".wi").forEach(function (w) { gsap.to(w, { yPercent: 0, duration: 0.8, ease: "power4.out" }); });
      }
    });

    initMarquees();
    initHgal();
    initManifesto();
    initServices();
    initChapters();
    ST.sort();
    ST.refresh();
    document.fonts && document.fonts.ready.then(function () { ST.refresh(); });
  }


  // ---------- home: zoom-to-fullscreen hero ----------
  function initZoomHero() {
    var zh = document.querySelector("[data-zoom-hero]");
    if (!zh) return;
    var stage = zh.querySelector(".zoom-stage"), frame = zh.querySelector(".zoom-frame"), img = frame.querySelector(".img");
    var desk = window.matchMedia("(min-width: 900px)").matches;
    var startClip = desk ? "inset(16% 33% 14% 33%)" : "inset(24% 9% 33% 9%)";
    gsap.set(frame, { clipPath: startClip });
    gsap.set(img, { scale: 1.35 });
    gsap.set(zh.querySelector(".zoom-shade"), { opacity: 0 });
    gsap.set(zh.querySelector(".zoom-copy"), { y: 50 });
    gsap.timeline({ scrollTrigger: { trigger: zh, start: "top top", end: "+=130%", pin: stage, scrub: 0.9, anticipatePin: 1 } })
      .to(frame, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", duration: 1 }, 0)
      .to(img, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
      .to(zh.querySelector(".zt-top"), { xPercent: -45, opacity: 0, ease: "power2.in", duration: 0.7 }, 0)
      .to(zh.querySelector(".zt-bottom"), { xPercent: 45, opacity: 0, ease: "power2.in", duration: 0.7 }, 0)
      .to(zh.querySelectorAll(".zoom-meta, .zoom-cue"), { opacity: 0, duration: 0.25 }, 0)
      .to(zh.querySelector(".zoom-shade"), { opacity: 1, duration: 0.5 }, 0.45)
      .to(zh.querySelector(".zoom-copy"), { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, 0.62)
      .to({}, { duration: 0.25 });
  }

  // ---------- inner pages: cover hero parallax ----------
  function initCoverHero() {
    var ch = document.querySelector(".cover-hero");
    if (!ch) return;
    gsap.to(ch.querySelector(".cover-media"), { yPercent: 18, ease: "none", scrollTrigger: { trigger: ch, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(ch.querySelector(".cover-content"), { yPercent: -12, opacity: 0.15, ease: "none", scrollTrigger: { trigger: ch, start: "40% top", end: "bottom top", scrub: true } });
  }

  // ---------- manifesto: words light up as you read ----------
  function initManifesto() {
    $$(".manifesto-text").forEach(function (el) {
      var w = split(el);
      gsap.to(w, { opacity: 1, ease: "none", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 50%", scrub: true } });
    });
  }

  // ---------- services: floating image follows the cursor ----------
  function initServices() {
    var list = document.querySelector(".svc-list"), float = document.querySelector(".svc-float");
    if (!list || !float || !fine || getComputedStyle(float).display === "none") return;
    var fx = gsap.quickTo(float, "x", { duration: 0.6, ease: "power3" }), fy = gsap.quickTo(float, "y", { duration: 0.6, ease: "power3" });
    var rot = gsap.quickTo(float, "rotation", { duration: 0.8, ease: "power3" });
    var lastX = 0;
    list.addEventListener("mousemove", function (e) { fx(e.clientX); fy(e.clientY); rot(gsap.utils.clamp(-10, 10, (e.clientX - lastX) * 0.6)); lastX = e.clientX; });
    $$(".svc-row", list).forEach(function (row) {
      row.addEventListener("mouseenter", function (e) {
        var src = row.querySelector(".img");
        if (!src) return;
        var clone = src.cloneNode(true);
        clone.removeAttribute("loading");
        clone.setAttribute("sizes", "340px");
        float.innerHTML = "";
        float.appendChild(clone);
        gsap.fromTo(clone, { scale: 1.25 }, { scale: 1, duration: 0.8, ease: "expo.out" });
        if (!float.classList.contains("on")) { gsap.set(float, { x: e.clientX, y: e.clientY }); lastX = e.clientX; }
        float.classList.add("on");
        gsap.to(float, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" });
      });
    });
    list.addEventListener("mouseleave", function () {
      float.classList.remove("on");
      gsap.to(float, { opacity: 0, scale: 0.6, duration: 0.4, ease: "power3.in", overwrite: "auto" });
      rot(0);
    });
  }

  // ---------- stacking chapters ----------
  function initChapters() {
    var cards = $$(".chapter");
    cards.forEach(function (card, i) {
      var next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.93, "--dim": 0.42, ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: "top " + (parseFloat(getComputedStyle(next).top) || 100) + "px", scrub: true }
      });
    });
  }

  // ---------- marquee with scroll velocity ----------
  function initMarquees() {
    $$(".marquee").forEach(function (m) {
      var tween = gsap.to(m, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
      var skew = gsap.quickTo(m, "skewX", { duration: 0.5, ease: "power3" });
      var dir = 1;
      ST.create({
        trigger: m, start: "top bottom", end: "bottom top",
        onUpdate: function (self) {
          var v = self.getVelocity();
          dir = self.direction;
          gsap.to(tween, { timeScale: dir * (1 + Math.min(Math.abs(v) / 250, 5)), duration: 0.3, overwrite: true });
          skew(gsap.utils.clamp(-8, 8, v / -300));
        },
        onLeave: function () { skew(0); }
      });
      ST.addEventListener("scrollEnd", function () {
        gsap.to(tween, { timeScale: dir, duration: 1.2 });
        skew(0);
      });
    });
  }

  // ---------- pinned horizontal gallery (desktop) ----------
  function initHgal() {
    var section = document.querySelector(".hgal-section");
    if (!section) return;
    var track = section.querySelector(".hgal-track");
    var bar = section.querySelector(".hgal-progress span");
    ST.matchMedia({
      "(min-width: 900px)": function () {
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 80); };
        var tw = gsap.to(track, {
          x: function () { return -dist(); }, ease: "none",
          scrollTrigger: {
            trigger: section, start: "top top", end: function () { return "+=" + dist(); },
            pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) { if (bar) gsap.set(bar, { scaleX: self.progress }); }
          }
        });
        $$(".hgal-item .img", track).forEach(function (img, i) {
          gsap.fromTo(img, { xPercent: -6, scale: 1.12 }, {
            xPercent: 6, scale: 1.12, ease: "none",
            scrollTrigger: { trigger: img.closest(".hgal-item"), containerAnimation: tw, start: "left right", end: "right left", scrub: true }
          });
        });
        return function () { gsap.set(track, { clearProps: "transform" }); };
      }
    });
  }

  // ---------- header hide on scroll down ----------
  var header = document.querySelector("[data-header]");
  ST.create({
    start: 0, end: "max",
    onUpdate: function (self) {
      var y = self.scroll();
      var hide = self.direction === 1 && y > 300 && !document.body.classList.contains("menu-open");
      header.classList.toggle("is-hidden", hide);
    }
  });

  // ---------- layout changes (filters) ----------
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".filter-btn")) {
      setTimeout(function () {
        $$(".masonry > *, .story").forEach(function (el) { if (!el.hidden) { el.classList.add("is-in"); gsap.set(el, { opacity: 1, y: 0 }); } });
        ST.refresh();
      }, 30);
    }
  });

  // lightbox / menu: pause smooth scroll
  if (lenis) {
    var mo = new MutationObserver(function () {
      document.body.classList.contains("menu-open") ? lenis.stop() : lenis.start();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  // ---------- cursor + magnetic buttons ----------
  if (fine) {
    var c = document.createElement("div");
    c.className = "cursor";
    c.innerHTML = '<div class="cursor-ring"><span class="cursor-label">View</span></div><div class="cursor-dot"></div>';
    document.body.appendChild(c);
    var ring = c.querySelector(".cursor-ring"), dot = c.querySelector(".cursor-dot"), label = c.querySelector(".cursor-label");
    var rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    var dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    window.addEventListener("mousemove", function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      var t = e.target;
      var view = t.closest && t.closest(".g-link, .service, .story");
      var link = t.closest && t.closest("a, button, input, select, textarea, label, summary");
      c.classList.toggle("is-view", !!view);
      c.classList.toggle("is-link", !view && !!link);
      c.classList.toggle("on-dark", !!(t.closest && t.closest(".band-nave, .site-footer, .summary, .reply, .mobile-menu, .lightbox, .on-dark")));
      if (view) label.textContent = view.classList.contains("g-link") ? "View" : "Open";
    }, { passive: true });
    document.addEventListener("mouseleave", function () { gsap.to(c, { opacity: 0, duration: 0.2 }); });
    document.addEventListener("mouseenter", function () { gsap.to(c, { opacity: 1, duration: 0.2 }); });

    $$(".btn-solid, .btn-light, .header-cta").forEach(function (b) {
      var mx = gsap.quickTo(b, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      var my = gsap.quickTo(b, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener("mouseleave", function () { mx(0); my(0); });
    });
  }
})();
