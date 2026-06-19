/*!
 * Periplum — a chronological history map across configurable basemaps
 * (Earth / Moon / Mars tiles, image overlays, celestial). v0.3.0
 *
 * By Corentin Méhat (@cmehat) / oyatrino · MIT License
 *
 * Usage (in a consumer page, after loading Leaflet):
 *   Periplum.render({ title, dataUrl, repo, basemaps:[…], statusColors:{…}, theme:{…}, seo:{…}, favicon })
 *
 * Data (dataUrl -> JSON): { items: [ { name, date, status, pairing?,
 *   placements: [ { map, lat, lon, label, popup:{…} } ] } ] }
 *   ('map' matches a basemap id. Celestial placements use ra/dec instead of lat/lon.)
 */
(function (global) {
  "use strict";
  var DAY_MS = 86400000;
  var PLAY_MS = 900;

  function esc(s) { var e = document.createElement("span"); e.textContent = s == null ? "" : s; return e.innerHTML; }
  function utcDayStart(ms) { return Math.floor(ms / DAY_MS) * DAY_MS; }

  // ---- <head> injection (title, SEO, favicon, theme) ----
  function injectHead(cfg) {
    if (cfg.title) document.title = cfg.title;
    var seo = cfg.seo || {};
    function meta(attr, key, val) {
      if (!val) return;
      var el = document.createElement("meta"); el.setAttribute(attr, key); el.content = val; document.head.appendChild(el);
    }
    meta("name", "description", seo.description);
    meta("name", "viewport", "width=device-width, initial-scale=1.0");
    meta("property", "og:title", cfg.title);
    meta("property", "og:description", seo.description);
    meta("property", "og:type", "website");
    if (seo.image) meta("property", "og:image", seo.image);
    meta("name", "twitter:card", seo.image ? "summary_large_image" : "summary");
    if (seo.image) meta("name", "twitter:image", seo.image);
    if (cfg.theme && cfg.theme.headerBg) meta("name", "theme-color", cfg.theme.headerBg);
    if (cfg.favicon) {
      var ic = document.createElement("link"); ic.rel = "icon"; ic.href = cfg.favicon; document.head.appendChild(ic);
    }
    var css = document.createElement("style");
    var hb = (cfg.theme && cfg.theme.headerBg) || "#1a1a2e";
    var ac = (cfg.theme && cfg.theme.accent) || "#4da3ff";
    css.textContent =
      "html,body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
      "#pp-title{height:42px;display:flex;align-items:center;gap:10px;padding:0 14px;background:" + hb + ";color:#fff;font-size:14px;font-weight:600}" +
      "#pp-count{opacity:.6;font-weight:400}.pp-spacer{margin-left:auto}" +
      "#pp-title a.pp-gh{color:#fff;opacity:.65;display:flex;align-items:center}#pp-title a.pp-gh:hover{opacity:1}" +
      "#pp-switch{display:flex;border:1px solid rgba(255,255,255,.25);border-radius:6px;overflow:hidden}" +
      "#pp-switch button{background:transparent;color:#dfe3ee;border:none;padding:5px 12px;font-size:13px;cursor:pointer}" +
      "#pp-switch button.active{background:" + ac + ";color:#06121f;font-weight:600}" +
      ".pp-view{position:absolute;left:0;right:0;bottom:0;top:42px;display:none}.pp-view.active{display:block}" +
      ".pp-legend,.pp-slider{background:rgba(255,255,255,.95);padding:8px 12px;border-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.3);font-size:12px;line-height:1.6}" +
      ".pp-legend i{width:11px;height:11px;display:inline-block;margin-right:6px;border-radius:50%;vertical-align:middle}" +
      ".pp-legend .ln{width:18px;height:0;border-top:2px dashed #888;display:inline-block;margin-right:6px;vertical-align:middle}" +
      ".pp-dark .pp-legend,.pp-dark .pp-slider{background:rgba(12,14,26,.92);color:#dde}" +
      ".playback-control a{background:#1f1f2b;color:#cfcfe0;width:32px;height:32px;line-height:32px;text-align:center;font-size:16px;display:block;border-radius:4px;text-decoration:none;box-shadow:0 1px 4px rgba(0,0,0,.4)}" +
      ".playback-control a:hover{background:#2a2a3a}" +
      ".leaflet-tooltip.pp-label{background:transparent;border:none;box-shadow:none;font-weight:600;font-size:11px;padding:0}" +
      ".pp-img-bm .leaflet-tooltip.pp-label{color:#fff;text-shadow:0 0 4px #000,0 0 4px #000}" +
      ".leaflet-popup-content{font-size:13px;line-height:1.5}.pp-pair{display:inline-block;background:#eef4ff;color:#1b5fb0;border-radius:3px;padding:0 5px;font-size:11px;font-weight:600}" +
      ".pp-sky .leaflet-container{background:#05060f}" +
      ".leaflet-tooltip.pp-refstar{background:transparent;border:none;box-shadow:none;color:#aeb8e8;font-size:10px;padding:0;text-shadow:0 0 4px #000}" +
      ".leaflet-tooltip.pp-constel{background:transparent;border:none;box-shadow:none;color:#5b6bb0;font-size:11px;font-style:italic;letter-spacing:1px;padding:0;text-transform:uppercase}" +
      ".leaflet-div-icon.pp-glyph{background:none;border:none;box-shadow:none;font-size:18px;line-height:24px;text-align:center}";
    document.head.appendChild(css);
  }

  // ---- DOM scaffold: header + one container per basemap ----
  function buildDom(cfg) {
    var t = document.createElement("div"); t.id = "pp-title";
    t.innerHTML = "<span>" + esc(cfg.title || "Periplum") + "</span><span id='pp-count'></span>" +
      "<span class='pp-spacer'></span>";
    var sw = document.createElement("div"); sw.id = "pp-switch"; sw.setAttribute("role", "group"); sw.setAttribute("aria-label", "Switch basemap");
    t.appendChild(sw);
    if (cfg.repo) {
      var a = document.createElement("a"); a.className = "pp-gh"; a.href = cfg.repo; a.target = "_blank"; a.rel = "noopener noreferrer"; a.setAttribute("aria-label", "Source repository");
      a.innerHTML = "<svg height='20' width='20' viewBox='0 0 16 16' fill='currentColor'><path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.64 7.64 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z'/></svg>";
      t.appendChild(a);
    }
    document.body.appendChild(t);
    cfg.basemaps.forEach(function (bm) {
      var d = document.createElement("div"); d.className = "pp-view"; d.id = "pp-view-" + bm.id; document.body.appendChild(d);
    });
  }

  // ---- basemap construction ----
  // ---- Celestial reference sky (real bright stars + constellations, shared) ----
  function skyXY(ra, dec) { return [dec, -ra]; }
  var PP_CONSTEL = [
    { name: "Orion", label: [84, -4], lines: [[0,1],[0,4],[1,6],[4,5],[5,6],[4,3],[6,2]],
      stars: [[88.79,7.41,0.5],[81.28,6.35,1.6],[78.63,-8.20,0.1],[86.94,-9.67,2.1],[85.19,-1.94,1.7],[84.05,-1.20,1.7],[83.00,-0.30,2.2]] },
    { name: "Cygnus", label: [304, 36], lines: [[0,1],[1,4],[3,1],[1,2]],
      stars: [[310.36,45.28,1.3],[305.56,40.26,2.2],[311.55,33.97,2.5],[296.24,45.13,2.9],[292.68,27.96,3.1]] },
    { name: "Aquila", label: [296, 4], lines: [[1,0],[0,2],[0,3],[0,4],[0,5]],
      stars: [[297.70,8.87,0.8],[296.56,10.61,2.7],[298.83,6.41,3.7],[291.37,3.11,3.4],[286.35,13.86,3.0],[302.83,-0.82,3.2]] },
    { name: "Auriga", label: [82, 41], lines: [[0,1],[1,2],[2,3],[3,4],[4,0]],
      stars: [[79.17,46.00,0.1],[89.88,44.95,1.9],[89.93,37.21,2.6],[81.57,28.61,1.6],[74.95,33.17,2.7]] },
    { name: "Cassiopeia", label: [13, 66], lines: [[0,1],[1,2],[2,3],[3,4]],
      stars: [[2.29,59.15,2.3],[10.13,56.54,2.2],[14.18,60.72,2.2],[21.45,60.24,2.7],[28.60,63.67,3.4]] },
    { name: "Ursa Major", label: [185, 62], lines: [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]],
      stars: [[165.93,61.75,1.8],[165.46,56.38,2.4],[178.46,53.69,2.4],[183.86,57.03,3.3],[193.51,55.96,1.8],[200.98,54.93,2.0],[206.89,49.31,1.9]] },
    { name: "Taurus", label: [66, 12], lines: [[0,1],[0,2],[0,3]],
      stars: [[68.98,16.51,0.9],[64.74,15.63,3.6],[67.15,19.18,3.5],[81.57,28.61,1.6]] }
  ];
  var PP_REFSTARS = [[279.23,38.78,0.0,"Vega"],[213.92,19.18,0.0,"Arcturus"],[152.09,11.97,1.4,"Regulus"],[116.33,28.03,1.2,"Pollux"],[114.83,5.22,0.3,"Procyon"]];
  var PP_PLEIADES = [[56.87,24.11,2.9],[56.46,24.37,3.9],[57.29,24.05,3.6],[56.58,23.95,4.2],[56.30,24.47,4.3]];
  var PP_TRIANGLE = [[279.23,38.78],[310.36,45.28],[297.70,8.87]];
  function ppMagR(m) { return Math.max(0.7, 3.4 - 0.45 * m); }
  function ppBgStar(map, s) {
    var mk = L.circleMarker(skyXY(s[0], s[1]), { radius: ppMagR(s[2]), stroke: false, fillColor: "#e9eeff", fillOpacity: 0.95, interactive: false }).addTo(map);
    if (s[3]) mk.bindTooltip(s[3], { permanent: true, direction: "right", className: "pp-refstar", offset: [4, 0] });
  }
  function drawCelestialSky(map) {
    var seed = 20240313; function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < 160; i++) L.circleMarker(skyXY(rnd() * 360, rnd() * 180 - 90), { radius: rnd() * 0.9 + 0.3, stroke: false, fillColor: "#aab4e6", fillOpacity: rnd() * 0.4 + 0.12, interactive: false }).addTo(map);
    var g = { color: "#202a4d", weight: 0.5, interactive: false };
    for (var ra = 0; ra <= 360; ra += 30) L.polyline([skyXY(ra, -90), skyXY(ra, 90)], g).addTo(map);
    for (var dec = -60; dec <= 60; dec += 30) L.polyline([skyXY(0, dec), skyXY(360, dec)], g).addTo(map);
    L.polyline([skyXY(0, 0), skyXY(360, 0)], { color: "#34407a", weight: 1, dashArray: "4 5", interactive: false }).addTo(map);
    L.polyline(PP_TRIANGLE.concat([PP_TRIANGLE[0]]).map(function (p) { return skyXY(p[0], p[1]); }), { color: "#3b4a86", weight: 0.8, dashArray: "2 6", interactive: false }).addTo(map);
    PP_CONSTEL.forEach(function (c) {
      c.lines.forEach(function (ln) { var a = c.stars[ln[0]], b = c.stars[ln[1]]; L.polyline([skyXY(a[0], a[1]), skyXY(b[0], b[1])], { color: "#46568f", weight: 0.9, opacity: 0.7, interactive: false }).addTo(map); });
      c.stars.forEach(function (s) { ppBgStar(map, s); });
      L.circleMarker(skyXY(c.label[0], c.label[1]), { radius: 0, opacity: 0, fillOpacity: 0, interactive: false }).addTo(map).bindTooltip(c.name, { permanent: true, direction: "center", className: "pp-constel" });
    });
    PP_REFSTARS.forEach(function (s) { ppBgStar(map, s); });
    PP_PLEIADES.forEach(function (s) { ppBgStar(map, s); });
    L.circleMarker(skyXY(56.5, 25.6), { radius: 0, opacity: 0, fillOpacity: 0, interactive: false }).addTo(map).bindTooltip("Pleiades", { permanent: true, direction: "center", className: "pp-constel" });
  }

  function makeMap(bm) {
    var div = document.getElementById("pp-view-" + bm.id);
    if (bm.type === "celestial") {
      var cm = L.map(div, { crs: L.CRS.Simple, minZoom: bm.minZoom != null ? bm.minZoom : -3, maxZoom: bm.maxZoom || 4, zoomSnap: 0.25, attributionControl: !!bm.attribution });
      drawCelestialSky(cm);
      var band = bm.bounds || [skyXY(0, -30), skyXY(360, 75)];
      div.classList.add("pp-img-bm", "pp-sky");
      bm._fit = function () { cm.fitBounds(band); };
      return cm;
    }
    if (bm.type === "image") {
      var bounds = bm.bounds || [[-90, -180], [90, 180]];
      var im = L.map(div, { crs: L.CRS.EPSG4326, minZoom: bm.minZoom != null ? bm.minZoom : 0, maxZoom: bm.maxZoom || 6, attributionControl: !!bm.attribution });
      L.imageOverlay(bm.imageUrl, bounds, { attribution: bm.attribution || "" }).addTo(im);
      im.setMaxBounds(bounds);
      div.classList.add("pp-img-bm");
      bm._fit = function () { im.fitBounds(bounds); };
      return im;
    }
    var opts = { worldCopyJump: true, minZoom: bm.minZoom != null ? bm.minZoom : 2, maxZoom: bm.maxZoom || 18 };
    if (bm.crs === "EPSG4326") opts.crs = L.CRS.EPSG4326;
    var m = L.map(div, opts);
    var layerOpts = { attribution: bm.attribution || "", maxZoom: opts.maxZoom, minZoom: opts.minZoom };
    if (bm.subdomains) layerOpts.subdomains = bm.subdomains;
    if (bm.noWrap) layerOpts.noWrap = true;
    if (bm.tms) layerOpts.tms = true;
    L.tileLayer(bm.tileUrl, layerOpts).addTo(m);
    var view = bm.initialView || [20, 0];
    m.setView(view, bm.initialZoom != null ? bm.initialZoom : opts.minZoom);
    if (bm.type === "image" || bm.crs === "EPSG4326") div.classList.add("pp-img-bm");
    bm._fit = null;
    return m;
  }

  function render(cfg) {
    if (typeof L === "undefined") { console.error("Periplum: Leaflet (L) must be loaded first."); return; }
    injectHead(cfg);
    buildDom(cfg);

    var maps = {};            // basemap id -> L.map
    var bmById = {};
    cfg.basemaps.forEach(function (bm) { bmById[bm.id] = bm; maps[bm.id] = makeMap(bm); });

    var statusColors = cfg.statusColors || {};
    var defaultColor = cfg.defaultColor || "#888888";
    var routeColor = cfg.routeColor || "#888888";
    function colorFor(status) { return statusColors[status] || defaultColor; }

    var items = [];
    var dyn = [];                       // dynamic layers, for clearing
    var routes = {};                    // basemap id -> {poly, coords}
    var sliderInputs = [], sliderLabels = [];
    var fitted = {};

    // Place a point, unwrapping longitude so a route takes the shorter path and
    // crosses the antimeridian correctly (e.g. a Pacific crossing / circumnavigation)
    // instead of drawing the long way across the map. `r.lastLon` carries a running
    // unwrapped longitude through the sequence so markers stay attached to the line.
    function placementLatLng(bm, p, r) {
      if (bm.type === "celestial") return [p.dec, -p.ra];
      var lon = p.lon;
      if (r && r.lastLon !== null && r.lastLon !== undefined) {
        while (lon - r.lastLon > 180) lon -= 360;
        while (lon - r.lastLon < -180) lon += 360;
      }
      if (r) r.lastLon = lon;
      return [p.lat, lon];
    }

    function popupHtml(it, p) {
      var rows = ["<strong>" + esc(it.name) + "</strong>"];
      if (it.pairing) rows.push(" <span class='pp-pair'>" + esc(it.pairing) + "</span>");
      rows.push("<br>" + (it.date ? esc(it.date) : "date TBD") + (it.status ? " &middot; " + esc(it.status) : ""));
      if (p && p.label) rows.push("<br>" + esc(p.label));
      var pop = (p && p.popup) || {};
      Object.keys(pop).forEach(function (k) { rows.push("<br>" + esc(k) + ": " + esc(pop[k])); });
      return rows.join("");
    }

    function addItem(i) {
      var it = items[i];
      (it.placements || []).forEach(function (p) {
        var bm = bmById[p.map]; if (!bm) return;
        var map = maps[p.map];
        var r = routes[p.map] || (routes[p.map] = { poly: null, coords: [], lastLon: null });
        var ll = placementLatLng(bm, p, r);
        var glyph = cfg.statusIcons && cfg.statusIcons[it.status];
        var mk = glyph
          ? L.marker(ll, { icon: L.divIcon({ html: glyph, className: "pp-glyph", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map).bindPopup(popupHtml(it, p))
          : L.circleMarker(ll, { radius: 7, fillColor: colorFor(it.status), color: "#fff", weight: 1.5, fillOpacity: 0.9 }).addTo(map).bindPopup(popupHtml(it, p));
        if (p.label) mk.bindTooltip(esc(p.label), { permanent: true, direction: "right", className: "pp-label", offset: [6, 0] });
        dyn.push(mk);
        r.coords.push(ll);
        if (r.poly) { r.poly.addLatLng(ll); }
        else if (r.coords.length > 1) { r.poly = L.polyline(r.coords, { color: routeColor, weight: 1.5, dashArray: "6 4", opacity: 0.6 }).addTo(map); dyn.push(r.poly); }
      });
    }

    function clearDynamic() {
      dyn.forEach(function (l) { cfg.basemaps.forEach(function (bm) { maps[bm.id].removeLayer(l); }); });
      dyn = []; routes = {};
    }

    function liveCount() { return items.filter(function (it) { return cfg.liveStatuses ? cfg.liveStatuses.indexOf(it.status) >= 0 : true; }).length; }
    function updateCount(shown) {
      var el = document.getElementById("pp-count");
      el.textContent = (shown < items.length) ? "— " + shown + " / " + items.length : "— " + items.length + " entries";
    }
    function showAll() { clearDynamic(); for (var i = 0; i < items.length; i++) addItem(i); updateCount(items.length); }

    // ---- playback ----
    var playBtns = [], playTimer = null, playIndex = 0, isPlaying = false;
    function setIcon() { playBtns.forEach(function (b) { b.textContent = isPlaying ? "⏸" : "▶"; b.setAttribute("aria-label", isPlaying ? "Pause timeline" : "Play timeline"); }); }
    function stopPlayback() { if (playTimer) { clearTimeout(playTimer); playTimer = null; } isPlaying = false; playIndex = 0; setIcon(); setSliderEnabled(true); }
    function playStep() { if (playIndex >= items.length) { stopPlayback(); return; } addItem(playIndex); updateCount(playIndex + 1); playIndex++; playTimer = setTimeout(playStep, PLAY_MS); }
    function togglePlayback() { if (isPlaying) { stopPlayback(); showAll(); return; } clearDynamic(); updateCount(0); isPlaying = true; playIndex = 0; setIcon(); setSliderEnabled(false); playStep(); }
    function PlaybackCtl() {
      return L.Control.extend({ options: { position: "topleft" }, onAdd: function () {
        var c = L.DomUtil.create("div", "playback-control leaflet-bar");
        var b = L.DomUtil.create("a", "", c); b.href = "#"; b.textContent = "▶"; b.setAttribute("role", "button"); b.setAttribute("aria-label", "Play timeline");
        L.DomEvent.disableClickPropagation(c);
        L.DomEvent.on(b, "click", function (e) { L.DomEvent.preventDefault(e); togglePlayback(); });
        L.DomEvent.on(b, "keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { L.DomEvent.preventDefault(e); togglePlayback(); } });
        playBtns.push(b); return c;
      } });
    }

    // ---- date slider ----
    function setSliderEnabled(on) {
      sliderInputs.forEach(function (inp) { inp.disabled = !on; inp.style.opacity = on ? "1" : "0.5"; });
      if (on && sliderInputs.length) { var mx = sliderInputs[0].max; sliderInputs.forEach(function (inp) { inp.value = mx; }); updateSliderLabel(Number(mx)); }
    }
    function updateSliderLabel(ts) {
      if (!sliderInputs.length) return;
      var mx = Number(sliderInputs[0].max), txt;
      if (ts >= mx) txt = "Full history";
      else { var d = new Date(ts); txt = "As of " + d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
      sliderLabels.forEach(function (l) { l.textContent = txt; });
    }
    function filterByDate(ts) {
      if (isPlaying) return;
      var atMax = ts >= Number(sliderInputs[0].max), day = utcDayStart(ts);
      clearDynamic(); var shown = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.date) { if (utcDayStart(new Date(it.date).getTime()) <= day) { addItem(i); shown++; } }
        else if (atMax) { addItem(i); shown++; }
      }
      updateCount(shown); updateSliderLabel(ts);
    }
    function SliderCtl(minTs, maxTs) {
      return L.Control.extend({ options: { position: "bottomleft" }, onAdd: function () {
        var c = L.DomUtil.create("div", "pp-slider");
        var lab = L.DomUtil.create("div", "", c); lab.style.cssText = "margin-bottom:6px;font-weight:600"; lab.textContent = "Full history";
        var inp = L.DomUtil.create("input", "", c); inp.type = "range"; inp.min = String(minTs); inp.max = String(maxTs); inp.value = String(maxTs); inp.step = String(DAY_MS);
        inp.style.cssText = "width:200px;cursor:pointer"; inp.setAttribute("aria-label", "Filter by date");
        L.DomEvent.disableClickPropagation(c); L.DomEvent.disableScrollPropagation(c);
        L.DomEvent.on(inp, "input", function () { sliderInputs.forEach(function (o) { if (o !== inp) o.value = inp.value; }); filterByDate(Number(inp.value)); });
        sliderInputs.push(inp); sliderLabels.push(lab); return c;
      } });
    }

    function addLegend(map) {
      var icons = cfg.statusIcons, keys = Object.keys(icons || statusColors);
      if (!keys.length) return;
      var lc = L.control({ position: "bottomright" });
      lc.onAdd = function () {
        var d = L.DomUtil.create("div", "pp-legend"); var html = "";
        keys.forEach(function (k) {
          html += (icons && icons[k])
            ? "<span style='margin-right:6px'>" + esc(icons[k]) + "</span>" + esc(k) + "<br>"
            : "<i style='background:" + (statusColors[k] || "#888") + "'></i>" + esc(k) + "<br>";
        });
        html += "<span class='ln'></span>" + esc(cfg.routeLabel || "Chronological route");
        d.innerHTML = html; L.DomEvent.disableClickPropagation(d); return d;
      };
      lc.addTo(map);
    }

    // ---- basemap switcher ----
    var sw = document.getElementById("pp-switch");
    var btns = {};
    function setBasemap(id) {
      cfg.basemaps.forEach(function (bm) {
        var on = bm.id === id;
        document.getElementById("pp-view-" + bm.id).classList.toggle("active", on);
        document.body.classList.toggle("pp-dark", on && (bm.type === "image" || bm.type === "celestial" || bm.dark));
        if (btns[bm.id]) { btns[bm.id].classList.toggle("active", on); btns[bm.id].setAttribute("aria-pressed", String(on)); }
        if (on) { maps[bm.id].invalidateSize(); if (!fitted[bm.id]) { if (bm._fit) bm._fit(); fitted[bm.id] = true; } }
      });
    }

    // `raw` is the fetched JSON (or cfg.data). cfg.adapt(raw) -> items[] lets a consumer
    // map a non-canonical source (e.g. an existing protocols.json) without a build step.
    function start(raw) {
      items = cfg.adapt ? (cfg.adapt(raw) || []) : ((raw && raw.items) || raw || []);
      cfg.basemaps.forEach(function (bm) {
        if (cfg.basemaps.length > 1) {
          var b = document.createElement("button"); b.textContent = bm.name || bm.id;
          b.setAttribute("aria-pressed", "false");
          b.addEventListener("click", function () { setBasemap(bm.id); });
          sw.appendChild(b); btns[bm.id] = b;
        }
        new (PlaybackCtl())().addTo(maps[bm.id]);
        addLegend(maps[bm.id]);
      });
      var dts = items.filter(function (it) { return it.date; }).map(function (it) { return new Date(it.date).getTime(); });
      if (dts.length) {
        var minTs = Math.min.apply(null, dts), maxTs = Date.now();
        cfg.basemaps.forEach(function (bm) { new (SliderCtl(minTs, maxTs))().addTo(maps[bm.id]); });
      }
      showAll();
      setBasemap(cfg.basemaps[0].id);
    }

    if (cfg.data) {
      start(cfg.data);
    } else {
      fetch(cfg.dataUrl).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(start)
        .catch(function (err) { console.error("Periplum: failed to load data:", err); });
    }
  }

  global.Periplum = { render: render, version: "0.3.0" };
})(window);
