// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import DuckBot from '@/components/DuckBot.vue'
import type { StateId } from '@/bot/states'
import { defaultCycle, offsetOf, type Block } from '@/bot/cycles'
import { ouvreCycle, versSvgAnime } from './capture'
import { DEMI_ECRAN, viewBoxExport } from './export'

const SETTINGS = { shape: 'cercle', color: 'jaune', expression: 'neutre', duckStyle: 'normal' as const }

function head(svg: SVGSVGElement) {
  return svg.querySelector('[data-duck-animate="head"]')?.getAttribute('transform')
}

describe('duck export rendering', () => {
  it('uses the same viewBox in the player and cycle export', async () => {
    const reader = await ouvreCycle(SETTINGS, defaultCycle().blocks, 128)
    try {
      expect((await reader.rendre(0)).getAttribute('viewBox')).toBe(viewBoxExport(DEMI_ECRAN))
    } finally {
      reader.ferme()
    }
  })

  it('renders each timeline state as a duck effect at the block boundary', async () => {
    const blocks: Block[] = [
      { state: 'idle', duration: 1 },
      { state: 'wink', duration: 1 },
      { state: 'notify', duration: 1 },
      { state: 'play', duration: 1 }
    ]
    const reader = await ouvreCycle(SETTINGS, blocks, 128)
    try {
      for (const [index, effect] of ['normal', 'wink', 'normal', 'normal'].entries()) {
        const svg = await reader.rendre(offsetOf(blocks, index))
        expect(svg.getAttribute('data-duck-effect')).toBe(effect)
        expect(svg.querySelector('path[d^="M-28 -70"]')).not.toBeNull()
      }
      expect((await reader.rendre(offsetOf(blocks, 3))).getAttribute('data-duck-expression')).toBe('excite')
    } finally {
      reader.ferme()
    }
  })

  it('replays the same frame after a complete cycle and animates between frames', async () => {
    const blocks = defaultCycle().blocks
    const reader = await ouvreCycle(SETTINGS, blocks, 128)
    try {
      const first = (await reader.rendre(0)).outerHTML
      expect(head(await reader.rendre(0.5))).not.toBe(head(await reader.rendre(0)))
      for (let t = 0; t < 30; t += 1.5) await reader.rendre(t)
      expect((await reader.rendre(0)).outerHTML).toBe(first)
    } finally {
      reader.ferme()
    }
  })

  it('includes a complete blink in the three-second avatar loop', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'idle', duration: 4 }], 128)
    try {
      const open = (await reader.rendre(1)).querySelector('[data-duck-animate="eye-left"]')?.getAttribute('transform')
      const closed = (await reader.rendre(1.481)).querySelector('[data-duck-animate="eye-left"]')?.getAttribute('transform')
      expect(open).toContain('scale(1.000 1.000)')
      expect(closed).toContain('scale(1.000 0.060)')
    } finally {
      reader.ferme()
    }
  })

  it('turns the right eye into a wide dash during the wink state', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'wink', duration: 1.6 }], 128)
    try {
      const open = (await reader.rendre(0)).querySelector('[data-duck-animate="eye-right"]')?.getAttribute('transform')
      const wink = (await reader.rendre(0.8)).querySelector('[data-duck-animate="eye-right"]')?.getAttribute('transform')
      expect(open).toContain('scale(1.000 1.000)')
      expect(wink).toContain('scale(1.850 0.180)')
    } finally {
      reader.ferme()
    }
  })

  it('shows a popping exclamation badge above the classic duck in the notification state', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'notify', duration: 2.2 }], 128)
    try {
      const early = await reader.rendre(0.08)
      const badge = early.querySelector('[data-duck-notify]')!
      const beginning = badge.getAttribute('transform')
      expect(early.querySelector('[data-duck-animate="hearts"]')).toBeNull()
      expect(early.querySelector('[data-duck-animate="eye-left"]')).not.toBeNull()
      expect(badge.querySelector('path[d="M0 -8 L0 2"]')).not.toBeNull()

      const peak = (await reader.rendre(0.3)).querySelector('[data-duck-notify]')!
      expect(peak.getAttribute('transform')).not.toBe(beginning)
      expect(Number(peak.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1])).toBeGreaterThan(1.12)
      const resting = (await reader.rendre(0.9)).querySelector('[data-duck-notify]')!
      expect(resting.getAttribute('transform')).toBe('translate(65 -70) scale(1.000)')
      expect(resting.getAttribute('opacity')).toBe('1')
    } finally {
      reader.ferme()
    }
  })

  it('applies bot expressions to the classic duck without changing its outline', async () => {
    const blocks: Block[] = [{ state: 'idle', duration: 2 }]
    const classic = await ouvreCycle(SETTINGS, blocks, 128)
    const surprised = await ouvreCycle({ ...SETTINGS, expression: 'surpris' }, blocks, 128)
    try {
      const plain = await classic.rendre(1)
      const expressive = await surprised.rendre(1)
      expect(expressive.querySelector('path[d^="M-28 -70"]')?.getAttribute('d'))
        .toBe(plain.querySelector('path[d^="M-28 -70"]')?.getAttribute('d'))
      expect(expressive.querySelector('[data-duck-animate="eye-left"]')?.getAttribute('transform'))
        .toContain('scale(1.200')
    } finally {
      classic.ferme()
      surprised.ferme()
    }
  })

  it('morphs the duck outline into a hexagon and back within the state', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'hexagon', duration: 1.6 }], 128)
    const outline = async (at: number) => (await reader.rendre(at))
      .querySelector('[data-duck-animate="head"] > path')?.getAttribute('d')
    try {
      const start = await outline(0)
      const entering = await outline(0.2)
      const hexagon = await outline(0.8)
      const leaving = await outline(1.5)
      expect(entering).not.toBe(start)
      expect(hexagon).toContain('C38.00 -70.00 48.00 -68.00 57.00 -66.00')
      expect(leaving).not.toBe(hexagon)
      expect(await outline(0)).toBe(start)
    } finally {
      reader.ferme()
    }
  })

  it('renders six moving orbit ribbons behind and in front of the duck', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'orbit', duration: 3.4 }], 128)
    try {
      const svg = await reader.rendre(1.1)
      const back = svg.querySelector('[data-duck-layer="back"]')!
      const front = svg.querySelector('[data-duck-layer="front"]')!
      expect(back.querySelectorAll('[data-duck-arc]')).toHaveLength(6)
      expect(front.querySelectorAll('[data-duck-arc]')).toHaveLength(6)
      expect(back.nextElementSibling?.contains(svg.querySelector('[data-duck-animate="head"]'))).toBe(true)
      expect(front.previousElementSibling?.contains(svg.querySelector('[data-duck-animate="head"]'))).toBe(true)
      const first = front.querySelector('[data-duck-arc="ring-0"]')?.getAttribute('d')
      expect((await reader.rendre(1.35)).querySelector('[data-duck-arc="ring-0"]')?.getAttribute('d')).not.toBe(first)
      expect((await reader.rendre(0.2)).querySelector('[data-duck-layer="front"] [data-duck-arc="ring-5"]')?.getAttribute('opacity')).toBe('0')
      const ending = await reader.rendre(3.39)
      expect(head(ending)).toContain('scale(1.0000')
      expect(Number(ending.querySelector('[data-duck-layer="back"] [data-duck-arc]')?.getAttribute('opacity'))).toBeLessThan(0.03)
    } finally {
      reader.ferme()
    }
  })

  it('animates the duck conversation cues while keeping the face readable', async () => {
    const reader = await ouvreCycle(SETTINGS, [
      { state: 'thinking', duration: 2.6 },
      { state: 'wide', duration: 1.8 },
      { state: 'alert', duration: 2.4 },
      { state: 'exclaim', duration: 2 },
      { state: 'sleep', duration: 2.4 },
      { state: 'play', duration: 2 },
      { state: 'swirl', duration: 1.3 }
    ], 128)
    try {
      const thinking = await reader.rendre(0.1)
      expect(thinking.querySelectorAll('[data-duck-thinking-dot]')).toHaveLength(3)
      const thinkingDot = thinking.querySelector('[data-duck-thinking-dot]')?.getAttribute('r')
      expect((await reader.rendre(0.4)).querySelector('[data-duck-thinking-dot]')?.getAttribute('r'))
        .not.toBe(thinkingDot)

      const wide = await reader.rendre(2.6 + 0.8)
      expect(wide.querySelector('[data-duck-animate="eye-left"]')?.getAttribute('transform')).toContain('scale(1.280')
      const alert = await reader.rendre(4.4 + 0.9)
      expect(alert.querySelector('[data-duck-alert]')).not.toBeNull()
      expect(alert.querySelector('[data-duck-notify]')).toBeNull()
      const exclaim = await reader.rendre(6.8 + 0.8)
      expect(exclaim.querySelector('[data-duck-exclaim]')).not.toBeNull()
      expect(exclaim.querySelector('[data-duck-animate="surprise-lines"]')).toBeNull()

      const sleep = await reader.rendre(8.8 + 0.5)
      expect(sleep.querySelectorAll('[data-duck-sleep-z]')).toHaveLength(2)
      const sleepZ = sleep.querySelector('[data-duck-sleep-z]')?.getAttribute('transform')
      expect((await reader.rendre(8.8 + 0.7)).querySelector('[data-duck-sleep-z]')?.getAttribute('transform'))
        .not.toBe(sleepZ)
      const play = await reader.rendre(11.2 + 1)
      expect(play.querySelector('[data-duck-layer]')).toBeNull()
      expect(play.querySelectorAll('[data-duck-play-wave]')).toHaveLength(2)
      expect(head(play)).toContain('scale(0.8200')
      const speaking = play.querySelector('[data-duck-play-beak] ellipse')?.getAttribute('ry')
      expect(Number(speaking)).toBeGreaterThan(2)
      expect((await reader.rendre(11.2 + 1.2)).querySelector('[data-duck-play-beak] ellipse')?.getAttribute('ry'))
        .not.toBe(speaking)
      const swirl = await reader.rendre(13.2 + 0.5)
      expect(swirl.querySelectorAll('[data-duck-layer="front"] [data-duck-arc]')).toHaveLength(3)
    } finally {
      reader.ferme()
    }
  })

  it('keeps the outgoing duck visible while the next state enters', async () => {
    const reader = await ouvreCycle(SETTINGS, [
      { state: 'idle', duration: 2.4 },
      { state: 'hexagon', duration: 1.6 },
      { state: 'play', duration: 2 }
    ], 128)
    try {
      expect((await reader.rendre(0)).querySelector('[data-duck-transition-from]')).toBeNull()
      const boundary = await reader.rendre(2.4)
      expect(boundary.querySelector('[data-duck-transition-from]')?.getAttribute('opacity')).toBe('1')
      const middle = await reader.rendre(2.6)
      const opacity = Number(middle.querySelector('[data-duck-transition-from]')?.getAttribute('opacity'))
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThan(1)
      expect((await reader.rendre(2.9)).querySelector('[data-duck-transition-from]')).toBeNull()
      const hexToPlay = await reader.rendre(4)
      expect(hexToPlay.querySelector('[data-duck-transition-from] [data-duck-animate="head"]')).not.toBeNull()
      const frame = hexToPlay.outerHTML
      await reader.rendre(5.9)
      expect((await reader.rendre(4)).outerHTML).toBe(frame)
    } finally {
      reader.ferme()
    }
  })

  it('keeps the outgoing face behind the opaque current head while changing states', async () => {
    const reader = await ouvreCycle(SETTINGS, [
      { state: 'idle', duration: 1 },
      { state: 'hexagon', duration: 1.6 }
    ], 128)
    try {
      const frame = await reader.rendre(1.1)
      const outgoing = frame.querySelector('[data-duck-transition-from]')!
      const current = [...frame.querySelectorAll('[data-duck-animate="head"]')]
        .find((head) => !outgoing.contains(head))!
      expect(outgoing.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(current.getAttribute('opacity')).toBe('1')
    } finally {
      reader.ferme()
    }
  })

  it('lets burst and comet shrink without a full-size outgoing duck behind them', async () => {
    const reader = await ouvreCycle(SETTINGS, [
      { state: 'orbit', duration: 3.4 },
      { state: 'burst', duration: 2.6 },
      { state: 'comet', duration: 2.4 }
    ], 128)
    try {
      for (const at of [3.5, 6.1]) {
        const frame = await reader.rendre(at)
        expect(frame.querySelector('[data-duck-transition-from]')).toBeNull()
        expect(frame.querySelectorAll('[data-duck-animate="head"]')).toHaveLength(1)
      }
    } finally {
      reader.ferme()
    }
  })

  it('lets a conversation control the duck state without advancing the timeline', async () => {
    let frame: FrameRequestCallback = () => {}
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const state = ref<StateId>('thinking')
    const elapsed = ref(0)
    const host = document.createElement('div')
    const app = createApp({
      render: () => h(DuckBot, {
        mode: 'conversation', playing: true, state: state.value, elapsed: elapsed.value,
        'onUpdate:state': (value: StateId) => { state.value = value },
        'onUpdate:elapsed': (value: number) => { elapsed.value = value }
      })
    })
    try {
      app.mount(host)
      expect(host.querySelector('[data-duck-thinking]')).not.toBeNull()
      frame(1000)
      frame(1016)
      await nextTick()
      expect(elapsed.value).toBeGreaterThan(0)
      state.value = 'exclaim'
      await nextTick()
      await nextTick()
      expect(elapsed.value).toBe(0)
      expect(host.querySelector('[data-duck-exclaim]')).not.toBeNull()
      expect(host.querySelector('[data-duck-transition-from] [data-duck-thinking]')).not.toBeNull()
      for (let ms = 1032; ms < 4300; ms += 16) frame(ms)
      await nextTick()
      expect(state.value).toBe('exclaim')
      expect(elapsed.value).toBeLessThan(2)
      expect(host.querySelector('[data-duck-transition-from]')).toBeNull()
    } finally {
      app.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('collapses the burst duck into a seed with moving feathers, then restores it', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'burst', duration: 2.6 }], 128)
    try {
      const start = await reader.rendre(0)
      expect(start.getAttribute('data-duck-effect')).toBe('normal')
      expect(start.querySelector('[data-duck-animate="surprise-lines"]')).toBeNull()
      const first = start.outerHTML

      const scatter = await reader.rendre(0.45)
      expect(Number(scatter.querySelector('[data-duck-burst-rays]')?.getAttribute('opacity'))).toBeGreaterThan(0)
      expect(scatter.querySelectorAll('[data-duck-burst-feather]')).toHaveLength(3)
      const feather = scatter.querySelector('[data-duck-burst-feather]')?.getAttribute('transform')
      expect((await reader.rendre(0.6)).querySelector('[data-duck-burst-feather]')?.getAttribute('transform')).not.toBe(feather)

      const seed = await reader.rendre(0.7)
      expect(seed.querySelector('[data-duck-burst-dot]')?.getAttribute('opacity')).toBe('1')
      expect(seed.querySelector('[data-duck-burst-beak]')?.getAttribute('opacity')).toBe('1')
      expect(head(seed)).toContain('scale(0.1114')
      expect(seed.querySelector('[data-duck-animate="head"]')?.getAttribute('opacity')).toBe('0')

      const restored = await reader.rendre(2.3)
      expect(restored.querySelector('[data-duck-burst-dot]')?.getAttribute('opacity')).toBe('0')
      expect(restored.querySelector('[data-duck-animate="head"]')?.getAttribute('opacity')).toBe('1')
      expect(await reader.rendre(0).then((svg) => svg.outerHTML)).toBe(first)
    } finally {
      reader.ferme()
    }
  })

  it('holds the comet dot at the center while four trails orbit and the duck regrows', async () => {
    const reader = await ouvreCycle(SETTINGS, [{ state: 'comet', duration: 2.4 }], 128)
    try {
      const early = await reader.rendre(0)
      expect(early.querySelector('[data-duck-animate="head"]')?.getAttribute('transform')).toContain('scale(1.0000')
      const middle = await reader.rendre(1)
      const dot = middle.querySelector('[data-duck-comet-dot]')!
      expect(dot.getAttribute('cx')).toBe('0')
      expect(Number(dot.getAttribute('cy'))).toBeLessThan(3.6)
      expect(dot.getAttribute('opacity')).toBe('1')
      expect(middle.querySelector('[data-duck-animate="head"]')?.getAttribute('opacity')).toBe('0')
      expect(middle.querySelectorAll('[data-duck-layer="front"] [data-duck-arc]')).toHaveLength(4)
      const ribbon = middle.querySelector('[data-duck-arc="comet-0"]')?.getAttribute('d')
      const frame = middle.outerHTML
      expect((await reader.rendre(1.25)).querySelector('[data-duck-arc="comet-0"]')?.getAttribute('d')).not.toBe(ribbon)
      const late = await reader.rendre(2.3)
      expect(late.querySelector('[data-duck-comet-dot]')?.getAttribute('opacity')).toBe('0')
      expect(late.querySelector('[data-duck-animate="head"]')?.getAttribute('opacity')).toBe('1')
      expect((await reader.rendre(1)).outerHTML).toBe(frame)
    } finally {
      reader.ferme()
    }
  })

  it('exports a self-contained SVG whose head animation has keyframes', async () => {
    const blob = await versSvgAnime(SETTINGS, 128, 3, 0.5)
    const svg = await blob.text()
    expect(svg).toContain('class="duck-head"')
    expect(svg).toContain('@keyframes duck-head')
    expect(svg).toContain('class="duck-eye-left"')
    expect(svg).toContain('@keyframes duck-eye-left')
    expect(svg).toContain(`viewBox="${viewBoxExport(DEMI_ECRAN)}"`)
  })

  it('exports the wink as changing eye geometry in animated SVG', async () => {
    const blob = await versSvgAnime({ ...SETTINGS, duckStyle: 'wink' }, 128, 7, 0.5)
    const svg = await blob.text()
    expect(svg).toContain('@keyframes duck-eye-right')
    expect(svg).toContain('scale(1.850 0.180)')
  })
})
