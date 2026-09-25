// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import App from '@/App.vue'

afterEach(() => vi.unstubAllGlobals())

it('lets the duck on the customizer follow the mouse', async () => {
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(App)
  try {
    app.mount(host)
    const svg = host.querySelector('svg[data-duck-effect]') as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 }) as DOMRect
    const glasses = host.querySelector('button:has(svg[data-duck-effect="glasses"])') as HTMLButtonElement
    glasses.click()
    await nextTick()
    expect(svg.getAttribute('data-duck-effect')).toBe('glasses')
    const eye = svg.querySelector('[data-duck-animate="eye-left"]')!
    const before = eye.getAttribute('transform')!
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, pointerType: 'mouse' }))
    await nextTick()
    const after = eye.getAttribute('transform')!
    const position = (value: string) => value.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number)
    const [startX, startY] = position(before)
    const [endX, endY] = position(after)
    expect(endX! - startX!).toBeGreaterThan(6)
    expect(endY! - startY!).toBeGreaterThan(1.5)
  } finally {
    app.unmount()
    host.remove()
  }
})
