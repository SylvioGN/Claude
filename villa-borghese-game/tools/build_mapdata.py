"""Turn the OSM extract (tools/extract_osm.py output) into src/data/park.js in game units.

Usage: python3 -I build_mapdata.py <park.json> <out park.js>

Game coordinates: x = east, z = south, y = up. 1 game unit = 1/SCALE metres of map
distance (the park is shrunk so a ride across it takes under a minute), while
objects (cart, people, trees) keep human scale.
"""
import sys, json, math
from shapely.geometry import Polygon, LineString, Point, MultiPolygon, box
from shapely.ops import unary_union
from shapely import affinity

SCALE = 0.55
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))

def poly(ring):
    p = Polygon(ring)
    return p if p.is_valid else p.buffer(0)

def named(name):
    return [a for a in d['named_areas'] if a['name'] == name]

park = unary_union([poly(r) for r in d['park']])

# ---- areas that are not drivable
car_roads = [LineString(p['pts']) for p in d['paths'] if p['hw'] in ('primary', 'secondary', 'tertiary')]
car_roads += [LineString(c['pts']) for c in d['context_roads']]
roads_cut = unary_union([r.buffer(11) for r in car_roads])

def area_union(name):
    rings = [poly(a['ring']) for a in named(name)]
    return unary_union(rings) if rings else Polygon()

zoo = unary_union([poly(r) for r in d['zoo']])
medici = area_union('Giardino di Villa Medici')
gesuiti = area_union('Residenza Padri Gesuiti (Civilità Cattolica)')
ippico = area_union('Centro Ippico Villa Borghese')

play = park.difference(roads_cut).difference(zoo.buffer(2)).difference(medici.buffer(2)).difference(gesuiti.buffer(2))
play = play.difference(ippico.buffer(2))
play = play.intersection(box(-605, -560, 760, 430))

# bridge of Viale dell'Obelisco over Viale del Muro Torto joins Pincio to the park
bridge_line = None
for p in d['paths']:
    if p['bridge'] and p['name'] == 'Piazzale dei Martiri':
        bridge_line = LineString(p['pts'])
if bridge_line is not None:
    (x0, z0), (x1, z1) = bridge_line.coords[0], bridge_line.coords[-1]
    dx, dz = x1 - x0, z1 - z0
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    ext = LineString([(x0 - ux * 30, z0 - uz * 30), (x1 + ux * 30, z1 + uz * 30)])
    play = unary_union([play, ext.buffer(5, cap_style=2)])

play = play.buffer(1.5).buffer(-1.5)
parts = list(play.geoms) if play.geom_type == 'MultiPolygon' else [play]
parts.sort(key=lambda g: -g.area)
main = parts[0]
print('play parts', [(round(g.area), round(g.centroid.x), round(g.centroid.y)) for g in parts[:6]], file=sys.stderr)
main = main.simplify(2.0)

def S(pt):
    return [round(pt[0] * SCALE, 2), round(pt[1] * SCALE, 2)]

def ring_out(coords):
    c = list(coords)
    if c[0] == c[-1]:
        c = c[:-1]
    return [S(p) for p in c]

BOUNDARY = ring_out(main.exterior.coords)
HOLES = [ring_out(i.coords) for i in main.interiors if Polygon(i).area > 150]
inner = main.buffer(-1)
near = main.buffer(15)

# ---- paths (drivable avenues and footways)
WIDE = ('Viale', 'V.le', 'Piazzale', 'Largo', 'Via ')
paths = []
for p in d['paths']:
    if p['hw'] in ('primary', 'secondary', 'tertiary', 'steps', 'platform'):
        continue
    ls = LineString(p['pts'])
    clipped = ls.intersection(main.buffer(2))
    if clipped.is_empty:
        continue
    segs = clipped.geoms if hasattr(clipped, 'geoms') else [clipped]
    for s in segs:
        if s.geom_type != 'LineString' or s.length < 6:
            continue
        name = p['name']
        if name.startswith(WIDE) or p['hw'] in ('service', 'unclassified', 'residential', 'pedestrian', 'track', 'living_street'):
            w, kind = 7.0, 'viale'
        elif p['hw'] in ('footway', 'cycleway', 'bridleway'):
            w, kind = 3.6, 'footway'
        else:
            w, kind = 2.8, 'path'
        if p['bridge']:
            kind = 'bridge'
            w = 7.0
        paths.append({'n': name, 'k': kind, 'w': w, 'p': [S(c) for c in s.simplify(1.0).coords]})

