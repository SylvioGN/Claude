# Villa Borghese Cart Adventure

A 3D golf-cart ride through Villa Borghese in Rome, made for kids (up to about 10) and their
family. Drive the white 8-seat cart around the real park, visit 12 famous places, collect
gelato, honk at the pigeons and avoid the obstacles. Works on phones (touch) and computers
(arrow keys / WASD, space to honk).

The park layout comes from OpenStreetMap (© OpenStreetMap contributors, ODbL), so the avenues,
the lake, the fountains and the landmarks sit where they really are, shrunk so a ride across
the park takes under a minute.

## Play

Open `dist/index.html` in a browser. It is a single self-contained file (three.js is bundled),
so it also works offline.

## Build

```sh
npm install
node build.mjs                       # dist/index.html + dist/artifact.html
node build.mjs --only=world,cart     # just some modules (others use simple stand-ins)
node build.mjs --out=.out/me         # build somewhere private (parallel work)
node build.mjs --dev                 # unminified with source maps
node test/shot.mjs --help            # screenshot tool, see the header of test/shot.mjs
```

Map data: `tools/extract_osm.py` turns a raw OSM download into JSON and
`tools/build_mapdata.py` turns that into `src/data/park.js`:

```sh
curl -o park.osm "https://api.openstreetmap.org/api/0.6/map?bbox=12.4740,41.9060,12.4960,41.9200"
python3 tools/extract_osm.py park.osm park.json
python3 tools/build_mapdata.py park.json src/data/park.js
```

## Code map

```
src/main.js              boot, shared ctx, module lifecycle, frame loop, test hooks
src/shell.html           page shell (title, base CSS, canvas, #ui layer)
src/core/terrain.js      height field, surface types, nearest path, drivable area
src/core/colliders.js    static circles + wall segments (grid hash), collideCircle()
src/core/game.js         state machine, tour stops, score, settings, saved progress, input merge
src/core/camera.js       chase / photo / title / debug camera
src/core/util.js         GeoBuilder (merge coloured parts into one mesh), instancedChunks, textures
src/core/quality.js      device tier + adaptive resolution
src/core/geo.js, rng.js  2D geometry helpers, seeded random + noise
src/data/park.js         generated map (game units)
src/data/family.js       the seven riders (from the family photo)
src/data/stops.js        tour stops, medals, start position
src/modules/*.js         feature modules (see below)
```

### Coordinates

