<script setup lang="ts">
import { computed } from 'vue'
import { blinkScale, EYE_H, EYE_SPLIT, EYE_W, liveliness } from '@/bot/face'
import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from '@/bot/expressions'
import { arcRender, COMET_DOT, COMET_RIBBONS, particles, RINGS } from '@/bot/decor'
import { clamp, easings, TAU } from '@/bot/math'
import type { DuckStyle } from '@/bot/skins'
import type { StateId } from '@/bot/states'

const props = defineProps<{
  effect: DuckStyle
  state?: StateId
  time: number
  elapsed?: number
  stateDuration?: number
  effectTime?: number
  id: string
  lookX?: number
  lookY?: number
  expression?: string
}>()

const life = computed(() => liveliness(props.time))
const expression = computed(() => {
  if (props.effect !== 'normal') return undefined
  return EXPRESSION_BY_ID.get(props.expression ?? DEFAULT_EXPRESSION)
    ?? EXPRESSION_BY_ID.get(DEFAULT_EXPRESSION)
})
const roundEyes = computed(() => props.state === 'wide' || ['surpris', 'excite', 'effraye'].includes(expression.value?.id ?? ''))
const openBeak = computed(() =>
  props.effect === 'surprise' || ['surpris', 'effraye'].includes(expression.value?.id ?? '')
)
const HEAD_PATH = 'M-28 -70 C-43 -81 -34 -100 -17 -103 C5 -110 27 -93 27 -70 C69 -59 92 -29 96 8 C97 17 96 23 97 26 C109 39 111 49 106 67 C96 98 58 109 0 109 C-58 109 -96 98 -106 67 C-111 49 -109 39 -97 26 C-96 23 -97 17 -96 8 C-93.12 -18.64 -80.39 -41.65 -58.18 -56.55 C-49.55 -62.35 -39.48 -66.92 -28 -70 Z'
const HEX_PATH = 'M-28 -72 C-43 -83 -34 -101 -17 -103 C5 -110 27 -94 27 -72 C38 -70 48 -68 57 -66 C72 -50 89 -18 98 4 C102 12 102 20 98 28 C88 55 72 83 54 96 C34 104 -34 104 -54 96 C-72 83 -88 55 -98 28 C-102 20 -102 12 -98 4 C-89 -18 -72 -50 -57 -66 C-48 -68 -38 -70 -28 -72 Z'
const numbers = (path: string) => path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
const roundPoints = numbers(HEAD_PATH)
const hexPoints = numbers(HEX_PATH)
const localTime = computed(() => props.elapsed ?? 0)
const localDuration = computed(() => props.stateDuration ?? 2)
const enterAndLeave = (enter: number, leave: number) =>
  easings.easeInOutCubic(clamp(localTime.value / enter)) *
  easings.easeInOutCubic(clamp((localDuration.value - localTime.value) / leave))
