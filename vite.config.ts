import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({ fallback: '404.html' }),
      // Served from https://dluks.github.io/<repo>/ on GitHub Pages.
      paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` }
    })
  ],
  worker: { format: 'es' },
  test: { include: ['src/**/*.test.ts'] }
});
