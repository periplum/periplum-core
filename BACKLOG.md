# Periplum backlog

## Engine
- [x] **Dateline-crossing routes** — routes now unwrap longitude so a Pacific crossing /
  circumnavigation takes the short path across the antimeridian instead of the long way
  across the map. (fixed in v0.1.1)
- [ ] **Celestial basemap renderer** — RA/Dec star chart with constellations & bright
  stars (port from ethupgrademap). Needed for the Exoplanets showcase. → v0.2.0
- [ ] **Glyph/icon markers** — per-status emoji/symbol markers (e.g. ☀️ summer / ❄️ winter
  Olympics) via `statusIcons` config. → v0.2.0
- [ ] Optional: fit-to-route on load for very wide (round-the-world) datasets.

## Showcase datasets to map
- **Earth:** Antarctic race (Amundsen vs Scott), Darwin's *Beagle*, Shackleton, Lewis &
  Clark; UNESCO World Heritage by inscription year; total-solar-eclipse paths; live USGS
  earthquakes / Smithsonian volcanoes.
- **Sky:** historical supernovae (Crab 1054, Tycho 1572, Kepler 1604, SN1987A); comet
  apparitions; Messier objects.
- **Multi-body showpiece:** "Robotic landings across the Solar System" — switch basemaps
  between Venus (Venera), Moon, Mars, Titan (Huygens), comet 67P (Philae).

## In progress / planned consumers
- [x] periplum/magellan (Earth, static)
- [ ] periplum/worldcup_fifa (Earth, evolving ~4yr)
- [ ] periplum/lunar (Moon, evolving via Wikidata)
- [ ] periplum/exoplanets (celestial, evolving via NASA Exoplanet Archive) — needs v0.2.0
- [ ] periplum/olympics (Earth, ☀️/❄️ icons) — needs v0.2.0
- [ ] periplum/template ("Use this template" skeleton)
