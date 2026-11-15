/** Seamless table surfaces drawn in code: felt, wood, linen, slate. */
import { mulberry32 } from './rng';

export interface Surface { id: string; name: string; base: string; dark: boolean }

export const SURFACES: Surface[] = [
  { id: 'linen', name: 'Linen', base: '#e9e3d8', dark: false },
  { id: 'felt-green', name: 'Green felt', base: '#2f5d4a', dark: true },
  { id: 'felt-navy', name: 'Navy felt', base: '#22314f', dark: true },
  { id: 'oak', name: 'Oak', base: '#b98a5a', dark: false },
  { id: 'walnut', name: 'Walnut', base: '#5a3d2b', dark: true },
  { id: 'slate', name: 'Slate', base: '#3a3f45', dark: true },
  { id: 'paper', name: 'Paper', base: '#f6f3ee', dark: false },
  { id: 'midnight', name: 'Midnight', base: '#16151c', dark: true },
];

/** Value noise that wraps around every `period` cells, so the tile has no seams. */
function periodicNoise(seed: number, period: number) {
  const rnd = mulberry32(seed);
  const grid = Array.from({ length: period * period }, () => rnd());
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function surfaceCanvas(id: string, size = 512): HTMLCanvasElement {
  const s = SURFACES.find((x) => x.id === id) ?? SURFACES[0];
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  const img = c.createImageData(size, size);
  const [R, G, B] = hexRgb(s.base);
  const rnd = mulberry32(7);
  const n1 = periodicNoise(11, 8), n2 = periodicNoise(23, 32), n3 = periodicNoise(5, 4);
  const wood = id === 'oak' || id === 'walnut';
  const linen = id === 'linen' || id === 'paper';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let k = 0;
      if (wood) {
        // long grain running across, warped by noise, plus fine fibres
        // fine, mostly straight grain lines across each plank, gently warped
        const warp = n1(u * 8, v * 8) * 0.9 + n3(u * 4, v * 4) * 0.6;
        const ring = Math.sin((v * 64 + warp * 3) * Math.PI);
        const fibre = n2(u * 4, (v * 32 * 8) % 32);
        k = ring * 0.035 + (fibre - 0.5) * 0.12 + (n1(u * 8, v * 8) - 0.5) * 0.08 + (rnd() - 0.5) * 0.04;
        // planks every quarter
        if ((y % (size / 4)) < 2) k -= 0.18;
      } else if (linen) {
        const weave = (Math.sin(x * 1.3) + Math.sin(y * 1.3)) * 0.012;
        k = weave + (n2(u * 32, v * 32) - 0.5) * 0.04 + (rnd() - 0.5) * 0.04 + (n1(u * 8, v * 8) - 0.5) * 0.03;
      } else if (id === 'slate') {
        k = (n1(u * 8, v * 8) - 0.5) * 0.12 + (n2(u * 32, v * 32) - 0.5) * 0.08 + (rnd() - 0.5) * 0.05;
      } else {
        // felt and midnight: soft fibres
        k = (rnd() - 0.5) * 0.09 + (n2(u * 32, v * 32) - 0.5) * 0.05 + (n1(u * 8, v * 8) - 0.5) * 0.04;
      }
      const f = 1 + k;
      const i = (y * size + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, R * f));
      img.data[i + 1] = Math.max(0, Math.min(255, G * f));
      img.data[i + 2] = Math.max(0, Math.min(255, B * f));
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}
