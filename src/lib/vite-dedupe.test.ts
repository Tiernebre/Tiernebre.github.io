import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

/**
 * `@tailwindcss/vite` does a bare `import * as M from "vite"` and hands Astro's
 * `ResolvedConfig` to that copy's resolver. If it loads a different major of
 * Vite than Astro runs, the config shape no longer matches and `astro build`
 * dies inside Vite's native resolver (e.g. Vite 7 configs lack
 * `resolve.tsconfigPaths`, which Vite 8's rolldown binding requires).
 *
 * Keep every consumer on one Vite instance.
 */
function resolveViteVersion(fromPackage: string): string {
  const dependentEntry = require.resolve(fromPackage);
  const viteManifest =
    createRequire(dependentEntry).resolve("vite/package.json");
  return require(viteManifest).version as string;
}

describe("vite dependency resolution", () => {
  it("resolves the same vite version for astro and @tailwindcss/vite", () => {
    expect(resolveViteVersion("@tailwindcss/vite")).toBe(
      resolveViteVersion("astro"),
    );
  });

  it("resolves a single vite copy across the dependency tree", () => {
    const astroVite = createRequire(require.resolve("astro")).resolve(
      "vite/package.json",
    );
    const tailwindVite = createRequire(
      require.resolve("@tailwindcss/vite"),
    ).resolve("vite/package.json");

    expect(tailwindVite).toBe(astroVite);
  });
});
