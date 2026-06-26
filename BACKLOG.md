# Periplum backlog

## Engine
- [x] **Dateline-crossing routes** — routes now unwrap longitude so a Pacific crossing /
  circumnavigation takes the short path across the antimeridian instead of the long way
  across the map. (fixed in v0.1.1)
- [x] **Celestial basemap renderer** — RA/Dec star chart with constellations & bright
  stars. (v0.2.0)
- [x] **Glyph/icon markers** — per-status emoji markers via `statusIcons`. (v0.2.0)
- [x] **Mobile / small-screen view** — on a narrow viewport the map is cramped and, for
  wide routes, points fall off-screen. e.g. Magellan: after the dateline fix the route
  spans 360°+ of longitude, so on mobile the Pacific leg and later stops aren't visible
  and markers appear to "disappear". Fix: fit-to-data bounds on load (and on resize),
  responsive header/controls, and for round-the-world routes either allow lower minZoom or
  wrap markers into the visible world copy.
- [x] **SRI integrity** on the engine `<script>`, recomputed by the upgrade bot. (v0.3.2)
- [x] **adapt() hook** — consume non-canonical data (e.g. existing protocols.json). (v0.3.0)

### Open engine ideas
- [ ] **Mars / planetary tile basemap** preset (for the multi-body showpiece below).
- [ ] **Deep-link state** — encode active basemap + slider date in the URL hash so a view
  is shareable.
- [ ] **Clustering / declutter** for dense point sets (e.g. full exoplanet catalogue).
- [ ] **Keyboard-step** through items (←/→) alongside playback.

## Showcase datasets to map
- **Earth:** Antarctic race (Amundsen vs Scott), Darwin's *Beagle*, Shackleton, Lewis &
  Clark; UNESCO World Heritage by inscription year; total-solar-eclipse paths; live USGS
  earthquakes / Smithsonian volcanoes.
- **Sky:** historical supernovae (Crab 1054, Tycho 1572, Kepler 1604, SN1987A); comet
  apparitions; Messier objects.
- **Multi-body showpiece:** "Robotic landings across the Solar System" — switch basemaps
  between Venus (Venera), Moon, Mars, Titan (Huygens), comet 67P (Philae).

## Shipped consumers
- [x] periplum/magellan — Earth, static
- [x] periplum/worldcup-soccer — Earth, curated
- [x] periplum/lunar — Moon image basemap, Wikidata source
- [x] periplum/exoplanets — celestial, NASA Exoplanet Archive
- [x] periplum/olympics — Earth, ☀️/❄️ statusIcons
- [x] periplum/template — "Use this template" skeleton
- [x] oyatrino/tezosprotocolmap & oyatrino/ethupgrademap — migrated to Periplum via adapt()