path_lines = unary_union([LineString([(a / SCALE, b / SCALE) for a, b in p['p']]).buffer(p['w'] / SCALE / 2 + 2.5) for p in paths])

plazas = []
for a in d['plazas']:
    if not a['ring'] or len(a['ring']) < 3:
        continue
    pg = poly(a['ring'])
    if pg.intersects(main) and pg.area < 25000:
        plazas.append({'n': a['name'], 'r': ring_out(pg.intersection(main.buffer(3)).exterior.coords) if pg.intersection(main.buffer(3)).geom_type == 'Polygon' else ring_out(pg.exterior.coords)})

# ---- water
water = []
for w in d['water']:
    pg = poly(w['ring'])
    if not pg.intersects(near):
        continue
    t = w['tags']
    if w['name'].startswith('Laghetto'):
        kind = 'lake'
    elif t.get('leisure') == 'swimming_pool':
        continue
    elif t.get('amenity') == 'fountain':
        kind = 'fountain'
    else:
        kind = 'pond'
    item = {'n': w['name'], 'k': kind, 'r': ring_out(pg.exterior.coords)}
    if w.get('holes'):
        item['h'] = [ring_out(h) for h in w['holes']]
    water.append(item)

# ---- buildings
LANDMARK_BUILDINGS = {
    'Casino Nobile di Villa Borghese': 'galleria', 'Casina di Raffaello': 'raffaello',
    "Casina dell'Orologio": 'orologio', 'Tempio di Antonino e Faustina': 'faustina',
    'Cinema dei Piccoli': 'cinema', 'Casina Valadier': 'valadier', 'Tempio di Diana': 'diana',
    'Casa del Cinema': 'casacinema', 'Tempio di Esculapio': 'esculapio', 'Porta Pinciana': 'pinciana',
    'Arco di Settimio Severo': 'arco', 'Propilei Egizi': 'propilei',
    'Museo Carlo Bilotti Aranciera di Villa Borghese': 'aranciera',
    "Galleria Nazionale d'Arte Moderna e Contemporanea": 'gnam', 'Casino della Meridiana': 'meridiana',
    "Casino dell'Uccelliera": 'uccelliera', 'Teatro dei burattini San Carlino': 'sancarlino',
    'Gigi Proietti Globe Theatre Silvano Toti': 'globe', 'Fortezzuola': 'fortezzuola',
    'Chalet Rustico': None, 'Pic Nic': None, 'Art Café': None,
}
# some landmark buildings carry their name only on the relation, so match unnamed footprints by position
UNNAMED_MATCH = {'globe': (49, -163), 'fortezzuola': (116, -246), 'propilei': (-284, -70), 'aranciera': (-135, -41), 'gnam': (-229, -460)}

buildings = []
anchors = {}

def obb(pg):
    r = pg.minimum_rotated_rectangle
    c = list(r.exterior.coords)
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1])
    e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    if l1 >= l2:
        ang = math.atan2(e1[1], e1[0]); L, W = l1, l2
    else:
        ang = math.atan2(e2[1], e2[0]); L, W = l2, l1
    return ang, L, W

