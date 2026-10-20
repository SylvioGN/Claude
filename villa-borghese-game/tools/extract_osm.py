"""Extract Villa Borghese features from a raw OSM XML dump into local-metre JSON.

Usage: python3 -I extract.py <park.osm> <out.json>
Coordinates: x = east (m), z = south (m), origin at LAT0/LON0.
"""
import sys, json, math, collections
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, LineString, Point, MultiPolygon
from shapely.ops import unary_union, linemerge, polygonize

src, out = sys.argv[1], sys.argv[2]
root = ET.parse(src).getroot()

LAT0, LON0 = 41.9130, 12.4850
MX = 111320.0 * math.cos(math.radians(LAT0))
MZ = 110574.0

def proj(lat, lon):
    return ((lon - LON0) * MX, -(lat - LAT0) * MZ)

nodes = {}
node_tags = {}
for n in root.findall('node'):
    nid = n.get('id')
    nodes[nid] = proj(float(n.get('lat')), float(n.get('lon')))
    tg = {t.get('k'): t.get('v') for t in n.findall('tag')}
    if tg:
        node_tags[nid] = tg

ways = {}
way_tags = {}
for w in root.findall('way'):
    wid = w.get('id')
    refs = [nd.get('ref') for nd in w.findall('nd')]
    pts = [nodes[r] for r in refs if r in nodes]
    ways[wid] = pts
    way_tags[wid] = {t.get('k'): t.get('v') for t in w.findall('tag')}

rels = {}
for r in root.findall('relation'):
    rels[r.get('id')] = (
        [(m.get('type'), m.get('ref'), m.get('role')) for m in r.findall('member')],
        {t.get('k'): t.get('v') for t in r.findall('tag')},
    )

def rel_polygon(rid):
    members, _ = rels[rid]
    outer = [ways[ref] for (ty, ref, role) in members if ty == 'way' and role in ('outer', '') and ref in ways]
    inner = [ways[ref] for (ty, ref, role) in members if ty == 'way' and role == 'inner' and ref in ways]
    lines = [LineString(p) for p in outer if len(p) >= 2]
    polys = list(polygonize(unary_union(lines)))
    shape = unary_union(polys) if polys else None
    if shape is not None and inner:
        ilines = [LineString(p) for p in inner if len(p) >= 2]
        ipolys = list(polygonize(unary_union(ilines)))
        if ipolys:
            shape = shape.difference(unary_union(ipolys))
    return shape

def way_polygon(wid):
    p = ways[wid]
    if len(p) >= 4 and p[0] == p[-1]:
        return Polygon(p)
    return None

park = unary_union([rel_polygon('2985896'), rel_polygon('14026944')])
park = park.buffer(2).buffer(-2)
print('park area m2', round(park.area), 'bounds', [round(v) for v in park.bounds], file=sys.stderr)
park_zone = park.buffer(25)

def rnd(pts, nd=1):
    return [[round(x, nd), round(z, nd)] for (x, z) in pts]

def poly_rings(shape, tol=1.0):
    out = []
    geoms = shape.geoms if hasattr(shape, 'geoms') else [shape]
    for g in geoms:
        if g.is_empty or g.geom_type != 'Polygon':
            continue
        g = g.simplify(tol)
        out.append(rnd(list(g.exterior.coords)[:-1]))
    return out

result = collections.OrderedDict()
result['origin'] = {'lat': LAT0, 'lon': LON0}
result['park'] = poly_rings(park, 2.0)

# --- paths and roads
HW_KEEP = {'footway', 'path', 'pedestrian', 'service', 'track', 'cycleway', 'unclassified',
           'residential', 'living_street', 'tertiary', 'secondary', 'primary', 'steps', 'bridleway'}
paths = []
for wid, tg in way_tags.items():
    hw = tg.get('highway')
    if hw not in HW_KEEP:
        continue
    pts = ways[wid]
    if len(pts) < 2:
        continue
    ls = LineString(pts)
    inside = ls.intersection(park_zone)
    if inside.is_empty:
        continue
    if tg.get('area') == 'yes':
        continue
    segs = inside.geoms if hasattr(inside, 'geoms') else [inside]
    for s in segs:
        if s.geom_type != 'LineString' or s.length < 4:
            continue
        s = s.simplify(0.8)
        paths.append({
            'id': wid, 'hw': hw, 'name': tg.get('name', ''),
            'bridge': tg.get('bridge') == 'yes', 'tunnel': tg.get('tunnel') in ('yes', 'building_passage'),
            'layer': tg.get('layer', ''), 'surface': tg.get('surface', ''),
            'width': tg.get('width', ''), 'foot': tg.get('foot', ''),
            'len': round(s.length, 1),
            'pts': rnd(list(s.coords)),
        })
result['paths'] = paths

# Pedestrian areas (piazzali) as polygons
areas = []
for wid, tg in way_tags.items():
    if tg.get('highway') == 'pedestrian' and tg.get('area') == 'yes' or tg.get('place') == 'square':
        p = way_polygon(wid)
        if p is not None and p.intersects(park_zone):
            areas.append({'name': tg.get('name', ''), 'ring': poly_rings(p, 0.8)[0] if poly_rings(p, 0.8) else []})
for rid, (members, tg) in rels.items():
    if tg.get('highway') == 'pedestrian' or tg.get('place') == 'square':
        shp = rel_polygon(rid)
        if shp is not None and not shp.is_empty and shp.intersects(park_zone):
            for ring in poly_rings(shp, 0.8):
                areas.append({'name': tg.get('name', ''), 'ring': ring})
