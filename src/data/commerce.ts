/**
 * Monetisation layer: which packs a player can open, and the hooks a store
 * will plug into. Switched off for now: every pack is open.
 *
 * To go live, set MONETISATION to true and implement `purchase` / `restore`
 * against the platform store (App Store / Google Play via Capacitor, or a web
 * payment provider). Nothing else in the game needs to change.
 */
import type { Pack } from '../art/catalog';
import { kvGet, kvSet } from './db';

export const MONETISATION = false;

export interface Product { id: string; kind: 'pack' | 'all-access'; title: string; price: string }

export const PRODUCTS: Product[] = [
  { id: 'all-access', kind: 'all-access', title: 'All Access: every pack, every month’s new pictures', price: '$3.99 / month' },
];

let owned = new Set<string>();

export async function loadEntitlements() {
  owned = new Set((await kvGet<string[]>('entitlements')) ?? []);
}

export function isUnlocked(pack: Pack): boolean {
  if (!MONETISATION || !pack.premium) return true;
  return owned.has('all-access') || owned.has(pack.id);
}

export async function purchase(productId: string): Promise<boolean> {
  if (!MONETISATION) return true;
  // Placeholder until a store is connected.
  throw new Error(`Purchases are not available yet (${productId}).`);
}

export async function restorePurchases(): Promise<void> {
  await kvSet('entitlements', [...owned]);
}
