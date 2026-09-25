# DuckBot — animated duck heads

One yellow SVG duck head redrawn from the supplied reference. It has ten selectable
faces and accessories, plus sixteen expressions adapted from the original bot.
The head blinks and breathes with deterministic motion, so animation exports can
replay the same frame.

The project began as a recreation of the x.ai bot avatar. The frame below documents
that earlier engine; the current player renders the duck head.

![Original motion reference going through idle, wink, orbit and burst](docs/demo.gif)

## Running it

```bash
pnpm install
pnpm dev
```

Then open http://localhost:5190.

```bash
pnpm test     # vitest
pnpm build    # vue-tsc --noEmit && vite build
```

Vue 3, Vite, TypeScript, Tailwind 4. No ESLint and no Prettier: `vue-tsc` is the
only gate, so run `pnpm build` before you call something done.

## What's in it

The rail on the left switches between three views. **Customise** offers ten
duck effects and sixteen expressions, kept between visits. **Animations** is
a small editor: arrange states into a timeline, set how long each is held, save the
result. **Settings** holds the language (French, English or Chinese) and the
credits.

Anything on screen can be exported: the avatar as SVG, PNG or an animated GIF, and
a whole timeline as GIF or MP4. The still formats need no library at all, and the
video encoder is only fetched the first time you ask for one.

Two URLs are worth knowing:

- `#planche`: the current animation states side by side, frozen. Quick visual check.
- `#etat=orbit&stop`: opens one state directly, playback paused.

## How it's put together

`DuckHead.vue` owns the shared head outline, effects, and expressions. Its
eye geometry and idle motion reuse the original bot's expression catalogue and
time sampling, adapted to the duck proportions.
`DuckBot.vue` supplies a deterministic time value for live playback, frozen
thumbnails, and frame-by-frame GIF/MP4 export. The older measurement engine
remains in `src/bot/` as reference material.

| | |
|---|---|
| [docs/architecture.md](docs/architecture.md) | The original engine and its radial-profile morphing |
| [docs/measurements.md](docs/measurements.md) | What was measured, and regenerating `profiles.ts` |
| [docs/intro.md](docs/intro.md) | The arrival sequence, and why it only plays one state |
| [docs/interface.md](docs/interface.md) | Layout, the three-column scene, CSS traps |
| [docs/export.md](docs/export.md) | Exporting to SVG, PNG, GIF and MP4 |
| [docs/i18n.md](docs/i18n.md) | The hand-rolled translation layer |

## Using the component

```vue
<DuckBot v-model:block="block" v-model:state="state" v-model:playing="playing" />
<DuckBot state="orbit" :size="120" :frozen-at="1.2" />
<DuckBot v-model:state="conversationState" mode="conversation" :playing="true" />
```

`block` is the playback cursor: a montage can play the same state twice, so the
index is what identifies where you are; `state` follows it as an output. Pass
`frozenAt` and the component renders one exact frame with no animation loop, which
is how the thumbnails and the state board are drawn.

For a homepage conversation, set `mode="conversation"` and control `state` from
your chat events: use `idle` while waiting, `thinking` while the reply is pending,
then `play` or `wide` when the reply arrives. Each state restarts when it changes
and loops for as long as it stays active. `playing` starts and pauses that loop.

Props: `size`, `duckStyle`, `frozenAt`, `cycle`, `mode`, `follow`.
Models: `block`, `state`, `playing`, `elapsed`. See
[DuckBot.vue](src/components/DuckBot.vue) for the details.

## Changes

[CHANGELOG.md](CHANGELOG.md), one entry per release — which is how you tell whether the
copy you have carries a given fix.

## License

MIT. See [LICENSE](LICENSE).

Not affiliated with, endorsed by or connected to x.ai. The original engine was
an exercise based on their bot avatar; "Grok" and "x.ai" belong to their owners.
