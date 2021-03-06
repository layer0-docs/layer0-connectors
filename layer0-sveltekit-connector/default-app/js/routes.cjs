// This file was automatically added by xdn deploy.
// You should commit this file to source control.
const { Router } = require('@layer0/core/router')
const { svelteKitRoutes } = require('@layer0/sveltekit')

const cacheHandler = ({ removeUpstreamResponseHeader, cache }) => {
  removeUpstreamResponseHeader('cache-control')
  cache({
    edge: {
      maxAgeSeconds: 60 * 60 * 24,
      staleWhileRevalidateSeconds: 60 * 60 * 24,
    },
    browser: {
      maxAgeSeconds: 0,
      serviceWorkerSeconds: 60 * 60 * 24,
    },
  })
}

module.exports = new Router()
  // add routes for specific assets to configure caching
  .match('/:path*/:file.json', cacheHandler)
  // automatically adds routes for all files under /pages
  .use(svelteKitRoutes)
