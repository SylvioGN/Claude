// Tiny event bus shared through ctx.events.
//
// Event names used across modules (payload in braces):
//   'state'        {from, to}                game state changed: loading|title|playing|stop|finished|paused
//   'collect'      {kind, x, z, value}       kind: 'gelato' | 'pinecone'
//   'bump'         {kind, strength, x, z}    cart hit something; strength 0..1; kind = collider tag
//   'honk'         {}                         player pressed the horn
//   'splash'       {x, z}                     cart drove through a puddle / into water edge
//   'stopReached'  {id, index, total}         a tour stop was reached (photo moment starts)
//   'stopClosed'   {id}                       the photo card was dismissed, driving resumes
//   'tourComplete' {}                         every tour stop visited
//   'medal'        {id, count}                bronze / silver / gold after 4 / 8 / 12 stops
//   'tourReset'    {}                         the player started a new tour
//   'boost'        {on}                       gelato turbo started / ended
//   'surface'      {type}                     cart moved onto 'path' | 'grass' | 'plaza' | 'sand'
//   'animal'       {kind, x, z}               an animal reacted (pigeons fly, duck quacks...) - for sounds
//   'driver'       {index}                    player picked a driver on the title screen
//   'settings'     {lang, sound, music, easy} settings changed
export class Events {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.map.get(name)?.delete(fn);
  }
  emit(name, payload = {}) {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[events] ${name} handler failed`, err); }
    }
  }
}
