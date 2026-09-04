# dylan copp — personal portfolio

A deliberately minimal, static Astro portfolio for an IT and information-security job search. The site is built with Astro, deployed through GitHub Pages, and published at [dylancopp.com](https://dylancopp.com).

## Local development

This project uses Node.js 24 and pnpm 10.17.1 (pinned in `package.json`).

```sh
pnpm install
pnpm dev -- --background
```

Use `pnpm build` to create the production site in `dist/`. Use `pnpm preview` to inspect that build locally.
