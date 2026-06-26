<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo/periplum-lockup-dark.svg">
  <img src="logo/periplum-lockup.svg" alt="Periplum" height="60">
</picture>

# Periplum

A small, config-driven engine for **chronological history maps**: a sequence of named,
dated points placed on one or more basemaps — Earth, the Moon, Mars, or the celestial
sphere — connected as a route, with timeline playback and a date slider.

> *periplum* — evoking the ancient Greek περίπλους (*periplous*, "a sailing-around"): an
> account of a coastal voyage, listing places in the order they are reached.

## Use it

### Easiest: start from the template

Don't wire anything up by hand — use the **[periplum template](https://github.com/periplum/periplum)**:

1. On [periplum/periplum](https://github.com/periplum/periplum), click **“Use this template” → Create a new repository**.
2. Edit **`index.html`** (title, `basemaps`, `statusColors` / `statusIcons`) and **`data.json`** (your points).
3. **Settings → Pages →** deploy from `main`. Your map is live at `https://YOUR-USER.github.io/YOUR-REPO/`.

The template already pins this engine, ships the auto-update workflows (engine-version bump + data refresh), and works out of the box. See the live showcases: [magellan](https://github.com/periplum/magellan), [worldcup-soccer](https://github.com/periplum/worldcup-soccer), [lunar](https://github.com/periplum/lunar), [exoplanets](https://github.com/periplum/exoplanets), [olympics](https://github.com/periplum/olympics).

### Or wire it up by hand

Load Leaflet, then this engine, then call `Periplum.render(config)`:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/gh/periplum/periplum-core@v0.3.4/dist/periplum.js"
        integrity="sha384-8VbzNqGez//sGxFfaGNwxViCSNxylx9LPaTRCro0/+GyBsrjFwduCbRfHT/87CI+"
        crossorigin="anonymous"></script>
<script>
Periplum.render({
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

**Already have data in another shape?** Pass `adapt: (raw) => items[]` to transform whatever
your `dataUrl` returns into the canonical items — no separate build step or duplicated data
file needed. (Or pass `data:` directly to skip the fetch.) This is how the
[Tezos](https://github.com/oyatrino/tezosprotocolmap) and
[Ethereum](https://github.com/oyatrino/ethupgrademap) upgrade maps consume Periplum from
their existing JSON.

## Basemap types

- `tiles` — an XYZ tile layer (Earth via OSM; Moon/Mars via planetary tile servers).
  Optional `crs: "EPSG4326"`, `subdomains`, `noWrap`, `tms`.
- `image` — a single equirectangular image overlay (great for a global Moon/Mars map);
  uses `imageUrl` and `bounds` (default whole globe), rendered in `L.CRS.EPSG4326`.
- `celestial` — the RA/Dec star-chart renderer (constellations + bright stars for
  orientation). Placements use `ra`/`dec`.

Marker styling: colour by `statusColors`, or set `statusIcons` (status → emoji, e.g.
`{ "Summer": "☀️", "Winter": "❄️" }`) for glyph markers.

## Showcase consumers

- [periplum/magellan](https://github.com/periplum/magellan) — Magellan's circumnavigation
  (Earth, static).
- [periplum/lunar](https://github.com/periplum/lunar) — crewed & robotic Moon landings
  (Moon, updated from Wikidata).
- [periplum/worldcup-soccer](https://github.com/periplum/worldcup-soccer) — World Cup host
  cities (Earth).

Start your own from the **[periplum template](https://github.com/periplum/periplum)**
("Use this template"). Released by git tag; served via jsDelivr. Pin a version in your consumer.

## License & credits

MIT © Corentin Méhat ([@cmehat](https://github.com/cmehat)) / [Oyatrino Solutions](https://github.com/oyatrino).
