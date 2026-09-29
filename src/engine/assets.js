// Image + JSON loading with progress.
export const IMG = {};
export const DATA = {};

export function loadImage(key, src, tries = 3) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; res(im); };
    im.onerror = () => {
      if (tries > 1) setTimeout(() => loadImage(key, src, tries - 1).then(res), 300);
      else { console.warn("missing image", src); res(null); }
    };
    im.src = src;
  });
}

export async function loadJSON(key, src) {
  try { const r = await fetch(src); DATA[key] = await r.json(); } catch (e) { console.warn("missing json", src); DATA[key] = null; }
  return DATA[key];
}

export async function loadAll(list, onProgress) {
  let done = 0;
  await Promise.all(list.map(async ([kind, key, src]) => {
    if (kind === "img") await loadImage(key, src); else await loadJSON(key, src);
    done++; onProgress && onProgress(done / list.length);
  }));
}