def add_anchor(lid, pg, name):
    cen = pg.centroid
    ang, L, W = obb(pg)
    a = anchors.get(lid)
    if a and a['area'] >= pg.area * SCALE * SCALE:
        return
    anchors[lid] = {'name': name, 'x': round(cen.x * SCALE, 2), 'z': round(cen.y * SCALE, 2),
                    'angle': round(ang, 3), 'len': round(L * SCALE, 2), 'wid': round(W * SCALE, 2),
                    'area': round(pg.area * SCALE * SCALE, 1), 'footprint': ring_out(pg.simplify(0.5).exterior.coords)}

for b in d['buildings']:
    pg = poly(b['ring'])
    if pg.is_empty or not pg.intersects(main.buffer(120)):
        continue
    name = b['name']
    lid = LANDMARK_BUILDINGS.get(name)
    if lid is None and not name:
        for k, (mx, mz) in UNNAMED_MATCH.items():
            if pg.contains(Point(mx, mz)) or pg.distance(Point(mx, mz)) < 4:
                lid = k
    if lid:
        add_anchor(lid, pg, name)
        continue
    if not pg.intersects(near):
        continue
    t = b['tags']
    h = None
    try:
        h = float(t.get('height', '').split()[0])
    except Exception:
        pass
    if h is None and t.get('building:levels'):
        try:
            h = 3.4 * float(t['building:levels'])
        except Exception:
            pass
    if h is None:
        h = 4 if pg.area < 60 else 7 if pg.area < 300 else 11 if pg.area < 1500 else 15
    buildings.append({'n': name, 'h': round(h * 0.7, 1), 'r': ring_out(pg.exterior.coords)})

# ---- vegetation areas
forest = []
for f in d['forest']:
    pg = poly(f['ring']).intersection(main)
    for g in (pg.geoms if hasattr(pg, 'geoms') else [pg]):
        if g.geom_type == 'Polygon' and g.area > 300:
            forest.append(ring_out(g.simplify(2).exterior.coords))
lawns = []
for f in d['grass']:
    pg = poly(f['ring']).intersection(main)
    for g in (pg.geoms if hasattr(pg, 'geoms') else [pg]):
        if g.geom_type == 'Polygon' and g.area > 80:
            kind = 'flowers' if f['tags'].get('landuse') == 'flowerbed' or f['tags'].get('man_made') == 'flower_bed' else 'garden' if f['tags'].get('leisure') == 'garden' else 'grass'
            lawns.append({'k': kind, 'r': ring_out(g.simplify(1.5).exterior.coords)})

# ---- barriers: rendered everywhere, colliders get gaps where a path crosses
walls = []
for b in d['barriers']:
    ls = LineString(b['pts'])
    if not ls.intersects(main.buffer(40)):
        continue
    kind = b['type']
    if kind in ('kerb', 'bollard', 'gate', 'lift_gate', 'planter'):
        continue
    if kind in ('citywalls', 'city_wall'):
        kind = 'city_wall'
    cut = ls.difference(path_lines) if kind != 'city_wall' else ls
    segs = cut.geoms if hasattr(cut, 'geoms') else [cut]
    for s in segs:
        if s.geom_type != 'LineString' or s.length < 2:
            continue
        walls.append({'k': kind, 'p': [S(c) for c in s.coords]})

tree_rows = [{'sp': r['species'], 'p': [S(c) for c in r['pts']]} for r in d['tree_rows']]

