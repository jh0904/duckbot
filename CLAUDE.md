# bloub: notes for Claude

## Current avatar

The displayed character is a **yellow duck head** based on the user supplied PNG references. `src/components/DuckHead.vue` owns its shared silhouette, ten effects, sixteen bot inspired expressions, and time based motion. `src/components/BloubBot.vue` selects an effect from the current state and supplies time to the drawing. Keep one recognisable head across all effects; change facial features and accessories for each style.

The original x.ai ball engine in `src/bot/` still supplies cycle, state, and catalogue data, but it no longer draws the avatar. The frame measurements and render rules in `docs/measurements.md` and `docs/architecture.md` describe that earlier engine. Consult them when changing the old engine, not when drawing the duck.

## Working on the duck

- Edit the shared head in `DuckHead.vue`, then check the ten effects and sixteen expressions in the customiser. The head shape, eye placement, and beak proportions come from the duck references. The expression catalogue and idle motion come from `src/bot/expressions.ts` and `src/bot/face.ts`, scaled to preserve the classic duck proportions.
- Animate through the component's `time` and `effectTime` props. `BloubBot.vue` provides live time and `rendAt(t)` provides deterministic samples for GIF, MP4, and animated SVG export. The wink uses the current state's elapsed time so it plays when that state begins.
- Export serialises the actual SVG in `src/ui/capture.ts`. Add `data-duck-animate` to a moving SVG group so `src/ui/anime.ts` can capture its transform for animated SVG. Keep visible SVG features self contained; exported files have no page CSS.
- `public/favicon.svg` is the static duck head. Regenerate `public/favicon.ico` and `public/apple-touch-icon.png` from it when the base drawing changes.

## Project conventions

Vue 3, TypeScript strict, Vite, Tailwind 4, and pnpm. Use two space indentation, single quotes, and no semicolons. Write code comments in French. Run `pnpm build` and `pnpm test` before concluding.

`src/bot/` is framework free and clock free. Its `engine.sample(t)` remains a pure function; tests for the older engine still run. Shared Vue code belongs in `src/ui/`. Display labels resolve through `t(...)`, and all three locales must contain each catalogue label.

Keep `mediabunny` behind the dynamic import in `src/ui/video.ts`, so video encoding does not enter the initial bundle. Runtime reduced motion preferences affect decorative UI transitions; the duck's breathing, gaze, and blinking remain part of the character.

`src/ui/capture.test.ts` uses a DOM to mount `BloubBot.vue` and verify that export captures the rendered component. Other tests run in Node. The Vue plugin in `vitest.config.ts` supports that test.

For layout changes, the only breakpoint is 64rem. The wide view uses a three column scene that does not scroll; the narrow view stacks content and scrolls. Check both when placing fixed or bottom anchored UI.
