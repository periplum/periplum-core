/*!
 * Periplus — a chronological history map across configurable basemaps
 * (Earth / Moon / Mars tiles, image overlays, celestial). v0.1.0
 *
 * Usage (in a consumer page, after loading Leaflet):
 *   Periplus.render({ title, dataUrl, repo, basemaps:[…], statusColors:{…}, theme:{…}, seo:{…}, favicon })
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
      ".leaflet-popup-content{font-size:13px;line-height:1.5}.pp-pair{display:inline-block;background:#eef4ff;color:#1b5fb0;border-radius:3px;padding:0 5px;font-size:11px;font-weight:600}";
    document.head.appendChild(css);
  }

  // ---- DOM scaffold: header + one container per basemap ----
  function buildDom(cfg) {
    var t = document.createElement("div"); t.id = "pp-title";
    t.innerHTML = "<span>" + esc(cfg.title || "Periplus") + "</span><span id='pp-count'></span>" +
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
  function makeMap(bm) {
    var div = document.getElementById("pp-view-" + bm.id);
    if (bm.type === "image") {
      var bounds = bm.bounds || [[-90, -180], [90, 180]];
      var im = L.map(div, { crs: L.CRS.EPSG4326, minZoom: bm.minZoom != null ? bm.minZoom : 0, maxZoom: bm.maxZoom || 6, attributionControl: !!bm.attribution });
      L.imageOverlay(bm.imageUrl, bounds).addTo(im);
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
    if (typeof L === "undefined") { console.error("Periplus: Leaflet (L) must be loaded first."); return; }
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

    function placementLatLng(bm, p) {
      if (bm.type === "celestial") return [p.dec, -p.ra];
      return [p.lat, p.lon];
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
        var ll = placementLatLng(bm, p);
        var mk = L.circleMarker(ll, { radius: 7, fillColor: colorFor(it.status), color: "#fff", weight: 1.5, fillOpacity: 0.9 })
          .addTo(map).bindPopup(popupHtml(it, p));
        if (p.label) mk.bindTooltip(esc(p.label), { permanent: true, direction: "right", className: "pp-label", offset: [6, 0] });
        dyn.push(mk);
        var r = routes[p.map] || (routes[p.map] = { poly: null, coords: [] });
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
      if (!cfg.statusColors) return;
      var lc = L.control({ position: "bottomright" });
      lc.onAdd = function () {
        var d = L.DomUtil.create("div", "pp-legend"); var html = "";
        Object.keys(statusColors).forEach(function (k) { html += "<i style='background:" + statusColors[k] + "'></i>" + esc(k) + "<br>"; });
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

    fetch(cfg.dataUrl).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        items = (data && data.items) || [];
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
      })
      .catch(function (err) { console.error("Periplus: failed to load data:", err); });
  }

  global.Periplus = { render: render, version: "0.1.0" };
})(window);
