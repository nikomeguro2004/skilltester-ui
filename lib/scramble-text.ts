import { animate } from "animejs";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Reveals `nextText` into `el` character-by-character from left to right,
 * filling not-yet-revealed positions with random glyphs each frame — driven
 * by an anime.js number tween rather than the library's built-in text-tween
 * (which requires a DOM adapter this build doesn't register).
 */
export function scrambleTo(el: HTMLElement, nextText: string, duration = 700) {
  const obj = { progress: 0 };
  const len = nextText.length;
  return animate(obj, {
    progress: len,
    duration,
    ease: "outQuad",
    onUpdate: () => {
      const revealed = Math.floor(obj.progress);
      let out = "";
      for (let i = 0; i < len; i++) {
        out += i < revealed ? nextText[i] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
    },
    onComplete: () => {
      el.textContent = nextText;
    },
  });
}
