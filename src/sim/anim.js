// Keyframe animation: an anim is [[frame, partialPose, easing?], ...]. Partial poses
// are merged over the character's base pose once, at load time.
import { NUM_KEYS, STEP_KEYS } from "./rig.js";
import { ease } from "./math.js";

export function resolveAnim(base, keys) {
  if (!keys || !keys.length) return [{ f: 0, pose: { ...base }, e: ease.lin }];
  const out = [];
  let prev = { ...base };
  for (const k of keys) {
    const [f, partial, e] = k;
    const pose = { ...prev, ...partial };
    // unspecified numeric keys fall back to base rather than carrying over the last
    // override, unless the keyframe asks to keep them ("~" flag)
    if (!k[3]) for (const nk of NUM_KEYS) if (!(nk in partial)) pose[nk] = base[nk];
    out.push({ f, pose, e: typeof e === "function" ? e : ease[e || "io"] });
    prev = pose;
  }
  return out;
}

export function samplePose(frames, f, out) {
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].f <= f) i++;
  const a = frames[i];
  const b = frames[i + 1];
  if (!b || f <= a.f) {
    copyPose(a.pose, out);
    return out;
  }
  const t = b.e((f - a.f) / (b.f - a.f));
  for (const k of NUM_KEYS) out[k] = a.pose[k] + (b.pose[k] - a.pose[k]) * t;
  for (const k of STEP_KEYS) out[k] = t < 0.5 ? a.pose[k] : b.pose[k];
  return out;
}

export function copyPose(src, dst) {
  for (const k of NUM_KEYS) dst[k] = src[k];
  for (const k of STEP_KEYS) dst[k] = src[k];
  return dst;
}

export function blendPose(a, b, t, out) {
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (const k of STEP_KEYS) out[k] = t < 0.5 ? a[k] : b[k];
  return out;
}
