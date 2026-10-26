// Which theme this workspace renders with. Themes are files in themes/, one Brand each.
// Change DEFAULT to switch the whole workspace, or pick one per run:
//   MOTION_THEME=neon just draft <clip>
// Engine upgrades never replace this file or anything in themes/.
import type { Brand } from "./src/lib/brand.ts";

const DEFAULT = "sjramblings";

export const THEME_NAME = process.env.MOTION_THEME || DEFAULT;
const mod = (await import(`./themes/${THEME_NAME}.ts`).catch(() => {
  throw new Error(`no theme "${THEME_NAME}": expected themes/${THEME_NAME}.ts`);
})) as { default: Brand };
export const BRAND: Brand = mod.default;
