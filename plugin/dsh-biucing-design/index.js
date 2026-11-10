/**
 * Host half of the Design Studio bundle.
 *
 * The panel itself is rendered by the Client module (`client.js`). This half
 * adds the verification loop: two tools that drive an isolated headless Chrome
 * to screenshot and audit the panel (through the authenticated Web GUI and the
 * `?panel=design-studio` deep link) or any generated design document.
 */
import { createGenerationHandler } from './lib/generate.js'
import { createProjectsResource, designProjectsTool, designScreenshotHtmlTool, designVerifyUiTool } from './lib/tools.js'

export const inject = ['tools']

export function apply(ctx) {
  ctx.effect(() => ctx.tools.register(designVerifyUiTool(ctx)))
  ctx.effect(() => ctx.tools.register(designScreenshotHtmlTool(ctx)))
  ctx.effect(() => ctx.tools.register(designProjectsTool(ctx)))

  // Read-only route that lets the panel list the shared project library and
  // load a published project without a manual file picker.
  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: '/design-studio/projects',
      resource: createProjectsResource(),
    }))
    scope.effect(() => scope.webServer.register({
      kind: 'exact',
      path: '/design-studio/generate',
      handler: createGenerationHandler(ctx),
    }))
  })
}
