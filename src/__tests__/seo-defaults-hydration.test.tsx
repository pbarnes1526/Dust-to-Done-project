/**
 * @vitest-environment jsdom
 */
import { act, Suspense, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Helmet, HelmetProvider } from '@dr.pogodin/react-helmet'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { expect, it, vi } from 'vitest'

// A product page that has no metadata until its data arrives on the client.
function ProductPage(): ReactElement {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    setName('Resolved product title')
  }, [])
  return (
    <main>
      <h1>Product</h1>
      {name ? (
        <Helmet>
          <meta property="og:title" content={name} />
          <script type="application/ld+json">{'{"@type":"Product"}'}</script>
        </Helmet>
      ) : null}
    </main>
  )
}

vi.mock('../routes', () => ({ routes: [{ path: '/product', element: <ProductPage /> }] }))
vi.mock('../lib/site-meta', () => ({ siteMeta: { name: 'Shop', summary: '' } }))
vi.mock('../layouts/RootLayout', () => ({ default: (props: { children: ReactNode }) => props.children }))

it('replaces SSR defaults with page metadata that appears after hydration on the same path', async () => {
  const { render, SEO_DEFAULTS_CLEANUP } = await import('../entry-server')
  const ssr = await render('/product', 'https://shop.example')
  expect(ssr.head).toContain('<meta property="og:title" content="Shop" data-airo-seo-default>')

  // Load the server document the way a browser does, minus the inline cleanup
  // script, which the test runs itself.
  window.history.replaceState(null, '', '/product')
  const serverDoc = new window.DOMParser().parseFromString(
    `<!doctype html><html><head>${ssr.head}</head><body><div id="app">${ssr.html}</div></body></html>`,
    'text/html',
  )
  serverDoc.head.querySelector('script[data-airo-seo-default]:not([type])')?.remove()
  document.head.replaceChildren(...[...serverDoc.head.childNodes].map((node) => document.importNode(node, true)))
  new Function(SEO_DEFAULTS_CLEANUP)()
  const container = document.importNode(serverDoc.getElementById('app') as HTMLElement, true)
  document.body.appendChild(container)

  // Same tree entry-server.tsx renders (Suspense > RootLayout > Outlet), so hydration matches.
  const router = createMemoryRouter(
    [
      {
        element: (
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        ),
        children: [{ path: '/product', element: <ProductPage /> }],
      },
    ],
    { initialEntries: ['/product'] },
  )
  const recoverableErrors: unknown[] = []
  await act(async () => {
    hydrateRoot(
      container,
      <HelmetProvider>
        <RouterProvider router={router} />
      </HelmetProvider>,
      { onRecoverableError: (error: unknown) => recoverableErrors.push(error) },
    )
  })
  await act(async () => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 50))
  })

  expect(recoverableErrors).toEqual([])
  const ogTitles = [...document.head.querySelectorAll('meta[property="og:title"]')].map(
    (el) => el.getAttribute('content'),
  )
  expect(ogTitles).toEqual(['Resolved product title'])
  const jsonLd = [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
    (el) => el.textContent,
  )
  expect(jsonLd).toEqual(['{"@type":"Product"}'])
  // Defaults the page never sets stay until navigation.
  expect(document.head.querySelector('meta[property="og:url"][data-airo-seo-default]')).not.toBeNull()
})
