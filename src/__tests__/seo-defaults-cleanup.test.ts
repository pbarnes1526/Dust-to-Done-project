/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, expect, it } from 'vitest'

import { SEO_DEFAULTS_CLEANUP } from '../entry-server'

const originalPushState = window.history.pushState
const originalReplaceState = window.history.replaceState

function headTag(tagName: string, attrs: Record<string, string>, text = ''): HTMLElement {
  const el = document.createElement(tagName)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  el.textContent = text
  return el
}

function seedHead(): void {
  document.head.replaceChildren(
    headTag('meta', { property: 'og:url', content: 'https://acme.example/', 'data-airo-seo-default': '' }),
    headTag('script', { type: 'application/ld+json', 'data-airo-seo-default': '' }, '{"@type":"WebPage"}'),
    headTag('meta', { 'data-rh': 'true', property: 'og:title', content: 'Page title' }),
  )
}

const defaults = (): number => document.head.querySelectorAll('[data-airo-seo-default]').length

beforeEach(() => {
  originalReplaceState.call(window.history, null, '', '/')
  seedHead()
  // The script runs from the server-rendered head, before any app code.
  new Function(SEO_DEFAULTS_CLEANUP)()
})

afterEach(() => {
  window.history.pushState = originalPushState
  window.history.replaceState = originalReplaceState
})

it('keeps the defaults while the pathname is unchanged (query or same-path updates)', () => {
  window.history.replaceState(null, '', '/?ref=x')
  window.history.pushState(null, '', '/#section')

  expect(defaults()).toBe(2)
})

it('removes the defaults on the first navigation to another pathname, keeping Helmet tags', () => {
  window.history.pushState(null, '', '/contact')

  expect(defaults()).toBe(0)
  expect(document.head.querySelector('meta[data-rh][property="og:title"]')).not.toBeNull()
})

it('removes the defaults on back/forward navigation to another pathname', () => {
  originalPushState.call(window.history, null, '', '/contact')
  window.dispatchEvent(new window.PopStateEvent('popstate'))

  expect(defaults()).toBe(0)
})

it('restores the original history methods when nothing wrapped them later', () => {
  window.history.pushState(null, '', '/contact')

  expect(window.history.pushState).toBe(originalPushState)
  expect(window.history.replaceState).toBe(originalReplaceState)
})

it('keeps a history wrapper installed after it (tag managers, analytics)', () => {
  const seen: string[] = []
  const below = window.history.pushState
  window.history.pushState = function (this: typeof window.history, ...args: Parameters<typeof window.history['pushState']>) {
    seen.push(String(args[2]))
    return below.apply(this, args)
  }
  const later = window.history.pushState

  window.history.pushState(null, '', '/contact')
  window.history.pushState(null, '', '/about')

  expect(seen).toEqual(['/contact', '/about'])
  expect(window.history.pushState).toBe(later)
  expect(defaults()).toBe(0)
})