result['plazas'] = areas

# --- generic polygon features from ways and relations
def collect(pred, tol=1.0, zone=park_zone, keep_tags=('name',)):
    feats = []
    for wid, tg in way_tags.items():
        if pred(tg):
            p = way_polygon(wid)
            if p is None or not p.is_valid:
                continue
            if not p.intersects(zone):
                continue
            for ring in poly_rings(p, tol):
                feats.append({'name': tg.get('name', ''), 'tags': {k: v for k, v in tg.items() if k in keep_tags or k in ('building', 'leisure', 'landuse', 'natural', 'amenity', 'water', 'tourism', 'historic', 'man_made', 'building:levels', 'height', 'roof:shape')}, 'ring': ring, 'area': round(p.area)})
    for rid, (members, tg) in rels.items():
        if tg.get('type') not in ('multipolygon', 'building'):
            continue
        if pred(tg):
            shp = rel_polygon(rid)
            if shp is None or shp.is_empty or not shp.intersects(zone):
                continue
            geoms = shp.geoms if hasattr(shp, 'geoms') else [shp]
            for g in geoms:
                if g.is_empty or g.geom_type != 'Polygon':
                    continue
                g = g.simplify(tol)
                ring = rnd(list(g.exterior.coords)[:-1])
                holes = [rnd(list(i.coords)[:-1]) for i in g.interiors]
                feats.append({'name': tg.get('name', ''), 'tags': {k: v for k, v in tg.items() if k in ('building', 'leisure', 'landuse', 'natural', 'amenity', 'water', 'tourism', 'historic', 'man_made', 'height')}, 'ring': ring, 'holes': holes, 'area': round(Polygon(ring).area), 'rel': rid})
    return feats

result['water'] = collect(lambda t: t.get('natural') == 'water' or t.get('amenity') == 'fountain' or t.get('leisure') == 'swimming_pool', 0.5)
result['buildings'] = collect(lambda t: 'building' in t and t.get('building') not in ('no',), 0.6, park.buffer(5))
result['forest'] = collect(lambda t: t.get('landuse') == 'forest' or t.get('natural') == 'wood', 2.0)
result['grass'] = collect(lambda t: t.get('landuse') in ('grass', 'flowerbed') or t.get('leisure') in ('garden',) or t.get('man_made') == 'flower_bed', 1.5)
result['pitches'] = collect(lambda t: t.get('leisure') in ('pitch', 'playground', 'sports_centre', 'track'), 1.0)
result['zoo'] = poly_rings(rel_polygon('5657594'), 2.0) if '5657594' in rels else []
result['named_areas'] = collect(lambda t: bool(t.get('name')) and (t.get('tourism') or t.get('historic') or t.get('leisure') or t.get('amenity') in ('theatre', 'cinema', 'cafe', 'arts_centre')), 1.0)

# barriers (lines)
bars = []
for wid, tg in way_tags.items():
    b = tg.get('barrier') or (tg.get('historic') == 'citywalls' and 'city_wall') or (tg.get('man_made') == 'city_wall' and 'city_wall')
    if not b:
        continue
    pts = ways[wid]
    if len(pts) < 2:
        continue
    ls = LineString(pts)
    inside = ls.intersection(park.buffer(60))
    if inside.is_empty:
        continue
    segs = inside.geoms if hasattr(inside, 'geoms') else [inside]
    for s in segs:
        if s.geom_type != 'LineString' or s.length < 2:
            continue
        bars.append({'type': b, 'name': tg.get('name', ''), 'pts': rnd(list(s.simplify(0.6).coords))})
result['barriers'] = bars

# tree rows
rows = []
for wid, tg in way_tags.items():
    if tg.get('natural') == 'tree_row':
        ls = LineString(ways[wid])
        if ls.intersects(park_zone):
            rows.append({'species': tg.get('species', tg.get('genus', '')), 'pts': rnd(list(ls.simplify(0.8).coords))})
result['tree_rows'] = rows

# POI nodes
pois = []
for nid, tg in node_tags.items():
    x, z = nodes[nid]
    if not park_zone.contains(Point(x, z)):
        continue
    interesting = any(k in tg for k in ('tourism', 'historic', 'amenity', 'man_made', 'natural', 'leisure', 'memorial', 'artwork_type', 'barrier'))
    if not interesting and 'name' not in tg:
        continue
    if tg.get('highway') in ('bus_stop', 'crossing', 'traffic_signals', 'street_lamp') or tg.get('public_transport'):
        continue
    keep = {k: v for k, v in tg.items() if k in ('name', 'tourism', 'historic', 'amenity', 'man_made', 'natural', 'leisure', 'memorial', 'artwork_type', 'barrier', 'species', 'genus', 'leaf_type', 'subject', 'shop')}
    pois.append({'id': nid, 'x': round(x, 1), 'z': round(z, 1), 'tags': keep})
result['pois'] = pois

# context roads around park (outside), for the city backdrop
ctx = []
for wid, tg in way_tags.items():
    if tg.get('highway') in ('primary', 'secondary', 'tertiary') and len(ways[wid]) >= 2:
        ls = LineString(ways[wid])
        if ls.intersects(park.buffer(150)) and not ls.within(park):
            ctx.append({'name': tg.get('name', ''), 'tunnel': tg.get('tunnel', ''), 'bridge': tg.get('bridge', ''), 'pts': rnd(list(ls.simplify(1.5).coords))})
result['context_roads'] = ctx

json.dump(result, open(out, 'w'))
for k, v in result.items():
    if isinstance(v, list):
        print(k, len(v), file=sys.stderr)
