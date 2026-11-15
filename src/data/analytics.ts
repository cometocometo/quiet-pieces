/**
 * Analytics hook. Sends nothing anywhere: events are kept in memory (and
 * logged in development) so a privacy-respecting analytics provider can be
 * connected later in one place.
 */
const log: { event: string; props?: Record<string, unknown>; at: number }[] = [];

export function track(event: string, props?: Record<string, unknown>) {
  log.push({ event, props, at: Date.now() });
  if (log.length > 200) log.shift();
  if (import.meta.env.DEV) console.debug('[track]', event, props ?? '');
}

export const recentEvents = () => log.slice();
