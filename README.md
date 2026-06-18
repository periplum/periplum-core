# Periplus

A small, config-driven engine for **chronological history maps**: a sequence of named,
dated points placed on one or more basemaps — Earth, the Moon, Mars, or the celestial
sphere — connected as a route, with timeline playback and a date slider.

> *Periplus* (Greek περίπλους, "a sailing-around") — an ancient manuscript that listed
> places in the order a voyage reached them. This tool is the same idea, interactive.

## Use it

Load Leaflet, then this engine, then call `Periplus.render(config)`:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/gh/oyatrino/periplus@v0.1.0/dist/periplus.js"></script>
<script>
Periplus.render({
  title: "My voyage",
  dataUrl: "data.json",
  repo: "https://github.com/me/my-map",
  basemaps: [
    { id: "earth", name: "🌍 Earth", type: "tiles",
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap", minZoom: 2, initialView: [10, 0], initialZoom: 2 }
  ],
  statusColors: { "outbound": "#1f77b4", "return": "#2ca02c" }
});
</script>
```

## Data contract (`dataUrl` → JSON)

```jsonc
{ "items": [
  { "name": "Strait of Magellan", "date": "1520-10-21", "status": "outbound",
    "pairing": null,
    "placements": [
      { "map": "earth", "lat": -52.4, "lon": -68.4, "label": "Strait of Magellan",
        "popup": { "Event": "Entered the strait" } }
    ] } ] }
```

Each item carries one or more `placements`, each tied to a basemap `id`. Tile/image
basemaps use `lat`/`lon`; celestial basemaps use `ra`/`dec`.

## Basemap types

- `tiles` — an XYZ tile layer (Earth via OSM; Moon/Mars via planetary tile servers).
  Optional `crs: "EPSG4326"`, `subdomains`, `noWrap`, `tms`.
- `image` — a single equirectangular image overlay (great for a global Moon/Mars map);
  uses `imageUrl` and `bounds` (default whole globe), rendered in `L.CRS.EPSG4326`.
- `celestial` — (planned) the RA/Dec star-chart renderer.

## Consumers

- [periplus-magellan](https://github.com/oyatrino/periplus-magellan) — Magellan's
  circumnavigation (Earth, static).
- [periplus-lunar](https://github.com/oyatrino/periplus-lunar) — crewed & robotic Moon
  landings (Moon, updated from Wikidata).

Released by git tag; served via jsDelivr (`@v0.1.0`). Pin a version in your consumer.
