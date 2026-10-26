// A camera over a world. Scenes draw in world units centred on the camera's
// home position; each layer says how far away it is, and the camera does the rest.
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { Layout } from "./film.ts";

export interface Camera {
  x: number; // left / right: pan or track
  y: number; // up / down: tilt or crane
  zoom: number; // in / out: push or pull
}

// What the frame shows at zoom 1, in world units.
export interface View {
  w: number;
  h: number;
}

// depth 0 is infinitely far and never moves; 1 is the subject plane and follows
// the camera exactly; above 1 is foreground and sweeps past faster. The
// difference in speed between layers is what reads as depth.
export function layer(g: SKRSContext2D, L: Layout, view: View, cam: Camera, depth: number, draw: () => void): void {
  const fit = Math.max(L.w / view.w, L.h / view.h);
  const z = 1 + (cam.zoom - 1) * depth;
  g.save();
  g.translate(L.cx, L.cy);
  g.scale(fit * z, fit * z);
  g.translate(-cam.x * depth, -cam.y * depth);
  draw();
  g.restore();
}
