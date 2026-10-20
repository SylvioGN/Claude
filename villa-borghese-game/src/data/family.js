// The seven riders, described from the family photo taken in Villa Borghese on 19 Oct 2026.
// cart.js models them (low-poly people) and ui.js shows them on the "who drives?" screen.
// Colours are sRGB hex. `build` scales the body: 1 = average adult.
export const FAMILY = [
  {
    id: 'blue', label: 'Light blue shirt', age: 'adult', build: 0.95, height: 1.0,
    skin: '#e8b996', hair: '#c9c4bb', hairStyle: 'short', beard: false, glasses: true, cap: null,
    top: '#a9c9e8', topStyle: 'tshirt', bottom: '#3d4046', bottomStyle: 'shorts', shoes: '#e9e9e9',
    note: 'Grey hair, glasses, light blue henley tee, charcoal shorts, white trainers with stripes.',
  },
  {
    id: 'kid', label: 'Little explorer', age: 'child', build: 0.55, height: 0.62,
    skin: '#f0c4a0', hair: '#5a3b26', hairStyle: 'short', beard: false, glasses: true, cap: null,
    top: '#9ec3e6', topStyle: 'tshirt', bottom: '#d9c9a8', bottomStyle: 'shorts', shoes: '#f2f2f2',
    note: 'A young boy with glasses and a light blue tee.',
  },
  {
    id: 'cap', label: 'Long hair and cap', age: 'adult', build: 0.95, height: 1.02,
    skin: '#e2b18c', hair: '#3a2a1e', hairStyle: 'long', beard: true, glasses: false, cap: '#9fb3c8',
    top: '#8d8f93', topStyle: 'tshirt', bottom: '#2f3238', bottomStyle: 'trousers', shoes: '#2b2b2b',
    note: 'Long dark hair, beard, grey-blue baseball cap, grey tee.',
  },
  {
    id: 'leopard', label: 'Leopard skirt', age: 'adult', build: 0.85, height: 0.98,
    skin: '#f0c7a6', hair: '#7a4a2e', hairStyle: 'long', beard: false, glasses: 'sun', cap: '#f4f1ea',
    top: '#efe3cc', topStyle: 'blouse', bottom: '#c9934a', bottomStyle: 'skirt', bottomPattern: 'leopard', shoes: '#f5f5f5',
    bag: '#1f1f22',
    note: 'White cap, sunglasses, cream ruffled blouse, leopard print midi skirt, black cross-body bag, white trainers.',
  },
  {
    id: 'jacket', label: 'Brown jacket', age: 'adult', build: 0.9, height: 0.95,
    skin: '#ecbe9c', hair: '#a5502c', hairStyle: 'bob', beard: false, glasses: false, cap: null,
    top: '#8a5a36', topStyle: 'jacket', bottom: '#ede6d8', bottomStyle: 'trousers', shoes: '#cdb79a',
    bag: '#2c3442',
    note: 'Short auburn bob, tan suede jacket, cream cropped trousers.',
  },
  {
    id: 'red', label: 'Red top', age: 'adult', build: 0.9, height: 0.96,
    skin: '#e7b08d', hair: '#3b261b', hairStyle: 'bun', beard: false, glasses: true, cap: null,
    top: '#c8413f', topStyle: 'tank', bottom: '#2a2d33', bottomStyle: 'trousers', shoes: '#2a2a2a',
    bag: '#1b1b1d',
    note: 'Dark hair tied back, glasses, red sleeveless top, black bag.',
  },
  {
    id: 'polo', label: 'Green polo', age: 'adult', build: 1.1, height: 1.03,
    skin: '#e9b896', hair: '#e9b896', hairStyle: 'bald', beard: 'stubble', glasses: false, cap: null,
    top: '#7f9a8c', topStyle: 'polo', bottom: '#6f8fb5', bottomStyle: 'shorts', shoes: '#7a4b2a',
    note: 'Shaved head, light stubble, sage green polo, denim shorts, brown leather shoes.',
  },
];

// Seat order in the 8-seat cart: [row, side] with row 0 = front bench (driver on the left).
export const SEATS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]];
