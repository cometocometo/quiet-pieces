/**
 * The picture library: packs of named pictures, each one a recipe for a
 * generator. Add licensed photos or commissioned art later by giving a
 * picture a `src` URL instead of a recipe (see `Picture.src`).
 */
import { hashString } from '../engine/rng';
import type { PictureRecipe } from './render';

export interface Picture {
  id: string;
  pack: string;
  title: string;
  /** Width / height. Built-in pictures are 3:2. */
  aspect: number;
  recipe?: PictureRecipe;
  /** URL of an image file, for pictures that are not drawn in code. */
  src?: string;
  /** Small version of `src` for menus. */
  thumb?: string;
  /** Who made it and under what licence, shown with the picture. */
  credit?: string;
  /** Where the original lives (licence page). */
  source?: string;
}

export interface Pack {
  id: string;
  title: string;
  blurb: string;
  /** Paid content when monetisation is switched on. */
  premium: boolean;
  /** Accent colour used on cards. */
  accent: string;
  pictures: Picture[];
}

type Entry = [gen: string, v: number, title: string];

const PACKS: { id: string; title: string; blurb: string; premium: boolean; accent: string; entries: Entry[] }[] = [
  {
    id: 'golden-hour', title: 'Golden Hour', blurb: 'Mountain light at the edges of the day.', premium: false, accent: '#e0795a',
    entries: [
      ['ridges', 0, 'Violet Ridge'], ['ridges', 1, 'Morning Haze'], ['ridges', 4, 'Ember Peaks'], ['lake', 0, 'Still Water'],
      ['ridges', 3, 'Snowline'], ['ridges', 5, 'Teal Valley'], ['lake', 3, 'Glacier Mirror'], ['ridges', 2, 'Moonrise'],
      ['lake', 2, 'Night Lake'], ['lake', 4, 'Copper Shore'],
    ],
  },
  {
    id: 'coastlines', title: 'Coastlines', blurb: 'Salt air, sails and a lighthouse on the cliff.', premium: false, accent: '#3c8fb3',
    entries: [
      ['seaSunset', 0, 'Last Light at Sea'], ['lighthouse', 0, 'The Keeper'], ['seaSunset', 1, 'Blue Noon'], ['lighthouse', 1, 'Night Watch'],
      ['seaSunset', 3, 'Peach Harbour'], ['lighthouse', 2, 'Evening Cliffs'], ['seaSunset', 2, 'Moon Path'], ['seaSunset', 4, 'Rose Tide'],
      ['lighthouse', 3, 'Gull Point'], ['seaSunset', 5, 'Open Water'],
    ],
  },
  {
    id: 'night-skies', title: 'Night Skies', blurb: 'Auroras, galaxies and a city that never sleeps.', premium: false, accent: '#6b4dff',
    entries: [
      ['aurora', 0, 'Northern Lights'], ['space', 0, 'Ringed Giant'], ['skyline', 1, 'Midnight City'], ['aurora', 1, 'Magenta Veil'],
      ['space', 1, 'Blue Nebula'], ['aurora', 2, 'Green Fire'], ['space', 2, 'Red Dwarf'], ['skyline', 0, 'Dusk Over the River'],
      ['aurora', 3, 'Cabin Glow'], ['space', 3, 'Far Moons'],
    ],
  },
  {
    id: 'desert', title: 'Desert Light', blurb: 'Dunes that change colour with the hour.', premium: true, accent: '#d98654',
    entries: [
      ['dunes', 0, 'Caravan'], ['dunes', 1, 'Violet Sands'], ['dunes', 2, 'High Noon'], ['dunes', 3, 'Amber Crest'],
      ['dunes', 4, 'Dusk Dunes'], ['dunes', 5, 'White Heat'], ['dunes', 6, 'Long Shadows'], ['dunes', 7, 'Plum Evening'],
      ['dunes', 8, 'Shimmer'], ['dunes', 9, 'Sand Sea'],
    ],
  },
  {
    id: 'countryside', title: 'Countryside', blurb: 'Patchwork fields, wildflowers and balloons.', premium: true, accent: '#7fb069',
    entries: [
      ['fields', 0, 'Patchwork Valley'], ['balloons', 0, 'Up, Up and Away'], ['fields', 1, 'Harvest Time'], ['meadow', 0, 'Tulip Rows'],
      ['balloons', 1, 'Sunrise Flight'], ['fields', 2, 'Spring Fields'], ['balloons', 2, 'Lilac Sky'], ['fields', 3, 'Golden Acres'],
      ['meadow', 1, 'Poppy Hill'], ['fields', 4, 'Hedgerows'],
    ],
  },
  {
    id: 'little-towns', title: 'Little Towns', blurb: 'Painted houses stacked above the harbour.', premium: true, accent: '#f2c14e',
    entries: [
      ['hillTown', 0, 'Harbour Hill'], ['hillTown', 1, 'Pastel Village'], ['skyline', 2, 'City by Day'], ['hillTown', 2, 'Evening Lights'],
      ['hillTown', 3, 'Fishing Town'], ['skyline', 3, 'River Dusk'], ['hillTown', 4, 'Sorbet Streets'], ['skyline', 4, 'Lantern Bridge'],
      ['hillTown', 5, 'Night Harbour'], ['skyline', 5, 'Bright Towers'],
    ],
  },
  {
    id: 'under-the-sea', title: 'Under the Sea', blurb: 'Coral gardens, turtles and schools of fish.', premium: true, accent: '#1fa29b',
    entries: [
      ['reef', 0, 'Coral Garden'], ['reef', 1, 'Lagoon'], ['reef', 2, 'The Deep Blue'], ['reef', 3, 'Turtle Bay'],
      ['reef', 4, 'Sunbeams'], ['reef', 5, 'Night Dive'], ['reef', 6, 'Clownfish Corner'], ['reef', 7, 'Shallows'],
      ['reef', 8, 'Bubble Reef'], ['reef', 9, 'Kelp and Coral'],
    ],
  },
  {
    id: 'modern', title: 'Modern Shapes', blurb: 'Bauhaus grids, Memphis confetti and quilts.', premium: true, accent: '#c4000b',
    entries: [
      ['bauhaus', 0, 'Primary'], ['memphis', 0, 'Confetti'], ['quilt', 0, 'Heirloom'], ['bauhaus', 1, 'Seaside Grid'],
      ['memphis', 1, 'Pop'], ['quilt', 1, 'Picnic'], ['bauhaus', 2, 'Desert Modern'], ['memphis', 2, 'Neon Night'],
      ['quilt', 2, 'Dusty Rose'], ['bauhaus', 3, 'Playground'],
    ],
  },
  {
    id: 'glass', title: 'Glass & Facets', blurb: 'Stained glass, kaleidoscopes and low-poly peaks.', premium: true, accent: '#5b2a86',
    entries: [
      ['stainedGlass', 0, 'Rose Window'], ['kaleido', 0, 'Kaleidoscope'], ['lowpoly', 0, 'Faceted Dusk'], ['stainedGlass', 1, 'Chapel'],
      ['kaleido', 1, 'Fire Mandala'], ['lowpoly', 1, 'Ice Facets'], ['kaleido', 2, 'Ember Wheel'], ['stainedGlass', 2, 'Garden Glass'],
      ['lowpoly', 2, 'Copper Facets'], ['kaleido', 3, 'Violet Bloom'],
    ],
  },
  {
    id: 'garden', title: 'The Garden', blurb: 'Leaves, blossoms and glowing flowers.', premium: true, accent: '#40916c',
    entries: [
      ['botanical', 0, 'Jungle'], ['bloom', 0, 'Night Bloom'], ['meadow', 2, 'Lavender Field'], ['botanical', 1, 'Greenhouse'],
      ['bloom', 1, 'Moon Garden'], ['meadow', 3, 'Tulip Sunset'], ['botanical', 2, 'Midnight Palms'], ['bloom', 2, 'Ember Petals'],
      ['meadow', 4, 'Wild Poppies'], ['botanical', 3, 'Monstera'],
    ],
  },
  {
    id: 'masterpiece', title: 'Masterpiece Challenge', blurb: 'Swirls and patterns for experts. Few easy edges.', premium: true, accent: '#d4af37',
    entries: [
      ['marble', 0, 'Midnight Marble'], ['seigaiha', 0, 'Blue Waves'], ['marble', 1, 'Rose Marble'], ['stainedGlass', 3, 'Mosaic'],
      ['marble', 2, 'Jade Marble'], ['seigaiha', 1, 'Red Waves'], ['marble', 3, 'Amethyst'], ['seigaiha', 2, 'Green Waves'],
      ['stainedGlass', 4, 'Cathedral'], ['marble', 4, 'Storm Marble'],
    ],
  },
];

import { PHOTO_PACKS } from './photos';

export const packs: Pack[] = [...PHOTO_PACKS, ...PACKS.map((p) => ({
  id: p.id, title: p.title, blurb: p.blurb, premium: p.premium, accent: p.accent,
  pictures: p.entries.map(([gen, v, title], i) => ({
    id: `${p.id}/${i + 1}`,
    pack: p.id,
    title,
    aspect: 1.5,
    recipe: { gen, v, seed: hashString(`${p.id}:${i}:${gen}:${v}`) % 1_000_000 },
  })),
}))];

const byId = new Map<string, Picture>();
for (const p of packs) for (const pic of p.pictures) byId.set(pic.id, pic);

export function picture(id: string): Picture | undefined { return byId.get(id) ?? userPictures.get(id); }
export function pack(id: string): Pack | undefined { return packs.find((p) => p.id === id); }
export const allPictures = (): Picture[] => [...byId.values()];

/** Pictures the player imported from their own device (kept in IndexedDB). */
export const userPictures = new Map<string, Picture>();
export function registerUserPicture(p: Picture) { userPictures.set(p.id, p); }
