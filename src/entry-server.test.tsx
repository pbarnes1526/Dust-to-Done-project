import { beforeEach, describe, expect, it, vi } from 'vitest'
import type React from 'react'
import type { ReactNode } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'

const { sameAsConfig, siteMeta, layout } = vi.hoisted(() => ({
  sameAsConfig: { urls: ['https://www.linkedin.com/company/acme'] },
  siteMeta: { name: 'Acme', summary: '' },
  layout: { bare: false },
}))

// `layout.bare` renders pages without RootLayout's default <title>/description.
vi.mock('./layouts/RootLayout', async (importOriginal) => {
  const { default: RealRootLayout } = await importOriginal<typeof import('./layouts/RootLayout')>()
  return {
    default: (props: { children: React.ReactElement }) =>
      layout.bare ? props.children : <RealRootLayout {...props} />,
  }
})

vi.mock('./config/same-as.json', () => ({
  default: sameAsConfig,
}))

vi.mock('./lib/site-meta', () => ({
  siteMeta,
}))

vi.mock('./routes', async () => ({
  routes: [
    {
      path: '/complete',
      element: (
        <main>
          <Helmet>
            <title>Page title</title>
            <meta name="description" content="Page description" />
            <meta property="og:title" content="t" />
            <meta property="og:description" content="d" />
            <meta property="og:type" content="article" />
            <meta property="og:url" content="https://custom.example/complete" />
            <meta property="og:image" content="https://cdn.example/a.png" />
            <meta name="twitter:image" content="https://cdn.example/a.png" />
            <meta name="twitter:card" content="summary_large_image" />
            <script type="application/ld+json">{'{"@type":"Article"}'}</script>
          </Helmet>
        </main>
      ),
    },
    {
      path: '/breakout',
      element: (
        <main>
          <Helmet>
            <title>{'Shop</script><script>alert(1)</script>'}</title>
          </Helmet>
        </main>
      ),
    },
    {
      path: '/twitter-image-only',
      element: (
        <main>
          <Helmet>
            <meta name="twitter:image" content="https://cdn.example/tw.png" />
          </Helmet>
        </main>
      ),
    },
    { path: '*', element: <main /> },
    {
      path: '/moved',
      loader: async () => {
        const { redirect } = await import('react-router')
        throw redirect('/bare')
      },
      element: <main />,
    },
    {
      path: '/image-only',
      element: (
        <main>
          <Helmet>
            <meta property="og:image" content="https://cdn.example/hero.png" />
          </Helmet>
        </main>
      ),
    },
    {
      path: '/empty-description',
      element: (
        <main>
          <Helmet>
            <meta name="description" content="" />
          </Helmet>
        </main>
      ),
    },
    {
      path: '/body-json-ld',
      element: (
        <main>
          <script type="application/ld+json">{'{"@type":"Product"}'}</script>
        </main>
      ),
    },
    { path: '/', element: <main>Home</main> },
    { path: '/bare', element: <main><h1>Bare</h1></main> },
    {
      path: '/full',
      element: (
        <main>
          <Helmet>
            <title>Page title</title>
            <meta name="description" content="Page description" />
            <meta property="og:title" content="Custom OG" />
            <meta property="og:description" content="Custom OG description" />
            <meta property="og:type" content="article" />
            <meta property="og:url" content="https://custom.example/full" />
            <meta property="og:image" content="https://cdn.example/a.png" />
            <meta name="twitter:card" content="summary" />
            <script type="application/ld+json">{'{"@type":"Article"}'}</script>
          </Helmet>
        </main>
      ),
    },
    {
      path: '/quoted',
      element: (
        <main>
          <Helmet>
            <title>{'Tom & "Jerry" <b>'}</title>
          </Helmet>
        </main>
      ),
    },
  ],
}))

