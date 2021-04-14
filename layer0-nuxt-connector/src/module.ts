/* istanbul ignore file */
import CreateServiceWorkerPlugin from './sw/CreateServiceWorkerPlugin'
import { join } from 'path'
import { existsSync } from 'fs'

export default function layer0NuxtModule(this: any) {
  this.extendBuild((config: any, { isClient = false }) => {
    if (isClient) {
      config.plugins.push(new CreateServiceWorkerPlugin())
    }
  })

  this.options.plugins.push({
    src: join(__dirname, 'sw', 'InstallServiceWorkerPlugin.js'),
    ssr: false,
  })

  const devtoolsWidgetInstallScript = join(
    'node_modules',
    '@layer0',
    'devtools',
    'widget',
    'install.js'
  )
  if (existsSync(devtoolsWidgetInstallScript)) {
    this.options.plugins.push({
      src: devtoolsWidgetInstallScript,
      ssr: false,
    })
  }
}
