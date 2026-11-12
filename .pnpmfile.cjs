// These tools use the TypeScript 5 JavaScript API, which the project compiler does not expose.
// Keep the list explicit so new TypeScript peers are not silently redirected.
const legacyCompilerApiConsumers = new Set([
  "@joshwooding/vite-plugin-react-docgen-typescript",
  "@storybook/react",
  "@stryker-mutator/core",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "@typescript-eslint/project-service",
  "@typescript-eslint/tsconfig-utils",
  "@typescript-eslint/type-utils",
  "@typescript-eslint/typescript-estree",
  "@typescript-eslint/utils",
  "eslint-plugin-import",
  "react-docgen-typescript",
  "ts-api-utils",
  "tsconfck",
  "typescript-eslint",
])

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (!legacyCompilerApiConsumers.has(pkg.name)) return pkg

      // A root peer would resolve to TypeScript 7. Give only these tools their own API dependency.
      if (pkg.peerDependencies?.typescript) {
        delete pkg.peerDependencies.typescript
        if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript
      }
      pkg.dependencies = { ...pkg.dependencies, typescript: "5.9.3" }
      return pkg
    },
  },
}