# ---- points of interest
POI_KIND = [
    (lambda t: t.get('amenity') == 'bench', 'bench'),
    (lambda t: t.get('amenity') == 'waste_basket', 'bin'),
    (lambda t: t.get('amenity') == 'drinking_water', 'nasone'),
    (lambda t: t.get('natural') == 'tree', 'tree'),
    (lambda t: t.get('memorial') == 'bust' or t.get('artwork_type') == 'bust', 'bust'),
    (lambda t: t.get('memorial') == 'statue' or t.get('artwork_type') in ('statue', 'sculpture'), 'statue'),
    (lambda t: t.get('man_made') == 'obelisk', 'obelisk'),
    (lambda t: t.get('amenity') == 'fountain', 'fountain'),
    (lambda t: t.get('amenity') in ('cafe', 'ice_cream', 'bar', 'fast_food', 'restaurant'), 'cafe'),
    (lambda t: t.get('amenity') == 'toilets', 'toilets'),
    (lambda t: t.get('leisure') == 'playground', 'playground'),
    (lambda t: t.get('amenity') in ('bicycle_rental', 'boat_rental') or t.get('shop') == 'bicycle', 'rental'),
    (lambda t: t.get('tourism') == 'viewpoint', 'viewpoint'),
    (lambda t: t.get('tourism') == 'information', 'info'),
    (lambda t: t.get('historic') in ('memorial', 'monument', 'wayside_shrine'), 'memorial'),
    (lambda t: t.get('amenity') == 'clock', 'clock'),
]
pois = []
for p in d['pois']:
    pt = Point(p['x'], p['z'])
    if not near.contains(pt):
        continue
    t = p['tags']
    kind = None
    for pred, k in POI_KIND:
        if pred(t):
            kind = k
            break
    if not kind:
        continue
    item = {'k': kind, 'x': round(p['x'] * SCALE, 2), 'z': round(p['z'] * SCALE, 2)}
    if t.get('name'):
        item['n'] = t['name']
    pois.append(item)

def poi_anchor(lid, name, x, z):
    anchors.setdefault(lid, {'name': name, 'x': round(x * SCALE, 2), 'z': round(z * SCALE, 2)})

for p in d['pois']:
    n = p['tags'].get('name', '')
    if n == 'Idrocronometro':
        poi_anchor('idrocronometro', 'Idrocronometro del Pincio', p['x'], p['z'])
    elif n == 'Balconata del Pincio':
        poi_anchor('terrazza', 'Terrazza del Pincio', p['x'], p['z'])
    elif n == 'Noleggio barche':
        poi_anchor('boats', 'Noleggio barche', p['x'], p['z'])
    elif n == 'Museo Pietro Canonica':
        poi_anchor('canonica_entrance', 'Museo Pietro Canonica', p['x'], p['z'])
    elif n == 'Monumento a Goethe':
        poi_anchor('goethe', 'Monumento a Goethe', p['x'], p['z'])
    elif n == 'Leccio monumentale':
        poi_anchor('leccio', 'Leccio monumentale', p['x'], p['z'])
    elif n == "Mostra dell'Acqua Felix":
        poi_anchor('acquafelix', "Mostra dell'Acqua Felix", p['x'], p['z'])
    elif n == 'Gelateria del Parco':
        poi_anchor('zoo_gate', 'Bioparco', p['x'], p['z'])
for a in d['named_areas']:
    if a['name'] == 'Porta Pinciana' and 'pinciana' not in anchors:
        add_anchor('pinciana', poly(a['ring']), 'Porta Pinciana')
    if a['name'] == 'Obelisco di Antinoo':
        pg = poly(a['ring']); poi_anchor('obelisco', 'Obelisco di Antinoo', pg.centroid.x, pg.centroid.y)
    if a['name'] == 'Monumento a Goethe':
        pg = poly(a['ring']); poi_anchor('goethe', 'Monumento a Goethe', pg.centroid.x, pg.centroid.y)
for w in d['water']:
    pg = poly(w['ring'])
    if w['name'] == 'Fontana dei Cavalli Marini':
        poi_anchor('cavallimarini', 'Fontana dei Cavalli Marini', pg.centroid.x, pg.centroid.y)
    if w['name'] == 'Fontana del Mosè':
        poi_anchor('mose', 'Fontana del Mosè', pg.centroid.x, pg.centroid.y)
    if w['name'].startswith('Laghetto'):
        poi_anchor('lago', 'Laghetto di Villa Borghese', pg.centroid.x, pg.centroid.y)
    if w['name'] == 'Fontana del Peschiera':
        poi_anchor('peschiera', 'Fontana della Peschiera', pg.centroid.x, pg.centroid.y)
