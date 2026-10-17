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
  var targets = $$(LIST).filter(keep).concat(heads, $$(".drop"));
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
  var threads = $$(".thread");
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    drifters.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.getAttribute("data-speed"));
      el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
    threads.forEach(function (t) {
      var r = t.getBoundingClientRect(), bar = t.querySelector(".thread-line span");
      if (bar) bar.style.transform = "scaleY(" + Math.max(0, Math.min(1, (vh * 0.65 - r.top) / r.height)).toFixed(3) + ")";
    });
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 6) targets.forEach(show);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
