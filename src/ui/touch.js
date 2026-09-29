// On-screen controls for phones/tablets: floating stick on the left, five buttons on the right.
import { TouchSource } from "../engine/input.js";
import { FONT, INK, HOT, GOLD } from "./theme.js";

export class TouchPad {
  constructor(app) {
    this.app = app;
    this.source = new TouchSource();
    this.active = true;
    this.stick = null;     // {id, ox, oy, x, y}
    this.btnPtr = new Map();
  }
  buttons(vh) {
    return [
      { b: "atk", label: "攻击", x: 1150, y: vh - 118, r: 66, col: HOT },
      { b: "spc", label: "必杀", x: 1012, y: vh - 78, r: 52, col: "#2f8bff" },
      { b: "jmp", label: "跳", x: 1200, y: vh - 262, r: 52, col: "#27c46b" },
      { b: "shd", label: "防御", x: 1050, y: vh - 214, r: 46, col: "#8a6aff" },
      { b: "grb", label: "抓", x: 918, y: vh - 150, r: 40, col: "#ff8a1f" },
      { b: "smh", label: "蓄力", x: 1110, y: vh - 350, r: 38, col: GOLD },
    ];
  }
  pointer(type, e, x, y) {
    const vh = this.app.vh, S = this.source;
    if (type === "down") {
      if (x > 1180 && y < 90) { S.pauseQ = true; return true; }
      for (const B of this.buttons(vh)) {
        if (Math.hypot(x - B.x, y - B.y) < B.r + 16) { this.btnPtr.set(e.pointerId, B.b); S.press(B.b); return true; }
      }
      if (x < 640) { this.stick = { id: e.pointerId, ox: x, oy: y, x, y }; this.upd(); return true; }
      return false;
    }
    if (type === "move") {
      if (this.stick && e.pointerId === this.stick.id) { this.stick.x = x; this.stick.y = y; this.upd(); return true; }
      const b = this.btnPtr.get(e.pointerId);
      if (b) {
        // slide between buttons
        for (const B of this.buttons(vh)) if (B.b !== b && Math.hypot(x - B.x, y - B.y) < B.r) { S.release(b); this.btnPtr.set(e.pointerId, B.b); S.press(B.b); }
        return true;
      }
      return false;
    }
    if (type === "up") {
      if (this.stick && e.pointerId === this.stick.id) { this.stick = null; S.stick.x = 0; S.stick.y = 0; return true; }
      const b = this.btnPtr.get(e.pointerId);
      if (b) { S.release(b); this.btnPtr.delete(e.pointerId); return true; }
    }
    return false;
  }
  upd() {
    const s = this.stick, R = 80;
    let dx = s.x - s.ox, dy = s.y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { s.ox = s.x - dx / d * R; s.oy = s.y - dy / d * R; dx = s.x - s.ox; dy = s.y - s.oy; }
    this.source.stick.x = dx / R; this.source.stick.y = dy / R;
  }
  draw(ctx, W, vh) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    const s = this.stick;
    const ox = s ? s.ox : 190, oy = s ? s.oy : vh - 170;
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ox, oy, 80, 0, 7); ctx.fill(); ctx.stroke();
    const kx = ox + this.source.stick.x * 80, ky = oy + this.source.stick.y * 80;
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(kx, ky, 36, 0, 7); ctx.fill();
    for (const B of this.buttons(vh)) {
      const on = this.source.held[B.b];
      ctx.globalAlpha = on ? 0.9 : 0.55;
      ctx.fillStyle = B.col; ctx.beginPath(); ctx.arc(B.x, B.y, B.r * (on ? 0.92 : 1), 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.round(B.r * 0.5)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(B.label, B.x, B.y + 2);
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(1230, 44, 30, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(1219, 30, 8, 28); ctx.fillRect(1234, 30, 8, 28);
    ctx.restore();
  }
}