const thinkingDots = computed(() => [0, 1, 2].map((index) => {
  const phase = (((localTime.value - index * 0.5) / 1.5) % 1 + 1) % 1
  const pulse = phase < 0.5 ? 1 - Math.cos(phase * TAU) : 0
  return {
    x: 46 + index * 19,
    y: -100 - pulse * 3,
    r: 5.5 + pulse * 1.8,
    opacity: (.5 + pulse * .5) * clamp(localTime.value / 0.22)
  }
}))
const sleepZs = computed(() => [0, 1].map((index) => {
  const phase = ((localTime.value / 1.45 + index * 0.52) % 1 + 1) % 1
  return {
    x: 62 + phase * 17,
    y: -69 - phase * 38,
    scale: 0.72 + phase * 0.28,
    opacity: Math.sin(phase * Math.PI) * 0.72
  }
}))
const playMouth = computed(() => Math.max(0, Math.sin(localTime.value * TAU * 2.2)) * enterAndLeave(0.18, 0.3))
const playWaves = computed(() => [0, 1].map((index) => {
  const phase = (((localTime.value - index * 0.18) / 0.8) % 1 + 1) % 1
  return {
    path: index ? 'M123 -49 Q145 -11 123 30' : 'M112 -39 Q132 -9 112 19',
    opacity: 0.78 * enterAndLeave(0.25, 0.28) * (0.45 + 0.55 * Math.sin(phase * Math.PI) ** 2)
  }
}))
const alertMark = computed(() => {
  const t = localTime.value
  const travel = easings.easeInOutCubic(clamp(t / 1.5))
  const back = easings.easeInOutCubic(clamp((t - 1.6) / 0.4))
  const x = 75 + 20 * travel - 14 * back
  const buzz = Math.sin(t * 2.5 * TAU) * 1.2
  return `translate(${x.toFixed(2)} ${(-66 + buzz).toFixed(2)}) rotate(18) scale(${(0.72 + 0.28 * easings.easeOutCubic(clamp(t / 0.3))).toFixed(3)})`
})
const exclaimMark = computed(() => {
  const t = localTime.value
  const scale = easings.easeOutCubic(clamp(t / 0.42)) + Math.sin(Math.PI * clamp(t / 0.42)) * 0.12
  return `translate(62 -83) scale(${scale.toFixed(3)})`
})
const hexAmount = computed(() => {
  if (props.state !== 'hexagon') return 0
  const enter = easings.easeInOutCubic(clamp(localTime.value / 0.55))
  const leave = easings.easeInOutCubic(clamp(((props.stateDuration ?? 1.6) - localTime.value) / 0.4))
  return Math.min(enter, leave)
})
const outline = computed(() => {
  if (!hexAmount.value) return HEAD_PATH
  let index = 0
  return HEAD_PATH.replace(/-?\d+(?:\.\d+)?/g, () => {
    const from = roundPoints[index]!
    const to = hexPoints[index++]!
    return (from + (to - from) * hexAmount.value).toFixed(2)
  })
})
const cometScale = computed(() => {
  const t = localTime.value
  const collapse = 1 - (1 - COMET_DOT) * easings.easeOutQuint(clamp(t / 0.55))
  const regrow = easings.easeOutQuint(clamp((t - 1.85) / 0.6))
  return collapse + (1 - collapse) * regrow
})
const burstScale = computed(() => {
  const t = localTime.value
  const small = 0.166 * (100 / 149)
  const collapse = 1 - (1 - small) * easings.easeOutQuint(clamp(t / 0.7))
  return collapse + (1 - collapse) * easings.easeOutQuint(clamp((t - 1.7) / 0.7))
})
const headScale = computed(() => {
  if (props.state === 'comet') {
    const dotScale = COMET_DOT * (100 / 149)
    return dotScale + (cometScale.value - COMET_DOT) * (1 - dotScale) / (1 - COMET_DOT)
  }
  if (props.state === 'burst') return burstScale.value
  if (props.state === 'orbit') return 1 - 0.29 * enterAndLeave(0.35, 0.45)
  if (props.state === 'play') return 1 - 0.18 * enterAndLeave(0.25, 0.3)
  if (props.state === 'swirl') return 1 - 0.1 * enterAndLeave(0.2, 0.25)
  return 1
})
const cometDrift = computed(() => props.state === 'comet'
  ? Math.sin(clamp(localTime.value / 1.7) * Math.PI) * 3.5
  : 0)
const cometDotOpacity = computed(() => props.state === 'comet'
  ? clamp((localTime.value - 0.25) / 0.3) * clamp((2.3 - localTime.value) / 0.35)
  : 0)
const burstDotOpacity = computed(() => props.state === 'burst'
  ? clamp((localTime.value - 0.16) / 0.28) * clamp((1.98 - localTime.value) / 0.28)
  : 0)
const headOpacity = computed(() => {
  if (props.state === 'burst') return localTime.value < 1.7 ? 1 - burstDotOpacity.value : 1
  return 1 - cometDotOpacity.value
})
const burstRayOpacity = computed(() => props.state === 'burst'
  ? 0.72 * clamp((localTime.value - 0.1) / 0.14) * clamp((0.78 - localTime.value) / 0.32)
  : 0)
const burstRayMove = computed(() => 18 * easings.easeOutCubic(clamp(localTime.value / 0.7)))
const burstFeathers = computed(() => props.state === 'burst'
  ? particles(localTime.value, 100).map((part) => ({
    ...part,
    angle: Math.atan2(part.y, part.x) * 180 / Math.PI + 90,
  }))
  : [])
