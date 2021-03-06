import { getOutputPath } from './utils/getBuildPath'
import FrameworkBuildError from '@layer0/core/errors/FrameworkBuildError'
import { join } from 'path'
import { DeploymentBuilder } from '@layer0/core/deploy'

const appDir = process.cwd()
const distDir = join(appDir, 'dist')
const builder = new DeploymentBuilder(appDir)

export default async function build(
  { skipFramework }: { skipFramework: boolean } = {
    skipFramework: false,
  }
) {
  builder.clearPreviousBuildOutput()

  if (!skipFramework) {
    const command = 'npm run build:ssr'

    // clear dist directory
    builder.emptyDirSync(distDir)

    try {
      // run the ssr build command
      await builder.exec(command)
    } catch (e) {
      throw new FrameworkBuildError('Angular', command, e)
    }
  }

  const serverPath = getOutputPath('server')
  const assetsPath = getOutputPath('build')

  builder
    // Include the angular server which is loaded by the prod entrypoint
    .addJSAsset(join(appDir, serverPath, 'main.js'), join('__backends__', 'angular-server.js'))
    // angular.json
    .addJSAsset(join(appDir, 'angular.json'), 'angular.json')
    // browser assets
    .addStaticAsset(join(appDir, assetsPath), '/')
    // Index html required by Universal engine
    .addJSAsset(join(appDir, assetsPath, 'index.html'), join('/', assetsPath, 'index.html'))

  await builder.build()
}
