// 2D skeleton used by both the simulation (hitboxes/hurtboxes ride on bones) and
// the renderer. Local space: facing right, +y down, origin = point between the feet.
//
// Pose angles are degrees. Limb angles: 0 = hanging down, +90 = pointing forward,
// 180 = straight up. Elbow flex (fe/be) rotates the forearm forward/up; knee bend
// (fk/bk) swings the shin backward. Upper arms and thighs are measured in the body
// frame (after `rot`, ignoring `lean`) so a punch at 90° stays horizontal however
// much the torso bends.
import { DEG } from "./math.js";

export const NUM_KEYS = ["rot", "lean", "hd", "fa", "fe", "ba", "be", "fl", "fk", "bl", "bk",
  "px", "py", "sx", "sy", "pa"];
export const STEP_KEYS = ["fh", "bh", "ex", "pv"];

export function neutralPose() {
  return { rot: 0, lean: 0, hd: 0, fa: 10, fe: 20, ba: -10, be: 20, fl: 8, fk: 10, bl: -8, bk: 10,
    px: 0, py: 0, sx: 1, sy: 1, pa: 0, fh: "fist", bh: "fist", ex: 0, pv: 1 };
}

export function newJoints() {
  const j = {};
  for (const k of ["pel", "neck", "chest", "head", "hc", "fs", "fe", "fh", "bs", "be", "bh",
    "fhip", "fk", "ff", "bhip", "bk", "bf", "pt", "pm", "ctr"]) j[k] = [0, 0];
  j.a = {}; // world angles of segments (limb convention)
  return j;
}

// Solve forward kinematics into `j` (reused object). `grounded` plants the lowest foot on y=0.
export function solveRig(body, p, grounded, j) {
  const [th, sh] = body.leg;
  const [ua, fa] = body.arm;
  const tl = body.torso;
  const sl = Math.sin(p.lean * DEG), cl = Math.cos(p.lean * DEG);
  // pelvis
  const P = j.pel;
  P[0] = p.px; P[1] = -(th + sh) + p.py;
  // torso up vector
  const ux = sl, uy = -cl;
  const N = j.neck; N[0] = P[0] + ux * tl; N[1] = P[1] + uy * tl;
  const C = j.chest; C[0] = P[0] + ux * tl * 0.62; C[1] = P[1] + uy * tl * 0.62;
  const ctr = j.ctr; ctr[0] = P[0] + ux * tl * 0.45; ctr[1] = P[1] + uy * tl * 0.45;
  const H = j.head; H[0] = N[0] + ux * body.neck; H[1] = N[1] + uy * body.neck;
  // shoulders: slightly below neck; front shoulder a touch forward
  const drop = body.shoulderDrop;
  const fwx = cl, fwy = sl; // torso forward vector
  const sx0 = N[0] - ux * drop, sy0 = N[1] - uy * drop;
  j.fs[0] = sx0 + fwx * body.shoulderFwd; j.fs[1] = sy0 + fwy * body.shoulderFwd;
  j.bs[0] = sx0 - fwx * body.shoulderBack; j.bs[1] = sy0 - fwy * body.shoulderBack;
  limb(j.fs, p.fa, p.fe, ua, fa, j.fe, j.fh, 1);
  j.a.fu = p.fa; j.a.ff = p.fa + p.fe;
  limb(j.bs, p.ba, p.be, ua, fa, j.be, j.bh, 1);
  j.a.bu = p.ba; j.a.bf = p.ba + p.be;
  // hips
  j.fhip[0] = P[0] + body.hipW; j.fhip[1] = P[1];
  j.bhip[0] = P[0] - body.hipW; j.bhip[1] = P[1];
  limb(j.fhip, p.fl, -p.fk, th, sh, j.fk, j.ff, 1);
  j.a.ft = p.fl; j.a.fs = p.fl - p.fk;
  limb(j.bhip, p.bl, -p.bk, th, sh, j.bk, j.bf, 1);
  j.a.bt = p.bl; j.a.bs = p.bl - p.bk;
  // prop rides the front forearm
  const pang = p.fa + p.fe + p.pa;
  j.a.prop = pang;
  const pl = body.propLen || 0;
  j.pt[0] = j.fh[0] + Math.sin(pang * DEG) * pl; j.pt[1] = j.fh[1] + Math.cos(pang * DEG) * pl;
  j.pm[0] = j.fh[0] + Math.sin(pang * DEG) * pl * 0.55; j.pm[1] = j.fh[1] + Math.cos(pang * DEG) * pl * 0.55;
  j.a.torso = p.lean; j.a.head = p.lean * 0.5 + p.hd;
  // whole-body rotation around the body centre. rot > 0 = clockwise on screen, i.e. a
  // forward flip (same sense as lean). Limb angles run the other way, hence the minus.
  const rot = p.rot;
  if (rot) {
    const cx = ctr[0], cy = ctr[1];
    const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG);
    for (const k of PTS) {
      const q = j[k];
      const dx = q[0] - cx, dy = q[1] - cy;
      q[0] = cx + dx * c - dy * s;
      q[1] = cy + dx * s + dy * c;
    }
    for (const k of LIMB_ANGS) j.a[k] -= rot;
    j.a.torso += rot; j.a.head += rot;
  }
  // squash / stretch around the ground point (grounded) or body centre (air)
  if (p.sx !== 1 || p.sy !== 1) {
    const ox = grounded ? 0 : ctr[0], oy = grounded ? 0 : ctr[1];
    for (const k of PTS) {
      const q = j[k];
      q[0] = ox + (q[0] - ox) * p.sx;
      q[1] = oy + (q[1] - oy) * p.sy;
    }
  }
  if (grounded && Math.abs(rot) < 35) {
    const low = Math.max(j.ff[1], j.bf[1]);
    if (low !== 0) for (const k of PTS) j[k][1] -= low;
  }
  // head centre (for hurtbox / face): up from head base along head angle
  const ha = j.a.head;
  const hr = body.headR;
  j.hc[0] = j.head[0] + Math.sin(ha * DEG) * hr * 0.9;
  j.hc[1] = j.head[1] - Math.cos(ha * DEG) * hr * 0.9;
  return j;
}

