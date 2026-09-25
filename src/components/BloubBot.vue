<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DuckHead from '@/components/DuckHead.vue'
import { DEFAULT_DUCK_STYLE, type DuckStyle } from '@/bot/skins'
import { DEFAULT_EXPRESSION, type ExpressionId } from '@/bot/expressions'
import { blockAt, defaultCycle, offsetOf, totalDuration, type Block } from '@/bot/cycles'
import { DEMI_VIEWBOX } from '@/bot/repere'
import { STATE_BY_ID, type StateId } from '@/bot/states'
import { clamp, easings } from '@/bot/math'
import { t } from '@/i18n'
import type { GazeScript } from '@/ui/gaze'

const props = withDefaults(defineProps<{
  size?: number
  shape?: string
  color?: string
  expression?: string
  duckStyle?: DuckStyle
  paper?: string
  frozenAt?: number
  cycle?: Block[]
  mode?: 'timeline' | 'conversation'
  follow?: boolean
  gaze?: GazeScript | null
}>(), {
  size: 320,
  duckStyle: DEFAULT_DUCK_STYLE,
  frozenAt: undefined,
  cycle: () => defaultCycle().blocks,
  mode: 'timeline',
  follow: false,
  gaze: null
})

const block = defineModel<number>('block', { default: 0 })
const state = defineModel<StateId>('state', { default: 'idle' })
const playing = defineModel<boolean>('playing', { default: false })
const elapsed = defineModel<number>('elapsed', { default: 0 })
if (props.frozenAt !== undefined) elapsed.value = props.frozenAt

const EFFECT_BY_STATE: Record<StateId, DuckStyle> = {
  idle: 'normal',
  thinking: 'look',
  wink: 'wink',
  wide: 'surprise',
  alert: 'angry',
  notify: 'normal',
  exclaim: 'surprise',
  sleep: 'normal',
  hexagon: 'normal',
  play: 'normal',
  orbit: 'normal',
  burst: 'normal',
  comet: 'normal',
  swirl: 'normal'
}

const effectFor = (id: StateId) => id === 'idle' ? props.duckStyle : EFFECT_BY_STATE[id]
const effect = computed(() => effectFor(state.value))
const STATE_EXPRESSION: Partial<Record<StateId, ExpressionId>> = {
  sleep: 'somnolent',
  play: 'excite',
  orbit: 'curieux',
  comet: 'fier',
  swirl: 'curieux'
}
const expressionFor = (id: StateId) => id === 'idle'
  ? props.expression ?? DEFAULT_EXPRESSION
  : STATE_EXPRESSION[id] ?? DEFAULT_EXPRESSION
const faceExpression = computed(() => expressionFor(state.value))
const time = ref(props.frozenAt ?? 0)
const styleStartedAt = ref(0)
const lookX = ref<number | undefined>(undefined)
const lookY = ref<number | undefined>(undefined)
const svg = ref<SVGSVGElement | null>(null)
const uid = Math.random().toString(36).slice(2, 8)
const outgoing = ref<{ state: StateId; elapsed: number; stateDuration: number; startedAt: number } | null>(null)
const stateDuration = computed(() => props.cycle[block.value]?.state === state.value
  ? props.cycle[block.value]!.duration
  : STATE_BY_ID.get(state.value)?.duration ?? 2)
const transition = computed(() => {
  if (state.value === 'burst' || state.value === 'comet') return null
  const duration = STATE_BY_ID.get(state.value)?.morph ?? 0.4
  let previous: { state: StateId; elapsed: number; stateDuration: number } | null = null
  let age = 0
  if (props.mode === 'conversation') {
    if (!outgoing.value) return null
    previous = outgoing.value
    age = time.value - outgoing.value.startedAt
  } else {
    const current = props.cycle[block.value]
    if (!current || current.state !== state.value || !props.cycle.length) return null
    if (block.value === 0 && time.value < totalDuration(props.cycle)) return null
    const prior = props.cycle[(block.value - 1 + props.cycle.length) % props.cycle.length]!
    previous = { state: prior.state, elapsed: prior.duration, stateDuration: prior.duration }
    age = elapsed.value
  }
  if (age < 0 || age >= duration) return null
  const progress = easings.easeOutQuint(clamp(age / duration))
  const shrink = state.value === 'play' ? 0.18 : 0
  return {
    ...previous,
    opacity: 1 - progress,
    scale: 1 - shrink * progress
  }
})

