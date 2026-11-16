/** "Add to home screen": keeps the browser's install prompt so a button can offer it. */
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

export const install = $state({
  available: false,
  installed: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  ios: /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent),
});
let deferred: InstallEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  install.available = true;
});
window.addEventListener('appinstalled', () => { install.installed = true; install.available = false; });

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; install.available = false;
  return outcome === 'accepted';
}
