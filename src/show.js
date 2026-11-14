// The complete show: environment + fireworks + characters, wired into the frame compositor.
import { createRenderer } from './render.js';

export function createShow(platform, layout, view, pxW, pxH) {
  return createRenderer(platform, layout, view, pxW, pxH, {});
}
