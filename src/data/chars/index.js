import { buildChar } from "../common.js";
import chen from "./chen.js";
import zhang from "./zhang.js";
import huxijin from "./huxijin.js";
import fengge from "./fengge.js";
import huchenfeng from "./huchenfeng.js";
import mabaoguo from "./mabaoguo.js";
import laoa from "./laoa.js";

export const CHARS = {};
for (const d of [chen, zhang, huxijin, fengge, huchenfeng, mabaoguo, laoa]) CHARS[d.id] = buildChar(d);
export const ROSTER = ["chen", "zhang", "huxijin", "fengge", "huchenfeng", "mabaoguo", "laoa"];
