import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: {
      mode: "nonce",
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        "style-src": ["self"],
        // Two fixed inline style attributes a nonce can't cover: SvelteKit's
        // #svelte-announcer, and UserHeader's cover-photo placeholder pattern.
        // Scoping the hashes to style-src-attr keeps style-src strict, and
        // unsafe-hashes (required for hashes to apply to attributes) permits
        // only these two exact strings.
        "style-src-attr": [
          "unsafe-hashes",
          "sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=",
          "sha256-CNJMCsKxleRaRDQmXf8UcbEo2hJnTGSN1QHZmqO8vns=",
        ],
        "img-src": ["self", "data:", "blob:"],
        "connect-src": ["self"],
        "font-src": ["self"],
        "object-src": ["none"],
        "frame-src": ["none"],
        "frame-ancestors": ["none"],
        "base-uri": ["self"],
        "form-action": ["self"],
      },
    },
  },
};

export default config;
