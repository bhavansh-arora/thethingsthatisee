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

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- header: scrolled / hide on scroll down, sticky mobile CTA ----------
  var header = $(".site-header");
  var sticky = $(".sticky-cta");
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
      var hide = y > 480 && y > lastY + 4 && !document.body.classList.contains("menu-open");
      if (hide) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 480) header.classList.remove("is-hidden");
    }
    if (sticky) {
      var nearBottom = window.innerHeight + y > document.body.scrollHeight - 520;
      sticky.classList.toggle("is-visible", y > window.innerHeight * 0.7 && !nearBottom);
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // ---------- mobile menu ----------
  var toggle = $(".menu-toggle"), menu = $("#mobile-menu");
  function setMenu(open, fromKeyboard) {
    if (!toggle || !menu) return;
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    if (open) {
      header.classList.remove("is-hidden");
      // Move focus into the menu only for keyboard users; a tap should not leave a focus ring on the first link.
      var first = $("a", menu);
      if (first && fromKeyboard) setTimeout(function () { first.focus(); }, 300);
    }
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function (e) { setMenu(!document.body.classList.contains("menu-open"), e.detail === 0); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1140) setMenu(false); });
  }

  // ---------- sessions dropdown ----------
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
    if (document.body.classList.contains("menu-open")) { setMenu(false); toggle.focus(); }
    if (subBtn) { subBtn.parentElement.classList.remove("is-open"); subBtn.setAttribute("aria-expanded", "false"); }
  });

  // ---------- split headlines into masked words ----------
  // Each <br>-separated line becomes a row; every word rises in on reveal.
  var wordIndex = 0;
  function splitWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          var w = document.createElement("span");
          w.className = "word";
          var inner = document.createElement("span");
          inner.textContent = part;
          inner.style.setProperty("--i", wordIndex++);
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === 1 && !child.hasAttribute("data-nosplit")) {
        splitWords(child);
      } else if (child.nodeType === 1) {
        child.classList.add("word-block");
        child.style.setProperty("--i", wordIndex++);
      }
    });
  }
  $$("[data-lines]").forEach(function (el) {
    wordIndex = 0;
    var hide = el.hasAttribute("aria-label") ? ' aria-hidden="true"' : "";
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p) { return '<span class="line"' + hide + ">" + p.trim() + "</span>"; }).join("");
    $$(".line", el).forEach(splitWords);
    el.classList.add("lines");
  });

  // ---------- reveal on scroll ----------
  var revealEls = $$(".reveal, .reveal-img, .lines");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---------- FAQ: smooth open/close ----------
  $$(".faq details").forEach(function (d) {
    var summary = $("summary", d), body = $(".faq__body", d);
    if (!summary || !body) return;
    summary.addEventListener("click", function (e) {
      if (reduceMotion) return;
      e.preventDefault();
      if (d.open) {
        body.style.height = body.scrollHeight + "px";
        requestAnimationFrame(function () {
          body.style.transition = "height .45s cubic-bezier(.16,1,.3,1)";
          body.style.height = "0px";
        });
        body.addEventListener("transitionend", function te() { d.open = false; body.style.cssText = ""; body.removeEventListener("transitionend", te); });
      } else {
        d.open = true;
        var h = body.scrollHeight;
        body.style.height = "0px";
        requestAnimationFrame(function () {
          body.style.transition = "height .55s cubic-bezier(.16,1,.3,1)";
          body.style.height = h + "px";
        });
        body.addEventListener("transitionend", function te() { body.style.cssText = ""; body.removeEventListener("transitionend", te); });
      }
    });
  });

  // ---------- year ----------
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- date and month fields: open the picker from anywhere in the box ----------
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!el.matches || !el.matches('input[type="date"], input[type="month"]') || el.disabled || el.readOnly) return;
    if (typeof el.showPicker === "function") { try { el.showPicker(); } catch (err) {} }
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
        document.dispatchEvent(new CustomEvent("ttis:filter", { detail: { target: target } }));
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
      document.body.classList.add("lb-open");
    });
    dlg.addEventListener("close", function () { document.body.classList.remove("lb-open"); stage.innerHTML = ""; });
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
