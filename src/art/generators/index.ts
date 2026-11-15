import type { Generator } from '../lib';
import { bauhaus, kaleido, lowpoly, marble, memphis, quilt, seigaiha, stainedGlass } from './abstract';
import { hillTown, skyline } from './city';
import { bloom, botanical, meadow } from './flora';
import { dunes, fields, lake, ridges } from './landscapes';
import { lighthouse, reef, seaSunset } from './sea';
import { aurora, balloons, space } from './sky';

/** Every picture generator by name. Catalog entries refer to these names. */
export const GENERATORS: Record<string, Generator> = {
  ridges, lake, dunes, fields,
  seaSunset, lighthouse, reef,
  aurora, space, balloons,
  skyline, hillTown,
  bauhaus, stainedGlass, lowpoly, memphis, kaleido, marble, seigaiha, quilt,
  bloom, meadow, botanical,
};