const faceOpacity = computed(() => {
  if (props.state === 'comet') {
    return Math.max(1 - easings.easeOutQuint(clamp(localTime.value / 0.4)), clamp((localTime.value - 2) / 0.35))
  }
  if (props.state === 'burst') {
    return Math.max(1 - easings.easeOutQuint(clamp(localTime.value / 0.32)), easings.easeOutCubic(clamp((localTime.value - 1.88) / 0.28)))
  }
  return 1
})
const arcs = computed(() => {
  const t = localTime.value
  if (props.state === 'orbit') {
    const fade = clamp(t / 0.8) * clamp((localDuration.value - t) / 0.5)
    return RINGS.map((seed, i) => arcRender(seed, t, 100, `ring-${i}`,
      fade * clamp((t - i * 0.13) / 0.3)))
  }
  if (props.state === 'comet') {
    const fade = clamp((t - 0.15) / 0.25) * clamp((Math.min(1.95, (props.stateDuration ?? 2.4) - 0.45) - t) / 0.3)
    return COMET_RIBBONS.map((seed, i) => arcRender(seed, t, 100, `comet-${i}`, fade))
  }
  if (props.state === 'swirl') {
    return RINGS.slice(0, 3).map((seed, i) => arcRender(seed, t, 100, `swirl-${i}`,
      clamp((t - i * 0.06) / 0.14) * clamp((localDuration.value - 0.08 - t) / 0.34)))
  }
  return []
})
const headMove = computed(() => {
  const t = localTime.value
  const x = life.value.driftX * 100 * headScale.value
  const sleepBob = props.state === 'sleep' ? Math.sin(t * TAU / 0.6) * 3.4 : 0
  const y = life.value.driftY * 100 * headScale.value + cometDrift.value / 1.35 + sleepBob
  const ramp = easings.easeInOutCubic(clamp(t / 0.35))
  const tilt = props.state === 'orbit'
    ? Math.sin(-TAU * 1.25 * t * ramp) * 9 * easings.easeInOutCubic(clamp((localDuration.value - t) / 0.45))
    : 0
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${headScale.value.toFixed(4)} ${(headScale.value * life.value.breath).toFixed(4)})`
})

// Le clin d'oeil ferme un oeil large en tiret, comme l'etat wink du bot.
const wink = computed(() => {
  const t = (((props.effectTime ?? props.time) % 3.2) + 3.2) % 3.2
  return Math.max(0, Math.min(1, (t - 0.25) / 0.28, (1.4 - t) / 0.3))
})

function eyeMove(side: -1 | 1) {
  const face = expression.value
  const gaze = props.lookX ?? life.value.dYaw * (props.effect === 'look' ? 0.8 : 0.15)
  const thoughtGaze = props.state === 'thinking' ? 7 * easings.easeOutCubic(clamp(localTime.value / 0.3)) : 0
  const orbitBack = easings.easeInOutCubic(clamp((localTime.value - 1.6) / 0.9))
  const orbitGaze = props.state === 'orbit' ? Math.sin(localTime.value * 6.5) * 14 * (1 - orbitBack) : 0
  const x = side * 38 * (face ? face.split / EYE_SPLIT : 1) * (1 - hexAmount.value * 0.12) + gaze
    + (face && face.id !== 'neutre' ? face.gaze.yaw * 0.28 : 0) + orbitGaze + thoughtGaze
  const y = 14 + (props.lookY ?? life.value.dPitch * 0.12)
    - (face && face.id !== 'neutre' ? face.gaze.pitch * 0.22 : 0)
    + (props.state === 'orbit' ? Math.cos(localTime.value * 6.5) * 4 * (1 - orbitBack) : 0)
    - (props.state === 'thinking' ? 4 : 0)
  const lid = props.state === 'play' ? 1 : blinkScale(life.value.lid)
  let width = 1
  let height = lid
  let tilt = 0
  if (face) {
    const eye = face.eyes[side === -1 ? 0 : 1]
    width = Math.min(1.4, Math.max(0.75, (eye.w / EYE_W) ** 0.7))
    height *= Math.min(1.05, Math.max(0.28, (eye.h / EYE_H) ** 0.9 * eye.open))
    if (face.id === 'surpris') {
      width = 1.2
      height = lid * 0.75
    }
    if (face.id === 'excite') {
      width = 1.25
      height = lid * 0.85
    }
    if (face.id === 'effraye') {
      width = 1.3
      height = lid * 0.9
    }
    tilt = (eye.tilt ?? 0) + (face.id === 'neutre' ? 0 : face.gaze.roll * 0.35)
  } else if (props.effect === 'angry') {
    width = 1.25
    height *= 0.47
    tilt = side === -1 ? 25 : -25
  } else if (props.effect === 'happy') {
    width = 1.3
    height *= 0.25
    tilt = side === -1 ? 14 : -14
  } else if (props.effect === 'glasses') {
    width = 0.82
    height *= 0.72
  } else if (props.effect === 'wink' && side === 1) {
    width += wink.value * 0.85
    height *= 1 - wink.value * 0.82
  } else if (props.state === 'wide') {
    const open = easings.easeOutCubic(clamp(localTime.value / 0.42))
    width = 1 + open * 0.28
    height *= 1 + open * 0.62
  }
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilt}) scale(${width.toFixed(3)} ${height.toFixed(3)})`
}

