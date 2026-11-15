/**
 * Photo packs: real photographs shipped as image files.
 *
 * Every photo here comes from Wikimedia Commons under a licence that allows
 * commercial use with credit (CC BY or CC BY-SA). The credit is shown with
 * the picture in the game and in Settings → Credits. Keep it that way when
 * adding photos: record the photographer, licence and source page.
 */
import type { Pack, Picture } from './catalog';

interface PhotoEntry { file: string; title: string; aspect: number; artist: string; licence: string; source: string }

const BANFF: PhotoEntry[] = [
  { file: '01.jpg', title: "Moraine Lake at Dusk", aspect: 1.6389, artist: "David Zhang", licence: 'CC BY-SA 2.0', source: "https://commons.wikimedia.org/wiki/File:Moraine_Lake_at_evening1.jpg" },
  { file: '02.jpg', title: "Lake Louise Shore", aspect: 1.4997, artist: "Thomas Fuhrmann", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Lake_Louise_03.jpg" },
  { file: '03.jpg', title: "The Boathouse", aspect: 1.5, artist: "Dietmar Rabich", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Banff_National_Park_(AB,_Canada),_Lake_Louise_--_2022_--_2199.jpg" },
  { file: '04.jpg', title: "Moraine Sunrise", aspect: 1.5103, artist: "Jakub Fry\u0161", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Moraine_Lake_sunrise.jpg" },
  { file: '05.jpg', title: "Rockies in the Morning", aspect: 1.498, artist: "Sergey Pesterev", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Rockies_in_the_morning.jpg" },
  { file: '06.jpg', title: "Ten Peaks Valley", aspect: 1.6, artist: "Florian Fuchs", licence: 'CC BY 3.0', source: "https://commons.wikimedia.org/wiki/File:Lake_Moraine-Banff_National_Park.jpg" },
  { file: '07.jpg', title: "Peyto Lake", aspect: 1.682, artist: "Tobias Alt, Tobi 87", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Peyto_Lake-Banff_NP-Canada.jpg" },
  { file: '08.jpg', title: "Moraine from the Rockpile", aspect: 1.4668, artist: "DXR", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Moraine_Lake,_north_view_from_Rockpiles_20240823_1.jpg" },
  { file: '09.jpg', title: "Lake Louise Golden Hour", aspect: 1.3333, artist: "Cnferrer", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Lake_Louise_Golden_Hour_2.jpg" },
  { file: '10.jpg', title: "Minnewanka Island", aspect: 1.4997, artist: "Dietmar Rabich", licence: 'CC BY-SA 4.0', source: "https://commons.wikimedia.org/wiki/File:Banff_National_Park_(AB,_Canada),_Lake_Minnewanka_--_2022_--_2277.jpg" },
  { file: '11.jpg', title: "Winter Forest", aspect: 1.3438, artist: "laszlo-photo", licence: 'CC BY-SA 2.0', source: "https://commons.wikimedia.org/wiki/File:The_Mountain_Exhaled_edit.jpg" },
  { file: '12.jpg', title: "Lake Agnes", aspect: 1.5094, artist: "Florian Fuchs", licence: 'CC BY 3.0', source: "https://commons.wikimedia.org/wiki/File:Lake_Agnes_im_Banff_National_Park.jpg" },
];

function photoPack(id: string, title: string, blurb: string, accent: string, dir: string, list: PhotoEntry[]): Pack {
  return {
    id, title, blurb, accent, premium: false,
    pictures: list.map((p, i): Picture => ({
      id: `${id}/${i + 1}`,
      pack: id,
      title: p.title,
      aspect: p.aspect,
      src: `./photos/${dir}/${p.file}`,
      thumb: `./photos/${dir}/thumb/${p.file}`,
      credit: `Photo: ${p.artist}, ${p.licence}, via Wikimedia Commons`,
      source: p.source,
    })),
  };
}

export const PHOTO_PACKS: Pack[] = [
  photoPack('banff', 'Banff', 'Turquoise lakes and the Canadian Rockies, in real photographs.', '#1f9ab0', 'banff', BANFF),
];
