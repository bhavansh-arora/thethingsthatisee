(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("motion")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    root.classList.remove("motion");
    return;
  }
  window.__motion = true;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EXCLUDE = ".reply *, [data-step] *, .mobile-menu *";
  var keep = function (el) { return !el.matches(EXCLUDE); };

  // ---------- split headings into words ----------
  function splitInto(target, nodes) {
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(" ")); return; }
          var w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
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
  var heads = $$(".h1, .h2, .hero-title, .footer-line").filter(keep);
  heads.forEach(function (h) {
    if (!h.hasAttribute("aria-label")) h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    var nodes = Array.prototype.slice.call(h.childNodes);
    h.textContent = "";
    splitInto(h, nodes);
    $$(".wi", h).forEach(function (wi, i) { wi.style.transitionDelay = Math.min(i * 38, 600) + "ms"; });
    h.classList.add("split-ready");
  });

  // ---------- reveal on enter ----------
  var LIST = ".eyebrow, .kicker, .lede, .prose, .facts, .btn-row, .ticks > li, .note-card, .quote, .price-card, .story, .svc-card, " +
    ".pillar, .faq details, .note, .date-check, .capture, .kicker-list, .featured-inner, .stat, .toc, .guide-body > *, .summary, " +
    ".aside-card, .link-arrow, .filters, .masonry > *, .thread-body, .invite, .flick-ui, .hero-sign, .letter-sign, .footer-grid > *";
  var targets = $$(LIST).filter(keep).concat(heads, $$(".drop"), $$(".footer-giant"));
  function show(el) { el.classList.add("is-in"); }
  var io = new IntersectionObserver(function (entries) {
    var entering = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
    entering.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    entering.forEach(function (el, i) {
      io.unobserve(el);
      var delay = Math.min(i * 70, 420) + (parseInt(el.getAttribute("data-delay"), 10) || 0);
      if (delay) setTimeout(function () { show(el); }, delay); else show(el);
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
  targets.forEach(function (el) { io.observe(el); });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".filter-btn")) setTimeout(function () { $$(".masonry > *, .story").forEach(show); }, 20);
  });

  // ---------- counters ----------
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, end = parseFloat(el.getAttribute("data-count")), t0 = performance.now();
      (function tick(t) {
        var p = Math.min(1, (t - t0) / 1400), v = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * v);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.4 });
  $$("[data-count]").forEach(function (el) { el.textContent = "0"; cio.observe(el); });

  // ---------- scroll-linked: parallax drift, thread line, bottom catch-all ----------
  var drifters = $$("[data-speed]");
  drifters.forEach(function (el) { el._s = { sy: 0, mx: 0, my: 0, tx: 0, ty: 0, dx: 0, dy: 0 }; });
  function apply(el) {
    var s = el._s;
    el.style.transform = "translate3d(" + (s.mx + s.dx).toFixed(1) + "px," + (s.sy + s.my + s.dy).toFixed(1) + "px,0)";
  }
  var threads = $$(".thread");
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    drifters.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      el._s.sy = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.getAttribute("data-speed"));
      apply(el);
    });
    threads.forEach(function (t) {
      var r = t.getBoundingClientRect(), bar = t.querySelector(".thread-line span");
      var p = Math.max(0, Math.min(1, (vh * 0.65 - r.top) / r.height));
      if (bar) bar.style.transform = "scaleY(" + p.toFixed(3) + ")";
      if (t._pen) t._pen.style.top = (p * 100).toFixed(2) + "%";
    });
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 6) targets.forEach(show);
  }

  // ---------- photographs develop as they appear ----------
  var dio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      dio.unobserve(e.target);
      var img = e.target;
      var go = function () { setTimeout(function () { img.classList.add("developed"); }, 120); };
      if (img.tagName !== "IMG" || img.complete) go(); else { img.addEventListener("load", go, { once: true }); img.addEventListener("error", go, { once: true }); }
    });
  }, { threshold: 0.25 });
  $$("main .img").forEach(function (img) { dio.observe(img); });

  // ---------- thread pen ----------
  threads.forEach(function (t) {
    var line = t.querySelector(".thread-line");
    if (!line) return;
    var pen = document.createElement("i"); pen.className = "thread-pen"; pen.setAttribute("aria-hidden", "true");
    line.appendChild(pen); t._pen = pen;
  });

  var fine = window.matchMedia("(pointer: fine)").matches;

  // ---------- hero collage: mouse depth + drag the prints around ----------
  if (fine) {
    var mouseX = 0, mouseY = 0, raf = null;
    window.addEventListener("mousemove", function (e) {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });
    var follow = function () {
      raf = null;
      var moving = false;
      drifters.forEach(function (el) {
        var depth = (parseInt(getComputedStyle(el).zIndex, 10) || 1) * 7;
        var s = el._s;
        s.tx = -mouseX * depth; s.ty = -mouseY * depth;
        s.mx += (s.tx - s.mx) * 0.12; s.my += (s.ty - s.my) * 0.12;
        if (Math.abs(s.tx - s.mx) > 0.2 || Math.abs(s.ty - s.my) > 0.2) moving = true;
        apply(el);
      });
      if (moving) raf = requestAnimationFrame(follow);
    };

    var topZ = 10;
    $$(".collage").forEach(function (col) {
      col.classList.add("is-draggable");
      if (col.closest(".home-hero")) {
        var hint = document.createElement("span");
        hint.className = "drag-hint"; hint.textContent = "pick one up"; hint.setAttribute("aria-hidden", "true");
        col.appendChild(hint);
      }
      $$(".collage-item", col).forEach(function (item) {
        if (!item._s) return;
        var startX, startY, ox, oy, held = false;
        item.addEventListener("pointerdown", function (e) {
          if (e.pointerType !== "mouse" || e.button !== 0) return;
          e.preventDefault();
          held = true; startX = e.clientX; startY = e.clientY; ox = item._s.dx; oy = item._s.dy;
          item.classList.add("is-held"); item.style.zIndex = String(++topZ);
          item.setPointerCapture(e.pointerId);
          var hint = col.querySelector(".drag-hint"); if (hint) hint.style.opacity = "0";
        });
        item.addEventListener("pointermove", function (e) {
          if (!held) return;
          item._s.dx = ox + e.clientX - startX; item._s.dy = oy + e.clientY - startY;
          apply(item);
        });
        var drop = function () { if (!held) return; held = false; item.classList.remove("is-held"); };
        item.addEventListener("pointerup", drop);
        item.addEventListener("pointercancel", drop);
        item.addEventListener("dragstart", function (e) { e.preventDefault(); });
      });
    });


    // ---------- warm glow follows the cursor ----------
    var glowEl = document.createElement("div"); glowEl.className = "cursor-glow"; glowEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(glowEl);
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2, cx = gx, cy = gy, graf = null;
    window.addEventListener("mousemove", function (e) {
      gx = e.clientX; gy = e.clientY; glowEl.classList.add("on");
      if (!graf) graf = requestAnimationFrame(function glide() {
        cx += (gx - cx) * 0.14; cy += (gy - cy) * 0.14;
        glowEl.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
        graf = Math.abs(gx - cx) + Math.abs(gy - cy) > 0.5 ? requestAnimationFrame(glide) : null;
      });
    }, { passive: true });
    document.addEventListener("mouseleave", function () { glowEl.classList.remove("on"); });

    // ---------- 3D tilt toward the cursor ----------
    $$("a.print, .print.lift, .svc-card, .masonry > .g-link, .story").forEach(function (el) {
      var target = el.classList.contains("svc-card") ? el.querySelector(".print") : el.classList.contains("story") ? el.querySelector(".frame") : el;
      if (!target) return;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        target.style.setProperty("--tx", (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2) + "deg");
        target.style.setProperty("--ty", (-((e.clientY - r.top) / r.height - 0.5) * 12).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () { target.style.removeProperty("--tx"); target.style.removeProperty("--ty"); });
    });
  }

  // ---------- film strip speeds up with scrolling ----------
  $$(".film-track").forEach(function (track) {
    var anim = track.getAnimations ? track.getAnimations()[0] : null;
    if (!anim) return;
    var lastY = window.scrollY, rate = 1, spin = null;
    var settle = function () {
      rate += (1 - rate) * 0.06;
      anim.playbackRate = rate;
      spin = Math.abs(rate - 1) > 0.02 ? requestAnimationFrame(settle) : (anim.playbackRate = 1, null);
    };
    window.addEventListener("scroll", function () {
      var y = window.scrollY, v = Math.abs(y - lastY); lastY = y;
      rate = Math.max(rate, 1 + Math.min(v * 0.12, 7));
      anim.playbackRate = rate;
      if (!spin) spin = requestAnimationFrame(settle);
    }, { passive: true });
  });

  // ---------- flick stack nudges when it first appears ----------
  var fio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      fio.unobserve(e.target);
      setTimeout(function () {
        var cards = $$(".flick-card", e.target);
        var top = cards.reduce(function (a, c) { return (+c.style.zIndex || 0) > (+a.style.zIndex || 0) ? c : a; }, cards[0]);
        if (!top) return;
        top.classList.add("nudge");
        setTimeout(function () { top.classList.remove("nudge"); }, 2400);
      }, 700);
    });
  }, { threshold: 0.6 });
  $$(".flick-deck").forEach(function (d) { fio.observe(d); });


  // ---------- dust drifting through the church light ----------
  $$(".arch-window").forEach(function (win) {
    var cv = document.createElement("canvas"); cv.className = "motes"; cv.setAttribute("aria-hidden", "true");
    win.appendChild(cv);
    var ctx = cv.getContext("2d"), parts = [], on = false, W = 0, H = 0;
    function resize() { var d = Math.min(window.devicePixelRatio || 1, 2); W = cv.width = win.clientWidth * d; H = cv.height = win.clientHeight * d; }
    function spawn(p) { p.x = Math.random() * W; p.y = Math.random() * H; p.r = (1 + Math.random() * 2.4) * (W / 500); p.vx = (Math.random() - 0.3) * 0.15 * (W / 500); p.vy = -(0.08 + Math.random() * 0.25) * (W / 500); p.a = Math.random() * Math.PI * 2; return p; }
    resize();
    for (var i = 0; i < 90; i++) parts.push(spawn({}));
    function tick() {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.x += p.vx + Math.sin(p.a) * 0.12; p.y += p.vy; p.a += 0.012;
        if (p.y < -10 || p.x < -10 || p.x > W + 10) { spawn(p); p.y = H + 5; }
        var beam = Math.max(0, 1 - Math.abs((p.x / W) - (0.25 + p.y / H * 0.5)) * 2.4);
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(p.a * 2));
        ctx.globalAlpha = (0.15 + beam * 0.75) * tw;
        ctx.fillStyle = "#ffe2b8";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !on) { on = true; resize(); requestAnimationFrame(tick); } if (!v) on = false; }).observe(win);
  });

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
