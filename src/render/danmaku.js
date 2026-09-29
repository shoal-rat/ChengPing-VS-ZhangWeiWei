// 弹幕, Persona style: each comment is a small slanted cut-out box.
const STY = [["#0c0b0e", "#ffffff"], ["#ffffff", "#0c0b0e"], ["#e8141c", "#ffffff"], [null, "#ffffff"], ["#0c0b0e", "#ffd23c"], [null, "#ffffff"]];

export class Danmaku {
  constructor(on = true, density = 2) { this.on = on; this.density = density; this.list = []; this.lanes = new Array(9).fill(0); this.t = 0; }
  push(texts) { if (!this.on) return; for (const s of texts) this.spawn(s); }
  burst(pool, n) {
    if (!this.on) return;
    const k = [0, 0.5, 1, 1.7][this.density] ?? 1;
    const m = Math.max(1, Math.round(n * k));
    for (let i = 0; i < m; i++) this.spawn(pool[Math.floor(Math.random() * pool.length)], i * 7);
  }
  spawn(text, delay = 0) {
    let lane = 0, best = 1e9;
    for (let i = 0; i < this.lanes.length; i++) if (this.lanes[i] < best) { best = this.lanes[i]; lane = i; }
    this.lanes[lane] = this.t + 26 + delay;
    const st = STY[Math.floor(Math.random() * STY.length)];
    this.list.push({ text, lane, x: 1400 + delay * 8 + Math.random() * 80, v: 3.2 + Math.random() * 1.6 + text.length * 0.05,
      st, size: 18 + (Math.random() < 0.2 ? 8 : 0) + Math.floor(Math.random() * 3), rot: (Math.random() - 0.5) * 0.12, sk: 6 + Math.random() * 6 });
  }
  step() { this.t++; for (const d of this.list) d.x -= d.v; this.list = this.list.filter((d) => d.x > -600); }
  draw(ctx, vw, font) {
    if (!this.on) return;
    for (const d of this.list) {
      const y = 64 + d.lane * 31, x = d.x * vw / 1280;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(d.rot);
      ctx.font = `900 ${d.size}px ${font}`;
      const w = ctx.measureText(d.text).width, h = d.size * 1.35;
      const [bg, fg] = d.st;
      if (bg) {
        ctx.fillStyle = bg === "#0c0b0e" ? "#e8141c" : "#0c0b0e";
        ctx.beginPath(); ctx.moveTo(-8 + d.sk + 4, -h / 2 + 4); ctx.lineTo(w + 12 + 4, -h / 2 + 4); ctx.lineTo(w + 12 - d.sk + 4, h / 2 + 4); ctx.lineTo(-8 + 4, h / 2 + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-8 + d.sk, -h / 2); ctx.lineTo(w + 12, -h / 2); ctx.lineTo(w + 12 - d.sk, h / 2); ctx.lineTo(-8, h / 2); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      if (!bg) { ctx.lineWidth = 5; ctx.strokeStyle = "#0c0b0e"; ctx.lineJoin = "round"; ctx.strokeText(d.text, 2, 1); }
      ctx.fillStyle = fg; ctx.fillText(d.text, 2, 1);
      ctx.restore();
    }
  }
}