const pulse = computed(() => `translate(0 8) scale(${(1 + Math.sin(props.time * 4) * 0.055).toFixed(3)}) translate(0 -8)`)
const beakMove = computed(() => `translate(0 60) scale(1 ${(1 + Math.sin(props.time * 5) * 0.08).toFixed(3)}) translate(0 -60)`)
const playBeakMove = computed(() => `translate(0 56) scale(1 ${(1 + playMouth.value * 0.1).toFixed(3)}) translate(0 -56)`)
const capMove = computed(() => `rotate(${(Math.sin(props.time * 2.1) * 0.8).toFixed(2)} 0 -78)`)
const shadesMove = computed(() => `translate(0 ${(Math.sin(props.time * 1.8) * 0.7).toFixed(2)}) rotate(${(Math.sin(props.time * 1.8) * 0.6).toFixed(2)} 0 7)`)
const surpriseMove = computed(() => `translate(0 ${(-Math.abs(Math.sin(props.time * 5)) * 2).toFixed(2)})`)
const notifyScale = computed(() => {
  const t = localTime.value
  const enter = easings.easeOutQuint(clamp(t / 0.18))
  const pop = Math.sin(Math.PI * clamp((t - 0.12) / 0.34)) * 0.14
  return 0.65 + 0.35 * enter + pop
})
const notifyMove = computed(() => `translate(65 -70) scale(${notifyScale.value.toFixed(3)})`)
</script>

