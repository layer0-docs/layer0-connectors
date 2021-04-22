import { join } from 'path'
import validateNuxtConfig from './utils/validateNuxtConfig'
import { validateDependencies } from './utils/updateDependencies'
import { BuildOptions, DeploymentBuilder } from '@layer0/core/deploy'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { browserAssetOpts, LAYER0_NUXT_CONFIG_PATH } from './router/NuxtRoutes'
import { CopyOptionsSync } from 'fs-extra'

const { loadNuxtConfig } = require('@nuxt/config')
const appDir = process.cwd()
const builder = new DeploymentBuilder(appDir)
const nuxtDir = join(appDir, '.nuxt')

export default async function build(options: BuildOptions) {
  builder.clearPreviousBuildOutput()

  const { skipFramework } = options
  const config = await loadNuxtConfig()
  const isStatic = config.target === 'static'

  const layer0BuildModule = config.buildModules.find(
    (module: String | [String, object]) =>
      Array.isArray(module) && module[0] === '@layer0/nuxt/module'
  )

  const layer0SourceMaps = layer0BuildModule && layer0BuildModule[1]?.layer0SourceMaps
  const lambdaAssetCopyOptions: CopyOptionsSync = {}
  // Filter-out source maps from lambda package if not explictely included
  if (!layer0SourceMaps) {
    lambdaAssetCopyOptions.filter = (src: string) => !src.endsWith('.map')
  }

  if (!skipFramework) {
    const command = 'npx nuxt generate'
    // clear .nuxt directory
    builder.emptyDirSync(nuxtDir)

    // ensure that nuxt.config.js exists and has mode: universal
    await validateNuxtConfig(appDir)

    // ensure the dependencies are defined
    await validateDependencies()

    // run the nuxt.js build with --standalone so that dependencies are bundled and the user
    // doesn't need to add them to package.json dependencies, thus keeping the lambda as
    // small as possible.
    try {
      await builder.exec('npx nuxt build --standalone')

      if (isStatic) {
        await builder.exec(command)
      }
    } catch (e) {
      throw new FrameworkBuildError('Nuxt.js', command, e)
    }
  }

  // layer0-nuxt.config.json
  builder.writeFileSync(
    join(builder.jsDir, LAYER0_NUXT_CONFIG_PATH),
    JSON.stringify(await createLayer0NuxtConfig(config))
  )

  builder
    // nuxt.js client assets
    .addStaticAsset(join(appDir, '.nuxt', 'dist', 'client'), undefined, browserAssetOpts)

    // assets for generated pages
    .addStaticAsset(
      join(appDir, 'dist', '_nuxt'),
      join('.nuxt', 'dist', 'client'),
      browserAssetOpts
    )

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'dist', 'server'), undefined, lambdaAssetCopyOptions)

    // Vue components
    .addJSAsset(join(appDir, '.nuxt', 'routes.json'))

    // Nuxt config
    .addJSAsset(join(appDir, 'nuxt.config.js'))

  if (isStatic) {
    // static pages
    builder.addStaticAsset(join(appDir, 'dist'))
  }

  await builder.build({ layer0SourceMaps })
}

async function createLayer0NuxtConfig({ target, generate }: any) {
  return {
    target,
    generate: generate && {
      fallback: generate.fallback,
      exclude: generate.exclude?.map((entry: string | RegExp) => {
        const regex = <RegExp>entry

        if (regex.source) {
          return { type: 'RegExp', value: regex.source }
        } else {
          return { type: 'string', value: entry }
        }
      }),
    },
  }
}