const LIMB_ANGS = ["fu", "ff", "bu", "bf", "ft", "fs", "bt", "bs", "prop"];
const PTS = ["pel", "neck", "chest", "head", "fs", "fe", "fh", "bs", "be", "bh",
  "fhip", "fk", "ff", "bhip", "bk", "bf", "pt", "pm", "ctr"];

function limb(root, a1, flex, l1, l2, mid, end) {
  const s1 = Math.sin(a1 * DEG), c1 = Math.cos(a1 * DEG);
  mid[0] = root[0] + s1 * l1; mid[1] = root[1] + c1 * l1;
  const a2 = a1 + flex;
  end[0] = mid[0] + Math.sin(a2 * DEG) * l2; end[1] = mid[1] + Math.cos(a2 * DEG) * l2;
}

// Hurtboxes: capsules [x0,y0,x1,y1,r] in local space.
export function hurtCapsules(body, j, out) {
  let n = 0;
  const put = (a, b, r) => { const c = out[n] || (out[n] = [0, 0, 0, 0, 0]); c[0] = a[0]; c[1] = a[1]; c[2] = b[0]; c[3] = b[1]; c[4] = r; n++; };
  put(j.hc, j.hc, body.headR * 0.95);
  put(j.pel, j.neck, body.torsoW * 0.55);
  put(j.fhip, j.fk, body.legW[0] * 0.6);
  put(j.fk, j.ff, body.legW[1] * 0.6);
  put(j.bhip, j.bk, body.legW[0] * 0.6);
  put(j.bk, j.bf, body.legW[1] * 0.6);
  out.length = n;
  return out;
}

// Bone lookup for hitboxes: returns local [x,y] for a named anchor.
export function bonePoint(j, bone) {
  switch (bone) {
    case "fh": case "bh": case "ff": case "bf": case "fe": case "be": case "fk": case "bk":
    case "pel": case "neck": case "chest": case "head": case "hc": case "pt": case "pm": case "ctr":
    case "fs": case "bs":
      return j[bone];
    default:
      return j.ctr;
  }
}
