/* istanbul ignore file */
import { DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { BuildOptions } from '@layer0/core/deploy'
import webpack from 'webpack'
import createWebpackConfig from './createWebpackConfig'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { unlinkSync } from 'fs'

const SW_SOURCE = resolve(process.cwd(), 'sw', 'service-worker.js')

module.exports = async function build(options: BuildOptions) {
  const builder = new DeploymentBuilder()
  builder.clearPreviousBuildOutput()

  if (!options.skipFramework) {
    const command = 'npx ember build --environment=production'
    try {
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('FastBoot', command, e)
    }
  }

  if (existsSync(SW_SOURCE)) {
    console.log('> Building service worker...')
    await buildServiceWorker()
    unlinkSync(resolve(process.cwd(), 'dist', '__delete_me__.js'))
  } else {
    console.warn('> sw/service-worker.js not found... skipping.')
  }

  builder.addJSAsset('dist')

  await builder.build()
}

function buildServiceWorker() {
  return new Promise<void>((resolve, reject) => {
    webpack(
      createWebpackConfig({
        mode: 'production',
        entry: {
          __delete_me__: join(__dirname, 'blankWebpackEntry.js'),
        },
      }),
      (err, stats) => {
        if (err) {
          return reject(err)
        }

        if (stats) {
          const { warnings, errors } = stats.toJson()
          warnings?.forEach((item: any) => console.warn(item.message || item))
          errors?.forEach((item: any) => console.error(item.message || item))

          if (errors?.length) {
            console.error(errors)
            return reject(new Error('Build failed.'))
          } else {
            return resolve()
          }
        }
      }
    )
  })
}
