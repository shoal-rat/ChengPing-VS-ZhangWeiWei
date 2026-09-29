// Stage geometry: solid islands (with grabbable ledges), soft pass-through platforms,
// optional movers, blast zones and spawn points. Hazards are scripted per stage.

export class Stage {
  constructor(def, rng) {
    this.def = def;
    this.id = def.id;
    this.rng = rng;
    this.blast = { ...def.blast };
    this.plats = def.plats.map((p, i) => ({
      id: i, x1: p.x1, x2: p.x2, y: p.y, solid: !!p.solid, depth: p.depth || 0,
      ledges: p.solid && p.ledges !== false, kind: p.kind || (p.solid ? "main" : "soft"),
      path: p.path || null, t: 0, dx: 0, dy: 0, ox: 0, oy: 0, bx1: p.x1, bx2: p.x2, by: p.y,
      ice: 0, deco: p.deco || null,
    }));
    this.spawns = def.spawns;
    this.respawn = def.respawn || { x: 0, y: -380 };
    this.frame = 0;
    this.state = {};         // hazard scratch
    this.ledgeOwner = new Map();
    this.hazards = def.hazards || null;
  }

  step(world) {
    this.frame++;
    for (const p of this.plats) {
      if (!p.path) { p.dx = 0; p.dy = 0; continue; }
      const nx = p.path(this.frame, p, this), px = p.bx1 + p.ox, py = p.by + p.oy;
      p.ox = nx.x; p.oy = nx.y;
      const w = p.bx2 - p.bx1;
      const x1 = p.bx1 + p.ox, y = p.by + p.oy;
      p.dx = x1 - px; p.dy = y - py;
      p.x1 = x1; p.x2 = x1 + w; p.y = y;
    }
    if (this.hazards && world.rules.hazards) this.hazards(this, world);
  }

  ledgePoints() {
    const out = [];
    for (const p of this.plats) {
      if (!p.ledges) continue;
      out.push({ plat: p, side: -1, x: p.x1, y: p.y, key: p.id * 2 });
      out.push({ plat: p, side: 1, x: p.x2, y: p.y, key: p.id * 2 + 1 });
    }
    return out;
  }

  // Surface under x within [y0, y1] (sweeping down). Returns platform or null.
  findLanding(x, y0, y1, ignoreSoft, dropPlat) {
    let best = null, by = Infinity;
    for (const p of this.plats) {
      if (x < p.x1 - 2 || x > p.x2 + 2) continue;
      if (!p.solid && (ignoreSoft || p === dropPlat)) continue;
      const top = p.y;
      // platform may have moved up this frame: compare against where it was too
      if (y0 <= top + Math.max(0, -p.dy) + 0.01 && y1 >= top - Math.max(0, p.dy) && top < by) {
        best = p; by = top;
      }
    }
    return best;
  }

  groundAt(x, plat) {
    return x >= plat.x1 - 1 && x <= plat.x2 + 1;
  }

  // Solid-wall resolution for a fighter body (feet x,y; half width hw; height h)
  collideWalls(f, prevX) {
    for (const p of this.plats) {
      if (!p.solid) continue;
      const top = p.y, bot = p.y + p.depth;
      const feet = f.y, head = f.y - f.ecbH;
      if (feet <= top + 3 || head >= bot) continue; // above surface or fully below
      const L = p.x1, R = p.x2;
      if (f.x + f.ecbW > L && f.x - f.ecbW < R) {
        // came from which side?
        if (prevX + f.ecbW <= L + 1) { f.x = L - f.ecbW; return { wall: -1, plat: p }; }
        if (prevX - f.ecbW >= R - 1) { f.x = R + f.ecbW; return { wall: 1, plat: p }; }
        // came from below: ceiling
        if (head < bot && f.prevY - f.ecbH >= bot - 2) { f.y = bot + f.ecbH; return { ceil: true, plat: p }; }
        // embedded (e.g. respawn glitch): pop to nearest side
        const dl = f.x - L, dr = R - f.x;
        if (dl < dr) f.x = L - f.ecbW; else f.x = R + f.ecbW;
        return { wall: dl < dr ? -1 : 1, plat: p };
      }
    }
    return null;
  }
}