* Game units: `x` = east, `z` = south, `y` = up. Map distances are 0.55 × real metres; objects
  (people, cart, trees, buildings' heights) keep roughly human scale.
* Heading: forward = `(sin h, 0, cos h)`. `h = π/2` faces east, `h = π` faces north,
  `h = -π/2` west. `object.rotation.y = h` turns a model built facing `+z`.
* Ground height: always `ctx.terrain.heightAt(x, z)`. The lake surface is at `ctx.WATER_Y`.
* Park bounds: about x −333…410, z −308…237. The drivable area is `MAP.BOUNDARY`.

### Map data (`ctx.MAP`, from `src/data/park.js`)

| export | contents |
|---|---|
| `BOUNDARY`, `HOLES` | drivable area outline (ring of `[x, z]`) |
| `NOGO` | fenced areas next to it: `{k: 'zoo' \| 'galoppatoio' \| 'villamedici', r: ring}` |
| `PATHS` | `{n: name, k: 'viale' \| 'footway' \| 'path' \| 'bridge', w: width, p: [[x, z], ...]}` |
| `PLAZAS` | paved squares `{n, r}` |
| `WATER` | `{n, k: 'lake' \| 'fountain' \| 'pond', r, h?: [island rings], c?: collision ring (lake: 1.2 inside the shore)}` |
| `BUILDINGS` | ordinary buildings `{n, h: height, r: footprint}` (landmarks are not in here) |
| `FOREST`, `LAWNS` | woods (rings) and lawns / gardens / flower beds `{k, r}` |
| `WALLS` | `{k: 'city_wall' \| 'wall' \| 'fence' \| 'hedge' \| 'retaining_wall', p: polyline}` (gaps already cut where paths cross) |
| `TREE_ROWS` | rows of trees along avenues |
| `POIS` | `{k: 'bench' \| 'bin' \| 'nasone' \| 'tree' \| 'bust' \| 'statue' \| 'obelisk' \| 'fountain' \| 'cafe' \| 'toilets' \| 'playground' \| 'rental' \| 'viewpoint' \| 'info' \| 'memorial' \| 'clock', x, z, n?}` |
| `ANCHORS` | landmark positions: `{name, x, z, angle?, len?, wid?, footprint?}`; `angle` is the long axis direction (radians from +x towards +z) |
| `BACKDROP` | places outside the park: Piazza del Popolo, St Peter's, Trinità dei Monti, Villa Medici, Viale del Muro Torto... |

### The shared `ctx`

```js
ctx = {
  THREE, renderer, scene, camera, params /* URLSearchParams */, debug,
  quality: { tier: 'low'|'med'|'high', pixelRatio, shadows, shadowMapSize, treeDensity, drawDistance, particles },
  MAP, terrain: { heightAt, normalAt, surfaceAt /* SURF code */, nearestPath, isInside, segments, H, G, x0, z0, nx, nz, extent },
  colliders /* addCircle, addSegment, addPolyline, addRing, addBox, collideCircle, isFree, query */,
  util /* GeoBuilder, instancedChunks, PALETTE, mats, canvasTexture, textSprite, blobShadow */, geo, rng,
  events /* on(name, fn), emit(name, payload) - names listed in core/events.js */,
  lights: { sun, hemi, sunDir }, WATER_Y, time,
  game /* state, stops, score, settings, begin(), closeStop(), nextStop(), keepDriving(), setSettings(), ... */,
  camRig /* setMode('chase'|'photo'|'title') */,
  cart  /* set by modules/cart.js: object, position, heading, speed, reset(), freeze(), getHitCircles(), bounce(), pose() */,
  input /* merged each frame: steer -1..1 (right +), throttle 0..1, brake 0..1, honk */,
  touchInput /* written by ui.js */, modules /* every module's returned api by name */,
  plant(kind, x, z, {scale, ry}) /* request a special tree, planted later by vegetation */,
  reserve({x, z, r} | {ring}), isReserved(x, z, pad) /* keep random trees/props out */,
}
```

Build order (build.mjs `MODULES`): world, cityscape, the five landmark modules, vegetation, props,
cart, actors, guide, audio, ui. Later modules can see the colliders and reservations of earlier ones.

Water: `world` draws every water surface in `MAP.WATER` (lake, ponds, fountain basins) and a plain
stone rim 0.6 high around fountain basins, with the water level of a fountain at
`heightAt(centre) + 0.45`. Landmark modules add the sculptures, jets and special rims on top.

### Feature modules

| module | what it builds |
|---|---|
| `world` | terrain mesh and ground look, paths, plazas, water surfaces, sky, sun, fog |
| `cityscape` | ordinary buildings, walls, fences, hedges, fenced areas, the city around the park (Piazza del Popolo, St Peter's dome...) |
| `vegetation` | umbrella pines, holm oaks, cedars, plane trees, cypresses, shrubs, flower beds |
| `props` | benches, lamps, bins, nasoni drinking fountains, busts, statues, signs, kiosks |
| `landmarksPincio` | Pincio terrace, water clock, obelisk, Moses fountain, Casina Valadier, bridge, busts |
| `landmarksLake` | lake, Temple of Aesculapius, boats, Egyptian propylaea, arch, Aranciera, fountains |
| `landmarksCenter` | Piazza di Siena, Fortezzuola, Globe Theatre, clock house, Temple of Faustina, Casina di Raffaello, Temple of Diana |
| `landmarksEast` | Galleria Borghese, Seahorse fountain, aviary, Meridiana, deer park, Bioparco gate and animals |
| `landmarksSouth` | Cinema dei Piccoli, Casa del Cinema, Porta Pinciana, Goethe, riding school, Umberto I |
| `cart` | the golf cart from the photo with the family on board, driving physics, effects |
| `actors` | pigeons, ducks, joggers, bikes, balls, cones, puddles, gelato and other things to collect |
| `audio` | synthesized sound effects and music (WebAudio) |
| `guide` | glowing beacons at the stops, a floating arrow and a dotted route to the next stop, celebrations |
| `ui` | title screen, driver choice, touch controls, HUD, mini-map, photo cards, menus, translations |
| `content` | names and kid-friendly facts for every stop in five languages (imported by ui) |

Each module exports `async function create(ctx)` and returns an object, optionally with
`update(dt, t)`. A module that throws during `create` is skipped and logged; the rest of the
game keeps working.

### Performance budget (phones first)

* Whole scene on screen: about 150 draw calls and 500k triangles on the `med` tier.
* Merge static parts with `GeoBuilder` (one mesh per landmark), use `instancedChunks` for repeated
  objects, avoid per-object materials, no extra lights, scale detail with `ctx.quality`.