function seek(index: number, offset = 0) {
  const item = props.cycle[index]
  if (!item) return
  block.value = index
  state.value = item.state
  elapsed.value = offset
  time.value = offsetOf(props.cycle, index) + offset
}

/** Un echantillonnage pur du temps permet de rejouer les exports GIF/MP4. */
function rendAt(at: number) {
  if (!props.cycle.length) return
  const position = blockAt(props.cycle, at)
  block.value = position.index
  state.value = props.cycle[position.index]!.state
  elapsed.value = position.elapsed
  time.value = at
}

defineExpose({ seek, rendAt })

watch(block, (index) => {
  if (props.mode === 'conversation') return
  const item = props.cycle[index]
  if (item) state.value = item.state
})
watch(() => props.cycle, (items) => {
  if (props.mode === 'conversation') return
  if (!items.length) return
  const index = Math.min(block.value, items.length - 1)
  seek(index, 0)
})
watch(state, (_, previous) => {
  if (props.mode !== 'conversation') return
  outgoing.value = {
    state: previous,
    elapsed: elapsed.value,
    stateDuration: STATE_BY_ID.get(previous)?.duration ?? 2,
    startedAt: time.value
  }
  elapsed.value = 0
}, { flush: 'sync' })
watch(() => props.frozenAt, (at) => {
  if (at !== undefined) {
    time.value = at
    elapsed.value = at
  }
})
watch(() => props.duckStyle, () => { styleStartedAt.value = time.value })

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  const box = svg.value?.getBoundingClientRect()
  if (!box?.width || !box.height) return
  lookX.value = Math.max(-8, Math.min(8, ((event.clientX - box.left - box.width / 2) / box.width) * 20))
  lookY.value = Math.max(-2, Math.min(2, ((event.clientY - box.top - box.height / 2) / box.height) * 8))
}
function onPointerLeave() {
  lookX.value = undefined
  lookY.value = undefined
}
watch(() => props.follow && props.frozenAt === undefined, (follow) => {
  if (follow) {
    window.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerleave', onPointerLeave)
  } else {
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerleave', onPointerLeave)
    onPointerLeave()
  }
}, { immediate: true })

let raf = 0
let last = 0
function tick(ms: number) {
  raf = requestAnimationFrame(tick)
  const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
  last = ms
  time.value += dt
  if (!playing.value) return
  if (props.mode === 'conversation') {
    elapsed.value = (elapsed.value + dt) % stateDuration.value
    return
  }
  if (!props.cycle.length) return
  elapsed.value += dt
  const current = props.cycle[block.value]
  if (current && elapsed.value >= current.duration) {
    const continuousTime = time.value
    seek((block.value + 1) % props.cycle.length, elapsed.value - current.duration)
    time.value = continuousTime
  }
}

onMounted(() => {
  if (props.frozenAt !== undefined) return
  if (props.mode === 'timeline' && props.cycle[block.value]) state.value = props.cycle[block.value]!.state
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerleave', onPointerLeave)
})
</script>

<template>
  <svg
    ref="svg"
    :width="size"
    :height="size"
    :viewBox="`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${DEMI_VIEWBOX * 2} ${DEMI_VIEWBOX * 2}`"
    :data-duck-effect="effect"
    :data-duck-expression="faceExpression"
    role="img"
    :aria-label="t('app.botAria')"
  >
    <!-- L'ancienne tete reste derriere la nouvelle pour eviter des yeux doubles. -->
    <g v-if="transition" data-duck-transition-from :opacity="transition.opacity" :transform="`scale(${transition.scale.toFixed(4)})`">
      <DuckHead
        :id="`${uid}-previous`"
        :effect="effectFor(transition.state)"
        :state="transition.state"
        :time="time"
        :elapsed="transition.elapsed"
        :state-duration="transition.stateDuration"
        :effect-time="transition.elapsed"
        :look-x="lookX"
        :look-y="lookY"
        :expression="expressionFor(transition.state)"
      />
    </g>
    <DuckHead
      :id="uid"
      :effect="effect"
      :state="state"
      :time="time"
      :elapsed="elapsed"
      :state-duration="stateDuration"
      :effect-time="state === 'wink' ? elapsed : effect === 'wink' ? time - styleStartedAt : time"
      :look-x="lookX"
      :look-y="lookY"
      :expression="faceExpression"
    />
  </svg>
</template>
