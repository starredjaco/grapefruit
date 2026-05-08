# Grapefruit Website

This workspace contains the public Grapefruit documentation site. It is a Next.js app using content from `website/content`.

## Development

```sh
bun install
bun run dev
```

Open the local URL printed by Next.js.

## Scripts

- `bun run dev` — start the docs site in development mode
- `bun run build` — build the static site
- `bun run start` — serve the built site
- `bun run lint` — run Oxlint

## Content

English docs live in `website/content/en/docs`. Chinese docs live in `website/content/zh/docs`.

Shared UI components live under `website/app/components`.
