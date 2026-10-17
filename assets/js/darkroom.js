// The Darkroom: photos develop in a tray of liquid under a safelight.
// Plain WebGL 1, no dependencies. Falls back to a still photo without WebGL or with reduced motion.
(function () {
  "use strict";
  var sections = document.querySelectorAll("[data-darkroom]");
  if (!sections.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VERT = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision mediump float;",
    "uniform sampler2D uA,uB;uniform vec2 uRes,uSA,uSB;uniform float uMix,uDev,uT;uniform vec3 uD[12];varying vec2 v;",
    "vec2 cover(vec2 uv,vec2 s){float rs=uRes.x/uRes.y,ri=s.x/s.y;vec2 k=rs>ri?vec2(1.,ri/rs):vec2(rs/ri,1.);return (uv-.5)*k+.5;}",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}",
    "vec3 dev(vec3 c,float d){float l=dot(c,vec3(.299,.587,.114));vec3 s=vec3(l)*vec3(1.08,.92,.76);vec3 w=mix(vec3(.93,.86,.78),s,.5);return mix(w,c,d);}",
    "void main(){",
    " vec2 uv=v;vec2 a=vec2(uRes.x/uRes.y,1.);vec2 o=vec2(0.);float glint=0.;",
    " for(int i=0;i<12;i++){vec3 d=uD[i];float age=uT-d.z;if(age<0.||age>4.5)continue;",
    "  vec2 dv=(uv-d.xy)*a;float r=length(dv);float front=age*.32;",
    "  float ring=exp(-pow((r-front)*9.,2.));float w=sin((r-front)*95.)*ring*exp(-age*1.05)*d.z/max(d.z,.0001);",
    "  o+=dv/(r+.0001)/a*w*.024;glint+=max(w,0.)*.6;}",
    " o+=vec2(sin(uv.y*8.+uT*.55),cos(uv.x*6.5+uT*.45))*.0022;",
    " vec2 q=uv+o;",
    " vec3 ca=vec3(texture2D(uA,cover(q+vec2(.0015,0.),uSA)).r,texture2D(uA,cover(q,uSA)).g,texture2D(uA,cover(q-vec2(.0015,0.),uSA)).b);",
    " vec3 cb=vec3(texture2D(uB,cover(q+vec2(.0015,0.),uSB)).r,texture2D(uB,cover(q,uSB)).g,texture2D(uB,cover(q-vec2(.0015,0.),uSB)).b);",
    " float nz=n(uv*3.5+uT*.04)*.75+n(uv*11.)*.25;float t=smoothstep(nz-.09,nz+.09,uMix*1.25-.12);",
    " vec3 c=mix(ca,dev(cb,uDev),t);",
    " float vg=smoothstep(1.15,.28,length((uv-.5)*vec2(1.05,1.)));",
    " c*=mix(.22,1.,vg);c+=vec3(.32,.04,.03)*(1.-vg)*.7;",
    " c+=vec3(1.,.82,.7)*glint*.25;",
    " c+=(h(uv*uRes+fract(uT)*91.)-.5)*.055;",
    " gl_FragColor=vec4(c,1.);}"
  ].join("\n");

  function setup(section) {
    var canvas = section.querySelector("canvas");
    var items = Array.prototype.slice.call(section.querySelectorAll("[data-darkroom-src]"));
    var capEl = section.querySelector("[data-darkroom-caption]");
    var countEl = section.querySelector("[data-darkroom-count]");
    var nextBtn = section.querySelector("[data-darkroom-next]");
    var gl = !reduce && canvas && canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl || !items.length) { section.classList.add("no-webgl"); return; }

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { section.classList.add("no-webgl"); return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uA", "uB", "uRes", "uSA", "uSB", "uMix", "uDev", "uT", "uD"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);

    function tex(source) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([22, 13, 11]));
      return t;
    }
    var dark = { t: tex(null), w: 1, h: 1 };
    var cache = {};
    var big = window.innerWidth > 900;
    function load(i) {
      if (cache[i]) return cache[i];
      cache[i] = new Promise(function (res) {
        var img = new Image();
        img.decoding = "async";
        img.onload = function () { res({ t: tex(img), w: img.naturalWidth, h: img.naturalHeight }); };
        img.onerror = function () { res(dark); };
        img.src = items[i].getAttribute(big ? "data-darkroom-src" : "data-darkroom-src-sm") || items[i].getAttribute("data-darkroom-src");
      });
      return cache[i];
    }

    var A = dark, B = dark, mix = 0, devp = 0, idx = -1, busy = false, t0 = performance.now(), lastTouch = 0;
    var drops = new Float32Array(36), di = 0;
    function now() { return (performance.now() - t0) / 1000; }
    function drop(x, y) {
      drops[di * 3] = x; drops[di * 3 + 1] = y; drops[di * 3 + 2] = Math.max(now(), 0.001);
      di = (di + 1) % 12;
    }
    function show(i) {
      if (busy) return;
      busy = true;
      idx = (i + items.length) % items.length;
      load(idx).then(function (img) {
        B = img; mix = 0; devp = 0;
        var start = performance.now();
        drop(0.5, 0.52);
        (function anim() {
          var e = (performance.now() - start) / 1000;
          mix = Math.min(1, e / 1.8);
          devp = Math.min(1, Math.max(0, (e - 0.3) / 2.6));
          if (e < 3) requestAnimationFrame(anim);
          else { A = B; mix = 0; devp = 1; busy = false; load((idx + 1) % items.length); }
        })();
        if (capEl) capEl.textContent = items[idx].getAttribute("data-caption") || "";
        if (countEl) countEl.textContent = String(idx + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
      });
    }

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.round(section.clientWidth * dpr), h = Math.round(section.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    var running = false;
    function frame() {
      if (!running) return;
      size();
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uSA, A.w, A.h); gl.uniform2f(U.uSB, B.w, B.h);
      gl.uniform1f(U.uMix, mix); gl.uniform1f(U.uDev, devp); gl.uniform1f(U.uT, now());
      gl.uniform3fv(U.uD, drops);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }
    var started = false, timer = null;
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting && !document.hidden;
      if (vis && !running) { running = true; requestAnimationFrame(frame); }
      if (!vis) running = false;
      if (vis && !started) { started = true; show(0); }
      clearInterval(timer);
      if (vis) timer = setInterval(function () { if (performance.now() - lastTouch > 4500) show(idx + 1); }, 7200);
    }, { threshold: 0.15 }).observe(section);
    document.addEventListener("visibilitychange", function () { if (document.hidden) running = false; });

    var lastDrop = { x: -1, y: -1, t: 0 };
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    section.addEventListener("pointermove", function (e) {
      var p = pos(e), t = performance.now();
      var dx = (p.x - lastDrop.x) * section.clientWidth, dy = (p.y - lastDrop.y) * section.clientHeight;
      if (dx * dx + dy * dy > 1600 || t - lastDrop.t > 260) { drop(p.x, p.y); lastDrop = { x: p.x, y: p.y, t: t }; }
      lastTouch = t;
    }, { passive: true });
    section.addEventListener("pointerdown", function (e) { var p = pos(e); drop(p.x, p.y); drop(p.x, p.y); lastTouch = performance.now(); });
    canvas.addEventListener("click", function () { show(idx + 1); lastTouch = performance.now(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { show(idx + 1); lastTouch = performance.now(); });
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); running = false; section.classList.add("no-webgl"); });
  }
  Array.prototype.forEach.call(sections, setup);
})();
