import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // Component-mount tests use `mount`/`unmount` from 'svelte', which require
  // the client build under jsdom; without this, Vite resolves the SSR build
  // Vitest would otherwise need for server-side tests.
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    globals: true,
  },
});