<template>
  <!-- La silhouette, les yeux et le bec suivent le canard de reference. -->
  <defs>
    <linearGradient :id="`${id}-head`" x1="0" y1="-105" x2="10" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffcc2d" />
      <stop offset="1" stop-color="#fbc317" />
    </linearGradient>
    <linearGradient :id="`${id}-beak`" x1="0" y1="34" x2="0" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff6c1b" />
      <stop offset="1" stop-color="#fb5e19" />
    </linearGradient>
    <linearGradient :id="`${id}-shades`" x1="0" y1="-16" x2="0" y2="39" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#232323" />
      <stop offset="1" stop-color="#151515" />
    </linearGradient>
    <linearGradient
      v-for="arc in arcs"
      :id="`${id}-${arc.id}`"
      :key="arc.id"
      :x1="arc.grad.x1"
      :y1="arc.grad.y1"
      :x2="arc.grad.x2"
      :y2="arc.grad.y2"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" :stop-color="arc.grad.stops[0]" />
      <stop offset="0.5" :stop-color="arc.grad.stops[1]" />
      <stop offset="1" :stop-color="arc.grad.stops[2]" />
    </linearGradient>
  </defs>

  <g v-if="arcs.length" data-duck-layer="back" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path
      v-for="arc in arcs"
      :key="arc.id"
      :data-duck-arc="arc.id"
      :d="arc.back"
      :stroke="`url(#${id}-${arc.id})`"
      :stroke-width="arc.width"
      :opacity="arc.opacity"
    />
  </g>

  <g v-if="state === 'burst'" data-duck-burst fill="none">
    <g data-duck-burst-rays :opacity="burstRayOpacity" stroke-linecap="round" stroke-width="6">
      <path
        v-for="index in 7"
        :key="index"
        d="M0 -47 Q-3 -61 0 -78"
        :transform="`rotate(${index * 360 / 7}) translate(0 -${burstRayMove.toFixed(2)})`"
        :stroke="index % 2 ? '#ffae42' : '#ffcf60'"
      />
    </g>
    <path
      v-for="(feather, index) in burstFeathers"
      :key="index"
      data-duck-burst-feather
      d="M0 -1 C0.65 -0.6 0.78 0.25 0 1 C-0.78 0.25 -0.65 -0.6 0 -1 Z"
      :transform="`translate(${(feather.x * 1.35).toFixed(2)} ${(feather.y * 1.35).toFixed(2)}) rotate(${feather.angle.toFixed(2)}) scale(${(feather.r * 1.7).toFixed(2)} ${(feather.r * 2.3).toFixed(2)})`"
      fill="#ffc44f"
      :opacity="feather.opacity * (0.75 + feather.depth! * 0.25)"
    />
  </g>

  <circle
    v-if="state === 'burst'"
    data-duck-burst-dot
    cx="0"
    cy="0"
    r="16.6"
    :opacity="burstDotOpacity"
    fill="#ffcf37"
  />
  <ellipse
    v-if="state === 'burst'"
    data-duck-burst-beak
    cx="0"
    cy="5"
    rx="5.5"
    ry="3"
    :opacity="burstDotOpacity"
    fill="#ff8530"
  />

  <circle
    v-if="state === 'comet'"
    data-duck-comet-dot
    cx="0"
    :cy="cometDrift"
    :r="COMET_DOT * 100"
    :opacity="cometDotOpacity"
    fill="#ffca24"
  />

  <g transform="scale(1.35)">
    <g data-duck-animate="head" :transform="headMove" :opacity="headOpacity">
      <path
        :d="outline"
        :fill="`url(#${id}-head)`"
      />

      <g v-if="effect === 'surprise' && state !== 'exclaim'" data-duck-animate="surprise-lines" :transform="surpriseMove" fill="none" stroke="#ff7020" stroke-width="7" stroke-linecap="round">
        <path d="M37 -113 L31 -100" />
        <path d="M54 -106 L44 -98" />
      </g>

      <g :opacity="faceOpacity">
        <template v-if="effect !== 'love' && effect !== 'cool'">
          <g data-duck-animate="eye-left" :transform="eyeMove(-1)">
            <ellipse v-if="roundEyes" cx="0" cy="0" rx="11" ry="21.5" fill="#1b1918" />
            <rect v-else x="-11" y="-21.5" width="22" height="43" rx="11" fill="#1b1918" />
          </g>
          <g data-duck-animate="eye-right" :transform="eyeMove(1)">
            <ellipse v-if="roundEyes" cx="0" cy="0" rx="11" ry="21.5" fill="#1b1918" />
            <rect v-else x="-11" y="-21.5" width="22" height="43" rx="11" fill="#1b1918" />
          </g>
        </template>

        <template v-if="effect === 'love'">
          <g data-duck-animate="hearts" :transform="pulse" fill="#ff5631">
            <path d="M-38 29 C-68 8 -61 -13 -43 -10 C-38 -9 -35 -5 -33 -2 C-25 -19 -4 -11 -10 8 C-14 18 -27 27 -38 29Z" />
            <path d="M38 29 C8 8 15 -13 33 -10 C38 -9 41 -5 43 -2 C51 -19 72 -11 66 8 C62 18 49 27 38 29Z" />
          </g>
        </template>

        <template v-if="openBeak">
          <g data-duck-animate="beak" :transform="beakMove">
            <ellipse cx="0" cy="63" rx="23" ry="27" fill="#ff7921" />
            <ellipse cx="0" cy="69" rx="13" ry="17" fill="#bd3b16" />
          </g>
        </template>
        <g v-else data-duck-play-beak :transform="state === 'play' ? playBeakMove : undefined">
          <path
            d="M0 34 C-19 34 -26 44 -39 49 C-51 53 -59 55 -59 65 C-59 79 -37 84 0 84 C37 84 59 79 59 65 C59 55 51 53 39 49 C26 44 19 34 0 34 Z"
            :fill="`url(#${id}-beak)`"
          />
          <ellipse v-if="state === 'play'" cx="0" cy="67" rx="17" :ry="2 + playMouth * 7" fill="#bd3b16" :opacity="playMouth * 0.7" />
        </g>
      </g>

      <g v-if="effect === 'cool'" data-duck-animate="shades" :transform="shadesMove">
        <path
          d="M-85 -16 C-95 -16 -98 -11 -98 -5 C-98 2 -92 4 -89 5 C-86 8 -86 14 -84 21 C-81 34 -69 39 -51 39 C-31 39 -22 31 -19 14 C-18 9 -17 6 -15 6 Q0 2 15 6 C17 6 18 9 19 14 C22 31 31 39 51 39 C69 39 81 34 84 21 C86 14 86 8 89 5 C92 4 98 2 98 -5 C98 -11 95 -16 85 -16 Z"
          :fill="`url(#${id}-shades)`"
        />
        <path d="M-64 -1 L-70 13 M45 -1 L39 13" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" />
      </g>

      <g v-if="effect === 'glasses'" data-duck-glasses fill="none" stroke="#393536" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-61 -2 Q-60 -11 -49 -11 H-28 Q-17 -11 -15 -2 L-17 21 Q-18 33 -30 33 H-46 Q-59 33 -60 21 Z" />
        <path d="M15 -2 Q17 -11 28 -11 H49 Q60 -11 61 -2 L60 21 Q59 33 46 33 H30 Q18 33 17 21 Z" />
        <path d="M-15 -2 Q0 -10 15 -2 M-61 -2 L-72 -5 M61 -2 L72 -5" />
      </g>

      <g v-if="effect === 'cap'" data-duck-animate="cap" :transform="capMove">
        <path d="M-76 -53 C-76 -84 -49 -108 -15 -110 C24 -111 59 -87 65 -54 L65 -49 Q-2 -66 -76 -45 Z" fill="#3386ed" />
        <path d="M-76 -49 Q-5 -69 65 -51 Q84 -48 94 -38 Q97 -32 84 -34 Q57 -37 32 -46 Q-16 -61 -76 -42 Z" fill="#246fdb" />
        <path d="M-13 -107 Q-18 -87 -15 -63 M25 -101 Q38 -83 38 -58" fill="none" stroke="#246fdb" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
        <ellipse cx="-13" cy="-108" rx="6" ry="3" fill="#246fdb" />
        <path d="M-60 -53 Q-39 -62 -20 -56" fill="none" stroke="#ffd346" stroke-width="4" stroke-linecap="round" />
      </g>

      <g v-if="state === 'notify'" data-duck-notify :transform="notifyMove" :opacity="clamp(localTime / 0.12)">
        <circle r="18" fill="#2496e8" stroke="#ffffff" stroke-width="4" />
        <path d="M0 -8 L0 2" fill="none" stroke="#ffffff" stroke-width="3.8" stroke-linecap="round" />
        <circle cy="8" r="2.2" fill="#ffffff" />
      </g>

      <g v-if="state === 'alert'" data-duck-alert :transform="alertMark" :opacity="clamp(localTime / 0.15)" fill="#ef7935">
        <path d="M-5 -16 Q-5 -20 0 -20 Q5 -20 5 -16 L3 6 Q3 9 0 9 Q-3 9 -3 6 Z" />
        <circle cy="17" r="4.5" />
      </g>

      <g v-if="state === 'exclaim'" data-duck-exclaim :transform="exclaimMark" fill="#e8752d">
        <path d="M-4 -18 Q-4 -22 0 -22 Q4 -22 4 -18 L3 4 Q3 7 0 7 Q-3 7 -3 4 Z" />
        <circle cy="16" r="4" />
      </g>

      <g v-if="state === 'thinking'" data-duck-thinking>
        <circle
          v-for="(dot, index) in thinkingDots"
          :key="index"
          data-duck-thinking-dot
          :cx="dot.x"
          :cy="dot.y"
          :r="dot.r"
          :opacity="dot.opacity"
          fill="#e9a135"
        />
      </g>

      <g v-if="state === 'sleep'" data-duck-sleep fill="none" stroke="#d49a32" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">
        <path
          v-for="(z, index) in sleepZs"
          :key="index"
          data-duck-sleep-z
          d="M-6 -5 H6 L-6 5 H6"
          :transform="`translate(${z.x.toFixed(2)} ${z.y.toFixed(2)}) scale(${z.scale.toFixed(3)})`"
          :opacity="z.opacity"
        />
      </g>

      <g v-if="state === 'play'" data-duck-play-waves fill="none" stroke-linecap="round" stroke-width="4">
        <path
          v-for="(wave, index) in playWaves"
          :key="index"
          data-duck-play-wave
          :d="wave.path"
          :stroke="index ? '#e5a842' : '#ef8734'"
          :opacity="wave.opacity"
        />
      </g>
    </g>
  </g>
  <g v-if="arcs.length" data-duck-layer="front" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path
      v-for="arc in arcs"
      :key="arc.id"
      :data-duck-arc="arc.id"
      :d="arc.front"
      :stroke="`url(#${id}-${arc.id})`"
      :stroke-width="arc.width"
      :opacity="arc.opacity * (state === 'orbit' ? 0.42 : 1)"
    />
  </g>
</template>
