(function () {
  "use strict";
  var T = window.TTIS, P = window.SITE_CONFIG.prices;
  var form = document.getElementById("estimate");
  if (!form) return;
  var lines = document.getElementById("summary-lines");
  var total = document.getElementById("summary-total");
  var barTotal = document.getElementById("bar-total");
  var send = document.getElementById("summary-send");
  var barSend = document.getElementById("bar-send");
  var bar = document.getElementById("summary-bar");
  var extraVid = form.querySelector("[name=extraVideographer]");

  function val(name) { var el = form.querySelector("[name=" + name + "]:checked"); return el ? el.value : ""; }
  function vals(name) { return Array.prototype.map.call(form.querySelectorAll("[name=" + name + "]:checked"), function (e) { return e.value; }); }

  function update() {
    var items = [], sum = 0;
    var cov = val("coverage");
    if (cov) { items.push([P.coverage[cov].name, P.coverage[cov].price]); }
    vals("extra").forEach(function (k) { items.push([P.extras[k].name, P.extras[k].price]); });
    var film = val("film");
    extraVid.disabled = film !== "v1";
    if (film !== "v1") extraVid.checked = false;
    if (film && film !== "none") items.push(["Film: " + P.film[film].name, P.film[film].price]);
    if (extraVid.checked) items.push([P.extraVideographer.name, P.extraVideographer.price]);
    lines.innerHTML = "";
    items.forEach(function (it) {
      sum += it[1];
      var li = document.createElement("li");
      li.innerHTML = "<span></span><span></span>";
      li.firstChild.textContent = it[0];
      li.lastChild.textContent = T.money(it[1]);
      lines.appendChild(li);
    });
    total.textContent = T.money(sum);
    barTotal.textContent = T.money(sum);
    var q = new URLSearchParams({ type: "wedding", coverage: cov });
    var ex = vals("extra");
    if (ex.length) q.set("extras", ex.join(","));
    if (film && film !== "none") q.set("film", film);
    if (extraVid.checked) q.set("extraVid", "1");
    send.href = barSend.href = "enquire.html?" + q.toString();
  }
  form.addEventListener("change", update);
  update();

  if (bar && "IntersectionObserver" in window) {
    document.body.classList.add("has-summary-bar");
    var summary = document.getElementById("summary");
    var inBuilder = false, summaryVisible = false;
    var sync = function () { bar.classList.toggle("is-visible", inBuilder && !summaryVisible); };
    new IntersectionObserver(function (es) { inBuilder = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(form);
    new IntersectionObserver(function (es) { summaryVisible = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(summary);
  }
})();
