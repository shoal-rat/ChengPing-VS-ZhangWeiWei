// Visual identity: 热搜 red + sticker white + ink, bold oblique display type (得意黑).
export const FONT = '"Smiley Sans","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
const FB = ',"PingFang SC","Microsoft YaHei",sans-serif';
export const F_HY = '"HuangYou"' + FB;
export const F_XW = '"XiaoWei","Songti SC","SimSun",serif';
export const F_BR = '"MaShan"' + FB;
// Persona-5 red / black / white
export const RED = "#e8141c";
export const RED2 = "#b00010";
export const BLK = "#0c0b0e";
export const WHT = "#ffffff";
export const INK = "#1c1426";
export const PAPER = "#fff6e5";
export const HOT = "#ff2d3a";
export const HOT2 = "#ff8a1f";
export const GOLD = "#ffd23c";
export const CYAN = "#2ee6d6";
export const PCOL = ["#ff3b4a", "#2f8bff", "#ffc21a", "#27c46b"];
export const PNAME = ["1P", "2P", "3P", "4P"];
export const CPUCOL = "#8a8f99";

export function pctColor(p) {
  // white -> yellow -> orange -> red -> dark red
  const stops = [[0, [255, 255, 255]], [40, [255, 236, 120]], [80, [255, 160, 60]], [130, [255, 60, 50]], [200, [150, 10, 20]]];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i];
      const t = (p - a) / (b - a);
      const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(150,10,20)";
}
