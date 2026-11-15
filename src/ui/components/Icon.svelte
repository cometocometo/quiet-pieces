<script lang="ts" module>
  // A small, consistent line-icon set (24px grid, 1.8 stroke).
  const PATHS: Record<string, string> = {
    back: 'M15 5l-7 7 7 7',
    close: 'M6 6l12 12M18 6L6 18',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.4 7.4 0 0 1-2.1 1.2l-.3 2h-4l-.3-2a7.4 7.4 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-2.9L3 9.4l2-3.4 1.9.7c.6-.5 1.3-.9 2.1-1.2l.3-2h4l.3 2c.8.3 1.5.7 2.1 1.2l1.9-.7 2 3.4-1.6 1.2c.2 1 .2 2 0 2.9z',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    edges: 'M4 4h16v16H4zM9 9h6v6H9z',
    sort: 'M4 7h10M4 12h7M4 17h4M17 5v14M14 16l3 3 3-3',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
    fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    play: 'M8 5v14l11-7z',
    plus: 'M12 5v14M5 12h14',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    flame: 'M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-4.3 2.4-5.5.2 1.6 1 2.8 2.1 3.2C11 7.8 12 3 12 3z',
    calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4',
    share: 'M12 15V3M8 7l4-4 4 4M5 12v7h14v-7',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 1 0 0-.1z',
    sound: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
    mute: 'M11 5L6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6',
    rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    palette: 'M12 3a9 9 0 0 0 0 18c1.2 0 1.6-1 1.1-1.9-.6-1.1 0-2.6 1.6-2.6H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01M17 11h.01',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    puzzle: 'M10 4a2 2 0 0 1 4 0v2h4v4h-2a2 2 0 0 0 0 4h2v4h-4v-2a2 2 0 0 0-4 0v2H6v-4h2a2 2 0 0 0 0-4H6V6h4z',
    pause: 'M8 5v14M16 5v14',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
    upload: 'M12 16V4M7 9l5-5 5 5M4 17v3h16v-3',
  };
</script>

<script lang="ts">
  let { name, size = 20, fill = false }: { name: string; size?: number; fill?: boolean } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d={PATHS[name] ?? ''} />
</svg>