vi.mock('./layouts/Website', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./layouts/parts/Header', () => ({ default: () => null }))
vi.mock('./layouts/parts/Footer', () => ({ default: () => null }))

import { render, SEO_DEFAULTS_CLEANUP } from './entry-server'

describe('entry-server', () => {
  beforeEach(() => {
    sameAsConfig.urls = ['https://www.linkedin.com/company/acme']
    siteMeta.name = 'Acme'
    siteMeta.summary = ''
    layout.bare = false
  })

  it('emits homepage sameAs JSON-LD with the published origin', async () => {
    const result = await render('/', 'https://published.example')

    expect(result.status).toBe(200)
    expect(result.head).toContain('application/ld+json')
    expect(result.head).toContain('https://published.example/#organization')
    expect(result.head).toContain('https://www.linkedin.com/company/acme')
    expect(result.head).not.toContain('http://ssr')
  })

  it('escapes a closing-script breakout in sameAs JSON-LD', async () => {
    sameAsConfig.urls = ['https://example.com/</script><script>alert(1)</script>']

    const result = await render('/', 'https://published.example')

    expect(result.head).toContain('\\u003c/script>')
    expect(result.head).not.toContain('</script><script>alert(1)</script>')
  })

  it('uses the published hostname when the site name is empty', async () => {
    siteMeta.name = '   '

    const result = await render('/', 'https://published.example')

    expect(result.head).toContain('"name":"published.example"')
  })

  describe('SEO head defaults', () => {
    const count = (head: string, re: RegExp): number => head.match(new RegExp(re.source, 'gi'))?.length ?? 0

    it('fills social, URL and JSON-LD tags from the page title, description and origin', async () => {
      siteMeta.summary = 'Fresh bread daily'

      const { head } = await render('/bare?ref=x', 'https://published.example')

      expect(head).toContain('<meta property="og:title" content="App Template" data-airo-seo-default>')
      expect(head).toContain('<meta property="og:description" content="App Template" data-airo-seo-default>')
      expect(head).toContain('<meta property="og:type" content="website" data-airo-seo-default>')
      expect(head).toContain('<meta property="og:url" content="https://published.example/bare" data-airo-seo-default>')
      expect(head).toContain('<meta name="twitter:card" content="summary" data-airo-seo-default>')
      expect(head).toContain('"@type":"WebPage"')
      expect(head).toContain('"url":"https://published.example/bare"')
      expect(count(head, /<title/)).toBe(1)
      expect(count(head, /name="description"/)).toBe(1)
    })

    it('keeps every tag the page sets and adds none of the same name', async () => {
      const { head } = await render('/full', 'https://published.example')

      expect(head).toContain('content="Custom OG"')
      expect(head).toContain('content="article"')
      expect(head).toContain('content="https://custom.example/full"')
      for (const re of [/property="og:title"/, /property="og:description"/, /property="og:type"/, /property="og:url"/, /name="twitter:card"/, /application\/ld\+json/]) {
        expect(count(head, re)).toBe(1)
      }
      expect(head).toContain('<meta name="twitter:image" content="https://cdn.example/a.png" data-airo-seo-default>')
    })

    it('escapes page text copied into attributes', async () => {
      const { head } = await render('/quoted', 'https://published.example')

      expect(head).toContain('<meta property="og:title" content="Tom &amp; &quot;Jerry&quot; &lt;b&gt;" data-airo-seo-default>')
      expect(head).not.toContain('content="Tom & "Jerry"')
    })

    it('omits og:url and the JSON-LD url without an absolute origin (preview SSR)', async () => {
      const { head } = await render('/bare')

      expect(head).not.toContain('og:url')
      expect(head).toContain('"@type":"WebPage"')
      expect(head).not.toContain('"url"')
    })

    it('copies a page og:image to twitter:image and uses the large card', async () => {
      const { head } = await render('/image-only', 'https://published.example')

      expect(head).toContain('<meta name="twitter:image" content="https://cdn.example/hero.png" data-airo-seo-default>')
      expect(head).toContain('<meta name="twitter:card" content="summary_large_image" data-airo-seo-default>')
      expect(count(head, /property="og:image"/)).toBe(1)
    })

    it('keeps an empty description the page set and falls back to siteMeta for og:description', async () => {
      siteMeta.summary = 'Fresh bread daily'

      const { head } = await render('/empty-description', 'https://published.example')

      expect(count(head, /name="description"/)).toBe(1)
      expect(head).toContain('<meta property="og:description" content="Fresh bread daily" data-airo-seo-default>')
    })

    it('does not add JSON-LD when the page body already has a block', async () => {
      const { html, head } = await render('/body-json-ld', 'https://published.example')

      expect(html).toContain('application/ld+json')
      expect(head).not.toContain('application/ld+json')
    })

    it('adds no head tags to a loader redirect', async () => {
      const result = await render('/moved', 'https://published.example')

      expect(result.redirect).toBe('/bare')
      expect(result.head).toBe('')
    })

    it('does not double the slash when the origin ends with one', async () => {
      const { head } = await render('/bare', 'https://published.example/')

      expect(head).toContain('<meta property="og:url" content="https://published.example/bare" data-airo-seo-default>')
    })

    it('uses the platform social image when the page has none, with the large card', async () => {
      const social = 'https://published.example/airo-assets/images/_virtual/social-preview'

      const { head } = await render('/bare', 'https://published.example', social)

      expect(head).toContain(`<meta property="og:image" content="${social}" data-airo-seo-default>`)
      expect(head).toContain(`<meta name="twitter:image" content="${social}" data-airo-seo-default>`)
      expect(head).toContain('<meta name="twitter:card" content="summary_large_image" data-airo-seo-default>')
      expect(head).not.toContain('content="summary"')
    })

    it('prefers the page image over the platform social image', async () => {
      const social = 'https://published.example/airo-assets/images/_virtual/social-preview'

      const { head } = await render('/image-only', 'https://published.example', social)

      expect(head).toContain('<meta name="twitter:image" content="https://cdn.example/hero.png" data-airo-seo-default>')
      expect(head).not.toContain(social)
      expect(count(head, /property="og:image"/)).toBe(1)
    })

    it('escapes a closing-script breakout in the WebPage JSON-LD', async () => {
      const { head } = await render('/breakout', 'https://published.example')

      expect(head).toContain('"@type":"WebPage"')
      expect(head).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>')
      expect(head).not.toContain('</script><script>alert(1)')
    })

    it('copies a page twitter:image to og:image', async () => {
      const { head } = await render('/twitter-image-only', 'https://published.example')

      expect(count(head, /property="og:image"/)).toBe(1)
      expect(head).toContain('<meta property="og:image" content="https://cdn.example/tw.png" data-airo-seo-default>')
      expect(head).toContain('<meta name="twitter:card" content="summary_large_image" data-airo-seo-default>')
    })

    it('adds <title> and description from siteMeta when nothing sets them', async () => {
      layout.bare = true
      siteMeta.summary = 'Fresh bread daily'

      const { head } = await render('/bare', 'https://published.example')

      expect(head).toContain('<title data-airo-seo-default>Acme</title>')
      expect(head).toContain('<meta name="description" content="Fresh bread daily" data-airo-seo-default>')
      expect(head).toContain('<meta property="og:title" content="Acme" data-airo-seo-default>')
    })

    it('uses the routed path for og:url when the request path starts with //', async () => {
      const { head } = await render('//evil.example/page', 'https://published.example')

      expect(head).toContain('<meta property="og:url" content="https://published.example//evil.example/page" data-airo-seo-default>')
    })

    it('renders a request path the URL parser reads as a host without throwing', async () => {
      await expect(render('//[x', 'https://published.example')).resolves.toMatchObject({ status: expect.any(Number) })
    })

    it('marks every added tag and ships the client cleanup with them', async () => {
      const { head } = await render('/bare', 'https://published.example')
      const added = head.split('\n').filter((line) => !line.includes('data-rh='))

      expect(added.length).toBeGreaterThan(0)
      for (const line of added) expect(line).toContain('data-airo-seo-default')
      expect(head).toContain(`<script data-airo-seo-default>${SEO_DEFAULTS_CLEANUP}</script>`)
    })

    it('ships no cleanup script when the page sets every tag itself', async () => {
      const { head } = await render('/complete', 'https://published.example')

      expect(head).not.toContain('data-airo-seo-default')
    })

    it('does not add a second JSON-LD block on the homepage', async () => {
      const { head } = await render('/', 'https://published.example')

      expect(count(head, /application\/ld\+json/)).toBe(1)
    })
  })
})
