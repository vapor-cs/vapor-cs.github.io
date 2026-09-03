# dylan copp — personal portfolio

A deliberately minimal, static Astro portfolio for an IT and information-security job search. The site is built with Astro and published at [vapor-cs.github.io](https://vapor-cs.github.io).

## Local development

This project uses Node.js 24 and pnpm 10.17.1 (pinned in `package.json`).

```sh
pnpm install
pnpm dev -- --background
```

Use `pnpm build` to create the production site in `dist/`. Use `pnpm preview` to inspect that build locally.

## GitHub Pages deployment

1. In the repository’s **Settings → Pages**, set the source to **GitHub Actions**.
2. Every push to `main` runs `.github/workflows/deploy.yml` and deploys the generated site.

The current configuration serves the site from the domain root at `vapor-cs.github.io`. When switching to a custom domain, configure the domain in GitHub Pages and update Astro’s `site` setting.
