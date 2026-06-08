import { defineConfig } from "vitest/config";

// Pure-logic tests for lib/. No DOM, no React — node environment is enough.
// Tests are co-located with source (lib/*.test.ts): the collision math lives
// next to the geometries that prove it correct.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