for a in d['plazas']:
    if a['name'] == 'Piazza di Siena' and a['ring']:
        pg = poly(a['ring'])
        ang, L, W = obb(pg)
        anchors['siena'] = {'name': 'Piazza di Siena', 'x': round(pg.centroid.x * SCALE, 2), 'z': round(pg.centroid.y * SCALE, 2),
                            'angle': round(ang, 3), 'len': round(L * SCALE, 2), 'wid': round(W * SCALE, 2),
                            'footprint': ring_out(pg.simplify(1).exterior.coords)}
    if a['name'] == 'Piazzale Napoleone Primo' and a['ring']:
        pg = poly(a['ring'])
        anchors['napoleone'] = {'name': 'Piazzale Napoleone I', 'x': round(pg.centroid.x * SCALE, 2), 'z': round(pg.centroid.y * SCALE, 2),
                                'footprint': ring_out(pg.simplify(1).exterior.coords)}

# no-go fenced areas that touch the drivable area (rendered with fences / walls by their owners)
nogo = []
for name, shape in (('zoo', zoo), ('galoppatoio', ippico), ('villamedici', medici)):
    shape = shape.difference(main)
    for g in (shape.geoms if hasattr(shape, 'geoms') else [shape]):
        if g.geom_type == 'Polygon' and not g.is_empty and g.area > 500:
            nogo.append({'k': name, 'r': ring_out(g.simplify(2).exterior.coords)})

# outside-the-park backdrop, from known coordinates (metres from origin)
def ll(lat, lon):
    MX = 111320.0 * math.cos(math.radians(41.9130)); MZ = 110574.0
    return [round((lon - 12.4850) * MX * SCALE, 1), round(-(lat - 41.9130) * MZ * SCALE, 1)]

backdrop = {
    'piazzaPopolo': {'center': ll(41.91075, 12.47635), 'obelisk': ll(41.91075, 12.47635), 'radius': round(70 * SCALE, 1)},
    'smMiracoli': ll(41.90962, 12.47672), 'smMontesanto': ll(41.90955, 12.47602),
    'portaPopolo': ll(41.91155, 12.47613), 'smPopolo': ll(41.91140, 12.47652),
    'stPeter': ll(41.90217, 12.45391), 'trinitaMonti': ll(41.90602, 12.48329),
    'villaMedici': ll(41.90826, 12.48271), 'vittoriano': ll(41.89463, 12.48311),
    'muroTorto': [[round(x * SCALE, 1), round(z * SCALE, 1)] for x, z in max(
        (LineString(c['pts']) for c in d['context_roads'] + d['paths'] if c['name'] == 'Viale del Muro Torto'),
        key=lambda l: l.length).coords],
}

minx, minz, maxx, maxz = main.bounds
data = {
    'SCALE': SCALE,
    'BOUNDS': {'minX': round(minx * SCALE, 1), 'maxX': round(maxx * SCALE, 1), 'minZ': round(minz * SCALE, 1), 'maxZ': round(maxz * SCALE, 1)},
    'BOUNDARY': BOUNDARY, 'HOLES': HOLES, 'NOGO': nogo,
    'PATHS': paths, 'PLAZAS': plazas, 'WATER': water, 'BUILDINGS': buildings,
    'FOREST': forest, 'LAWNS': lawns, 'WALLS': walls, 'TREE_ROWS': tree_rows,
    'POIS': pois, 'ANCHORS': anchors, 'BACKDROP': backdrop,
}
with open(out, 'w') as fh:
    fh.write('// Generated by tools/build_mapdata.py from OpenStreetMap data (c) OpenStreetMap contributors, ODbL.\n')
    fh.write('// Game units: x = east, z = south. Do not edit by hand; re-run the generator.\n')
    for k, v in data.items():
        fh.write('export const %s = %s;\n' % (k, json.dumps(v, separators=(',', ':'))))
for k, v in data.items():
    if isinstance(v, (list, dict)):
        print(k, len(v), file=sys.stderr)
print('anchors', sorted(anchors.keys()), file=sys.stderr)
