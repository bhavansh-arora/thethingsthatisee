(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || { bookedDates: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- shared helpers (used by page scripts) ----------
  function parseISO(iso) {
    var p = (iso || "").split("-").map(Number);
    return p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]) : null;
  }
  function formatDate(iso) {
    var d = parseISO(iso);
    return d ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  }
  function isPast(iso) {
    var d = parseISO(iso), t = new Date();
    t.setHours(0, 0, 0, 0);
    return !d || d < t;
  }
  function isBooked(iso) { return (cfg.bookedDates || []).indexOf(iso) !== -1; }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim()); }
  function submitForm(payload) {
    if (!cfg.formEndpoint) {
      console.info("[preview] formEndpoint not set in assets/js/config.js; nothing was sent.", payload);
      return new Promise(function (res) { setTimeout(function () { res(true); }, 450); });
    }
    return fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  window.TTIS = { formatDate: formatDate, isPast: isPast, isBooked: isBooked, money: money, validEmail: validEmail, submitForm: submitForm, $: $, $$: $$ };

  // ---------- header ----------
  var header = $("[data-header]");
  var mobileCta = $("[data-mobile-cta]");
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      var menuOpen = document.body.classList.contains("menu-open");
      if (Math.abs(y - lastY) > 6) header.classList.toggle("is-hidden", y > lastY && y > 320 && !menuOpen);
    }
    lastY = y;
    if (mobileCta) mobileCta.classList.toggle("is-visible", y > Math.min(480, window.innerHeight * 0.6));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = $(".menu-toggle"), menu = $("#mobile-menu");
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  if (menu) $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  var subBtn = $(".nav-menu-btn");
  if (subBtn) {
    var li = subBtn.parentElement;
    subBtn.addEventListener("click", function () {
      var open = !li.classList.contains("is-open");
      li.classList.toggle("is-open", open);
      subBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function (e) {
      if (!li.contains(e.target)) { li.classList.remove("is-open"); subBtn.setAttribute("aria-expanded", "false"); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    setMenu(false);
    if (subBtn) { subBtn.parentElement.classList.remove("is-open"); subBtn.setAttribute("aria-expanded", "false"); }
  });

  // ---------- date checks ----------
  $$("[data-date-check]").forEach(function (form) {
    var input = $("input[type=date]", form), out = $("[data-date-result]", form);
    var today = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
    input.min = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      out.className = "date-check-result";
      if (!v) { out.textContent = "Choose your wedding date first."; input.focus(); return; }
      if (isPast(v)) { out.textContent = "That date has passed. Choose a date from today onward."; return; }
      var link = "enquire.html?type=wedding&date=" + encodeURIComponent(v);
      if (isBooked(v)) {
        out.classList.add("is-booked");
        out.innerHTML = formatDate(v) + " is already booked. <a href=\"" + link + "\">Send an enquiry anyway</a> and I&rsquo;ll reply with options.";
      } else {
        out.classList.add("is-open");
        out.innerHTML = formatDate(v) + " is open. <a href=\"" + link + "\">Let&rsquo;s hold it &rarr;</a>";
      }
    });
  });

  // ---------- email capture (guide) ----------
  $$("[data-capture]").forEach(function (form) {
    var input = $("input[type=email]", form), out = $(".capture-msg", form), btn = $("button", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      out.className = "capture-msg";
      if ($(".hp input", form) && $(".hp input", form).value) return;
      if (!validEmail(input.value)) {
        out.classList.add("is-err");
        out.textContent = "Enter an email address like name@example.com.";
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      btn.disabled = true;
      submitForm({ form: "catholic-wedding-guide", email: input.value.trim(), page: location.pathname }).then(function (ok) {
        btn.disabled = false;
        if (ok) {
          out.classList.add("is-ok");
          out.innerHTML = "Thank you. The printable guide is on its way to " + input.value.trim().replace(/[<>&"]/g, "") + ". <a href=\"guide.html\">Read it online now</a>.";
          form.reset();
        } else {
          out.classList.add("is-err");
          out.textContent = "That didn't go through. Please try again, or email jason@thethingsthatisee.com.";
        }
      });
    });
  });

  // ---------- gallery filters ----------
  $$("[data-filters]").forEach(function (bar) {
    var target = document.getElementById(bar.getAttribute("data-filters"));
    if (!target) return;
    var buttons = $$(".filter-btn", bar);
    var items = $$(".g-link", target);
    buttons.forEach(function (b) {
      var cat = b.getAttribute("data-filter");
      var n = cat === "all" ? items.length : items.filter(function (i) { return i.getAttribute("data-cat") === cat; }).length;
      var c = document.createElement("span");
      c.className = "count";
      c.textContent = n;
      b.appendChild(c);
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        items.forEach(function (i) { i.hidden = !(cat === "all" || i.getAttribute("data-cat") === cat); });
      });
    });
  });

  $$("[data-story-filters]").forEach(function (bar) {
    var cards = $$("[data-story-list] > .story");
    var buttons = $$(".filter-btn", bar);
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var cat = b.getAttribute("data-filter");
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        cards.forEach(function (c) { c.hidden = !(cat === "all" || c.getAttribute("data-cat") === cat); });
      });
    });
  });


  // ---------- flick stack (drag, swipe, buttons, arrow keys) ----------
  $$("[data-flick]").forEach(function (flick) {
    var deck = $(".flick-deck", flick);
    var cards = $$(".flick-card", deck);
    var countEl = $("[data-flick-count]", flick);
    var n = cards.length, order = cards.slice(), shown = 1, busy = false;
    var tilt = [-4, 3, -2, 5, -5, 2, -3, 4, -1, 3, -4, 2];
    function layout() {
      order.forEach(function (c, depth) {
        c.style.zIndex = String(n - depth);
        var r = depth === 0 ? -1.5 : tilt[cards.indexOf(c) % tilt.length];
        var off = Math.min(depth, 4);
        c.style.transform = "translate(" + (off * 3) + "px," + (off * -4) + "px) rotate(" + r + "deg)";
        c.style.opacity = depth > 5 ? "0" : "1";
        c.setAttribute("aria-hidden", depth === 0 ? "false" : "true");
      });
      if (countEl) countEl.innerHTML = String(shown).padStart(2, "0") + " <span>/ " + String(n).padStart(2, "0") + "</span>";
    }
    function next(dir) {
      if (busy) return;
      busy = true;
      var top = order[0];
      top.style.transform = "translate(" + (dir * 120) + "%, -6%) rotate(" + (dir * 24) + "deg)";
      top.style.opacity = "0";
      setTimeout(function () {
        order.push(order.shift());
        shown = shown % n + 1;
        top.style.transition = "none";
        layout();
        top.style.opacity = "0";
        void top.offsetWidth;
        top.style.transition = "";
        top.style.opacity = order.indexOf(top) > 5 ? "0" : "1";
        busy = false;
      }, 380);
    }
    function prev() {
      if (busy) return;
      order.unshift(order.pop());
      shown = (shown - 2 + n) % n + 1;
      layout();
    }
    var startX = 0, startY = 0, dx = 0, dragging = false, pid = null;
    deck.addEventListener("pointerdown", function (e) {
      var top = order[0];
      if (!top.contains(e.target) || busy) return;
      dragging = true; pid = e.pointerId; startX = e.clientX; startY = e.clientY; dx = 0;
      top.classList.add("is-dragging");
      deck.setPointerCapture(pid);
    });
    deck.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pid) return;
      dx = e.clientX - startX;
      var dy = (e.clientY - startY) * 0.3;
      order[0].style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (-1.5 + dx / 14) + "deg)";
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      var top = order[0];
      top.classList.remove("is-dragging");
      if (Math.abs(dx) > 90) next(dx > 0 ? 1 : -1);
      else { layout(); if (Math.abs(dx) < 6) next(1); }
    }
    deck.addEventListener("pointerup", end);
    deck.addEventListener("pointercancel", function () { dragging = false; order[0].classList.remove("is-dragging"); layout(); });
    var nb = $("[data-flick-next]", flick), pb = $("[data-flick-prev]", flick);
    if (nb) nb.addEventListener("click", function () { next(1); });
    if (pb) pb.addEventListener("click", prev);
    flick.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });
    layout();
  });

  // ---------- lightbox ----------
  var dlg = $("[data-lightbox]");
  if (dlg && typeof dlg.showModal === "function") {
    var stage = $("[data-lightbox-stage]", dlg), cap = $("[data-lightbox-caption]", dlg), count = $("[data-lightbox-count]", dlg);
    var list = [], idx = 0;
    function render() {
      var a = list[idx];
      stage.innerHTML = "";
      var full = a.getAttribute("data-full");
      if (full) {
        var img = document.createElement("img");
        img.src = full;
        img.alt = a.getAttribute("data-caption") || "";
        stage.appendChild(img);
      } else {
        var ph = a.querySelector(".img").cloneNode(true);
        stage.appendChild(ph);
      }
      cap.textContent = a.getAttribute("data-caption") || "";
      count.textContent = (idx + 1) + " / " + list.length;
    }
    function go(d) { idx = (idx + d + list.length) % list.length; render(); }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest(".g-link");
      if (!a) return;
      e.preventDefault();
      var scope = a.closest("[data-gallery]") || document;
      list = $$(".g-link", scope).filter(function (x) { return !x.hidden; });
      idx = Math.max(0, list.indexOf(a));
      render();
      dlg.showModal();
      document.body.classList.add("menu-open");
    });
    dlg.addEventListener("close", function () { document.body.classList.remove("menu-open"); stage.innerHTML = ""; });
    $("[data-lightbox-close]", dlg).addEventListener("click", function () { dlg.close(); });
    $("[data-lightbox-prev]", dlg).addEventListener("click", function () { go(-1); });
    $("[data-lightbox-next]", dlg).addEventListener("click", function () { go(1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target === stage) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });
    var x0 = null;
    dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }
})();
