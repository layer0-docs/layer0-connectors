import Router from '@layer0/core/router/Router'
import PluginBase from '@layer0/core/plugins/PluginBase'
import RouteGroup from '@layer0/core/router/RouteGroup'
import { isProductionBuild } from '@layer0/core/environment'

/**
 * A TTL for assets that never changes. 10 years in seconds.
 */
const FAR_FUTURE_TTL = 60 * 60 * 24 * 365 * 10

const FAR_FUTURE_CACHE_CONFIG = {
  browser: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
  edge: {
    maxAgeSeconds: FAR_FUTURE_TTL,
  },
}

/**
 * Adds all routes from your Razzle app to Layer0 router
 *
 * Example:
 *
 * ```js
 * import { Router } from '@layer0/core/router'
 * import { razzleRoutes } from '@layer0/razzle'
 *
 * export default new Router().use(razzleRoutes)
 * ```
 */
export default class RazzleRoutes extends PluginBase {
  private router?: Router
  private readonly routeGroupName = 'razzle_routes'

  /**
   * Called when plugin is registered. Adds a route for static assets
   * and a fallback to render responses using SSR for all other paths.
   * @param router
   */
  onRegister(router: Router) {
    this.router = router

    if (isProductionBuild()) {
      this.router.group(this.routeGroupName, group => this.addRoutesToGroup(group))
    }

    this.router.fallback(res => res.renderWithApp())
  }

  private addRoutesToGroup(group: RouteGroup) {
    group
      // .match('/service-worker.js', ({ serviceWorker }) => serviceWorker('build/service-worker.js'))
      .static('build/public', {
        ignore: ['static/**/*'],
      })
      .match('/static/:path*', ({ cache, serveStatic }) => {
        cache(FAR_FUTURE_CACHE_CONFIG)
        serveStatic('build/public/static/:path*', { permanent: true })
      })
  }
}
