// The Grand Tour: places to visit. Positions come from OpenStreetMap anchors in park.js;
// core/game.js works out a "photo spot" on the nearest avenue for each one.
// Names, facts and translations live in modules/content.js (keyed by id).
export const STOPS = [
  { id: 'terrazza', anchor: 'terrazza', icon: 'view' },
  { id: 'idrocronometro', anchor: 'idrocronometro', icon: 'clock' },
  { id: 'lago', anchor: 'esculapio', icon: 'boat' },
  { id: 'siena', anchor: 'siena', icon: 'horse' },
  { id: 'fortezzuola', anchor: 'fortezzuola', icon: 'castle' },
  { id: 'globe', anchor: 'globe', icon: 'theatre' },
  { id: 'bioparco', anchor: 'zoo_gate', icon: 'giraffe' },
  { id: 'galleria', anchor: 'galleria', icon: 'museum' },
  { id: 'cavallimarini', anchor: 'cavallimarini', icon: 'fountain' },
  { id: 'diana', anchor: 'diana', icon: 'temple' },
  { id: 'raffaello', anchor: 'raffaello', icon: 'playground' },
  { id: 'cinema', anchor: 'cinema', icon: 'film' },
];

// Medals for visiting stops.
export const MEDALS = [
  { at: 4, id: 'bronze' },
  { at: 8, id: 'silver' },
  { at: STOPS.length, id: 'gold' },
];

// Where the adventure begins: on the Pincio, facing west towards the terrace and its view over Rome.
// Heading convention everywhere: forward = (sin h, 0, cos h); h = PI/2 faces east, h = PI faces north.
export const START = { anchor: 'napoleone', offsetX: 22, offsetZ: -6, heading: -Math.PI / 2 };
