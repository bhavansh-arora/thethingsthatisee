(function () {
  "use strict";
  var T = window.TTIS, P = window.SITE_CONFIG.prices, cfg = window.SITE_CONFIG;
  var form = document.getElementById("enquiry");
  if (!form) return;
  var panels = T.$$(".step-panel", form);
  var fill = document.getElementById("progress-fill");
  var stepsList = T.$$("#progress-steps li");
  var reply = document.getElementById("reply");
  var KEY = "ttis-enquiry";
  var step = 1;

  // ---------- state ----------
  function field(name) { return form.elements[name]; }
  function get(name) {
    var el = field(name);
    if (!el) return "";
    if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === "radio")) {
      var c = form.querySelector("[name=" + name + "]:checked");
      return c ? c.value : "";
    }
    return (el.value || "").trim();
  }
  function set(name, value) {
    var el = field(name);
    if (!el || value == null || value === "") return;
    var radios = form.querySelectorAll("[name=" + name + "]");
    if (radios.length && radios[0].type === "radio") {
      radios.forEach(function (r) { r.checked = r.value === value; });
    } else {
      el.value = value;
    }
  }
  var FIELDS = ["type", "date", "venue", "guests", "ceremony", "events", "film", "emonth", "elocation",
    "fmonth", "people", "flocation", "gradYear", "school", "senior", "name", "email", "phone", "heard", "message"];
  var preset = { coverage: "", extras: [], film: "", extraVid: false };

  function save() {
    var s = { step: step, preset: preset };
    FIELDS.forEach(function (f) { s[f] = get(f); });
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function restore() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
    if (s) {
      FIELDS.forEach(function (f) { set(f, s[f]); });
      if (s.preset) preset = s.preset;
    }
    var q = new URLSearchParams(location.search);
    if (q.get("type")) set("type", q.get("type"));
    if (q.get("date")) set("date", q.get("date"));
    if (q.get("coverage")) preset.coverage = q.get("coverage");
    if (q.get("extras")) preset.extras = q.get("extras").split(",");
    if (q.get("film")) { preset.film = q.get("film"); set("film", "yes"); }
    if (q.get("extraVid")) preset.extraVid = true;
    if (preset.coverage === "signature") set("events", "yes");
    if (preset.extras.indexOf("event") !== -1) set("events", "yes");
    return s && s.step && !q.toString() ? Math.min(s.step, 3) : (q.get("type") ? 2 : 1);
  }

  // ---------- availability ----------
  var dateInput = field("date"), avail = document.getElementById("avail");
  var today = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
  dateInput.min = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  function showAvail() {
    var v = dateInput.value;
    avail.className = "avail";
    if (!v || T.isPast(v)) { avail.hidden = true; return; }
    avail.hidden = false;
    if (T.isBooked(v)) {
      avail.classList.add("is-booked");
      avail.textContent = "Already booked. You can still send your enquiry and I'll reply with options.";
    } else {
      avail.classList.add("is-open");
      avail.textContent = T.formatDate(v) + " is open";
    }
  }
  dateInput.addEventListener("input", showAvail);
  dateInput.addEventListener("change", showAvail);

  // ---------- steps ----------
  function showSection() {
    var type = get("type") || "wedding";
    T.$$("[data-for]", form).forEach(function (s) { s.hidden = s.getAttribute("data-for") !== type; });
  }
  function go(n, focus) {
    step = n;
    panels.forEach(function (p) { p.hidden = Number(p.getAttribute("data-step")) !== n; });
    fill.style.width = (n * 25) + "%";
    stepsList.forEach(function (li, i) {
      li.classList.toggle("is-done", i + 1 < n);
      if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    if (n === 2) showSection();
    if (n === 3) renderMatch();
    save();
    if (focus !== false) {
      var h = panels[n - 1].querySelector("h2");
      var top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
      if (h) h.focus({ preventScroll: true });
    }
  }

  function err(name, msg) {
    var el = form.querySelector("[data-error=" + name + "]");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
    var input = field(name);
    if (input && input.setAttribute) msg ? input.setAttribute("aria-invalid", "true") : input.removeAttribute("aria-invalid");
  }
  function validate(n) {
    var ok = true;
    T.$$("[data-error]", panels[n - 1]).forEach(function (e) { e.hidden = true; });
    var type = get("type");
    if (n === 1 && !type) { err("type", "Choose what we're photographing to continue."); ok = false; }
    if (n === 2 && type === "wedding") {
      var d = get("date");
      if (!d) { err("date", "Add your wedding date. If it isn't set yet, choose your best guess."); ok = false; }
      else if (T.isPast(d)) { err("date", "That date has passed. Choose a date from today onward."); ok = false; }
      if (!get("guests")) { err("guests", "Choose a guest count."); ok = false; }
      if (!get("ceremony")) { err("ceremony", "Choose the kind of ceremony."); ok = false; }
    }
    if (n === 2 && type === "engagement" && !get("emonth")) { err("emonth", "Choose a month that suits you."); ok = false; }
    if (n === 2 && type === "family") {
      if (!get("fmonth")) { err("fmonth", "Choose a month that suits you."); ok = false; }
      if (!(Number(get("people")) > 0)) { err("people", "Enter how many people will be in the photos."); ok = false; }
    }
    if (n === 2 && type === "senior" && !get("gradYear")) { err("gradYear", "Choose a graduation year."); ok = false; }
    if (n === 4) {
      if (!get("name")) { err("name", "Add your name so I know who I'm writing to."); ok = false; }
      if (!T.validEmail(get("email"))) { err("email", "Enter an email address like name@example.com."); ok = false; }
    }
    if (!ok) {
      var first = panels[n - 1].querySelector("[aria-invalid=true], .field-error:not([hidden])");
      if (first && first.focus) first.focus();
    }
    return ok;
  }

  // ---------- recommendation ----------
  function buildMatch() {
    var type = get("type"), lines = [], why = [], name = "";
    function add(label, price, suggest) { lines.push({ label: label, price: price, suggest: !!suggest }); }
    if (type === "wedding") {
      var mass = get("ceremony") === "mass", large = get("guests") === "large";
      var cov = preset.coverage || (get("events") === "yes" ? "signature" : "classic");
      name = P.coverage[cov].name;
      add(P.coverage[cov].name, P.coverage[cov].price);
      why.push(cov === "signature"
        ? "The Signature Coverage includes your wedding day plus up to 3 hours at a rehearsal dinner or welcome party, a 10-year online gallery, and priority editing."
        : "The Classic Coverage is full wedding-day coverage by me, with an online gallery for 5 years and unlimited downloads.");
      var second = preset.extras.indexOf("second") !== -1 || mass || large;
      if (second) {
        add(P.extras.second.name, P.extras.second.price);
        name += " + second photographer";
        why.push(mass
          ? "During a full Mass, the important moments happen at the altar and in the pews at the same time. A second photographer catches both without moving around during the liturgy."
          : "With 150+ guests, a second photographer catches the reactions and alternate angles I can't be in two places for.");
      }
      if (preset.extras.indexOf("event") !== -1 && cov !== "signature") add(P.extras.event.name, P.extras.event.price);
      if (preset.extras.indexOf("engagement") !== -1) add(P.extras.engagement.name, P.extras.engagement.price);
      else add("Engagement session (optional)", P.extras.engagement.price, true);
      var film = get("film");
      if (film === "yes") {
        var f = P.film[preset.film] ? preset.film : "v2";
        add("Film: " + P.film[f].name, P.film[f].price);
        if (f === "v1" && preset.extraVid) add(P.extraVideographer.name, P.extraVideographer.price);
        if (!preset.film) why.push("For film, most couples choose The Narrative: a 4 to 5 minute film with music and dialogue, two videographers, and drone establishing shots.");
      } else if (film === "unsure") {
        add("Film (optional, from)", P.film.v1.price, true);
      }
    } else if (type === "engagement") {
      name = "Engagement session";
      add(P.extras.engagement.name, P.extras.engagement.price);
      why.push("A relaxed session to get comfortable in front of the camera before the big day. The photos are made for save-the-dates.");
    } else if (type === "family") {
      var people = Number(get("people")) || 0;
      var key = people >= 8 ? "deluxe" : "standard";
      name = P.family[key].name;
      add(P.family[key].name, P.family[key].price);
      why.push(key === "deluxe"
        ? "With " + people + " people, the Deluxe session gives us extra time, two or more locations, and room for outfit changes."
        : "Up to an hour at one location: enough time for the classic portrait and the candid, laughing ones too.");
      if (key === "standard") add("Or a 30-minute mini-session", P.family.mini.price, true);
    } else if (type === "senior") {
      var s = get("senior");
      var sk = P.senior[s] ? s : "signature";
      name = P.senior[sk].name;
      add(P.senior[sk].name, P.senior[sk].price);
      why.push(sk === "elite"
        ? "Up to 3 hours, two or more locations, multiple outfits, and 25+ fully edited images."
        : sk === "essentials"
        ? "Half an hour with posing help and 10 to 15 high-res images, with download and print rights."
        : "Up to 1.5 hours, multiple outfits, and 15 to 25 fully edited images. The one most seniors choose.");
    }
    var total = lines.filter(function (l) { return !l.suggest; }).reduce(function (a, l) { return a + l.price; }, 0);
    return { name: name, why: why, lines: lines, total: total };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderMatch() {
    var m = buildMatch();
    var html = '<span class="label label--dot">Recommended for you</span>' +
      '<p class="match-name">' + esc(m.name) + "</p>" +
      m.why.map(function (w) { return '<p class="match-why">' + esc(w) + "</p>"; }).join("") +
      '<ul class="match-lines">' + m.lines.map(function (l) {
        return '<li class="' + (l.suggest ? "is-suggest" : "") + '"><span>' + esc(l.label) + "</span><span>" + (l.suggest ? "+" : "") + T.money(l.price) + "</span></li>";
      }).join("") + "</ul>" +
      '<div class="match-total"><span class="label">Starting estimate</span><strong>' + T.money(m.total) + "</strong></div>";
    document.getElementById("match").innerHTML = html;
  }

  // ---------- submit + first reply ----------
  function renderReply(m) {
    var type = get("type"), d = get("date"), first = get("name").split(/\s|&|,/)[0];
    var headline, sub;
    if (type === "wedding" && d) {
      if (T.isBooked(d)) {
        headline = "Thank you, " + esc(first) + ".";
        sub = esc(T.formatDate(d)) + " is already booked, but I read every enquiry and I'll reply with options.";
      } else {
        headline = "Thank you, " + esc(first) + ". <em>Your date is open.</em>";
        sub = esc(T.formatDate(d)) + " is free on my calendar. I've noted it against your enquiry while we talk.";
      }
    } else {
      headline = "Thank you, " + esc(first) + ". <em>It's on its way.</em>";
      sub = "Your enquiry is with me now.";
    }
    var summary = [["Occasion", { wedding: "Wedding", engagement: "Engagement session", family: "Family session", senior: "Senior portraits" }[type]],
      ["Recommended", m.name], ["Starting estimate", T.money(m.total)], ["Reply to", get("email")]];
    reply.innerHTML =
      '<span class="label label--dot label--live">Enquiry received</span>' +
      '<h2 class="h-lg" tabindex="-1">' + headline + "</h2>" +
      "<p>" + sub + "</p>" +
      '<div class="reply-summary">' + summary.map(function (r) { return "<div><b>" + r[0] + ":</b> " + esc(r[1] || "") + "</div>"; }).join("") + "</div>" +
      '<ol class="steps">' +
      '<li class="step"><span class="step-num">I</span><h3 class="h-sm">I read it myself</h3><p>Every enquiry comes straight to me, and I reply ' + esc(cfg.replyWindow) + ".</p></li>" +
      '<li class="step"><span class="step-num">II</span><h3 class="h-sm">We talk it through</h3><p>A call or a coffee to hear your story, answer your questions, and shape the coverage around your day.</p></li>' +
      '<li class="step"><span class="step-num">III</span><h3 class="h-sm">Your date is held</h3><p>Once you&rsquo;re happy with the plan, I reserve your date and we start preparing together.</p></li>' +
      "</ol>" +
      '<div class="row">' +
      (type === "wedding" ? '<a class="btn btn--gold" href="guide.html">Read the Catholic wedding guide</a>' : '<a class="btn btn--gold" href="portfolio.html">Browse the portfolio</a>') +
      '<a class="btn btn--ghost" href="stories.html">Real stories</a></div>';
  }

  form.addEventListener("click", function (e) {
    if (e.target.closest("[data-next]")) { if (validate(step)) go(step + 1); }
    if (e.target.closest("[data-back]")) go(Math.max(1, step - 1));
  });
  form.addEventListener("change", function (e) {
    if (e.target.name === "type") {
      if (step === 1) setTimeout(function () { if (validate(1)) go(2); }, 160);
    }
    save();
  });
  form.addEventListener("input", save);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (step !== 4) { if (validate(step)) go(step + 1); return; }
    if (!validate(4)) return;
    if (form.elements.company && form.elements.company.value) return;
    var btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending…";
    var m = buildMatch();
    var payload = { form: "enquiry", page: location.pathname, recommendation: m };
    FIELDS.forEach(function (f) { var v = get(f); if (v) payload[f] = v; });
    T.submitForm(payload).then(function (ok) {
      btn.disabled = false;
      btn.textContent = "Send to Jason";
      if (!ok) { err("submit", "That didn't go through. Please try again, or email jason@thethingsthatisee.com."); return; }
      renderReply(m);
      form.hidden = true;
      reply.hidden = false;
      try { sessionStorage.removeItem(KEY); } catch (x) {}
      var top = reply.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: top, behavior: "smooth" });
      reply.querySelector("h2").focus({ preventScroll: true });
    });
  });

  var start = restore();
  showAvail();
  go(start, false);
})();
