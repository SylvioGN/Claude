// STUB - names and kid-friendly facts for every tour stop, in en/it/fr/es/pt.
// Shape: CONTENT[stopId] = { name: {en, it, fr, es, pt}, facts: [{en, it, fr, es, pt}, ...] }
export const CONTENT = {
  terrazza: { name: { en: 'Pincio Terrace' }, facts: [{ en: 'From here you can see the dome of Saint Peter\'s far away.' }] },
  idrocronometro: { name: { en: 'Water Clock' }, facts: [{ en: 'This clock is powered by water.' }] },
  lago: { name: { en: 'Temple on the Lake' }, facts: [{ en: 'You can rent a rowing boat on this lake.' }] },
  siena: { name: { en: 'Piazza di Siena' }, facts: [{ en: 'Horses jump here in a famous show every spring.' }] },
  fortezzuola: { name: { en: 'Little Castle' }, facts: [{ en: 'A sculptor lived and worked in this little castle.' }] },
  globe: { name: { en: 'Globe Theatre' }, facts: [{ en: 'A round wooden theatre for Shakespeare plays.' }] },
  bioparco: { name: { en: 'Bioparco Zoo' }, facts: [{ en: 'Rome\'s zoo is home to giraffes and elephants.' }] },
  galleria: { name: { en: 'Galleria Borghese' }, facts: [{ en: 'A palace full of famous statues and paintings.' }] },
  cavallimarini: { name: { en: 'Seahorse Fountain' }, facts: [{ en: 'Four seahorses hold up this fountain.' }] },
  diana: { name: { en: 'Temple of Diana' }, facts: [{ en: 'A little round temple for the goddess of the woods.' }] },
  raffaello: { name: { en: 'Casina di Raffaello' }, facts: [{ en: 'A house full of games and books for children.' }] },
  cinema: { name: { en: 'Cinema dei Piccoli' }, facts: [{ en: 'One of the smallest cinemas in the world.' }] },
};
export function stopName(id, lang = 'en') { const c = CONTENT[id]; return c ? c.name[lang] || c.name.en : id; }
export function stopFacts(id, lang = 'en') { const c = CONTENT[id]; return c ? c.facts.map((f) => f[lang] || f.en) : []; }
