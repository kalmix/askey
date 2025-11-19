# asꄗ (askey)

<div align="center">
  <img src="https://ucarecdn.com/c22ce7a4-27b7-45b4-92a0-78734de9abca/lockunlockkey_f54f4d43ezgifcomcropascii.gif" width="250"/>
</div>

<h6 align="center">
    <a href="https://your-demo-link">Visit Site</a>
    ·
    <a href="https://github.com/kalmix/discussions">Docs</a>
    ·
    <a href="https://github.com/kalmix">Contributing</a>
    ·
    <a href="https://github.com/kalmix/askey-player">askey-player.js</a>
    ·
    <a href="https://github.com/kalmix/askey-cli">askey-cli</a>
</h6>

<div align="center">
  <img src="https://img.shields.io/badge/license-MIT-black" alt="License"/>
  <img src="https://img.shields.io/badge/Node.js-18+-green" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Svelte-%23f1413d.svg?logo=svelte&logoColor=white" alt="Sveltle"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=fff" alt="Jest" />
  </a>
</div>

askey is a SvelteKit-powered app that turns any static or animated image into high-fidelity ASCII art. Upload GIFs, APNGs, PNGs, or JPEGs, tweak pro-level tone controls, and export the result to TXT, SVG, PNG, WebP, GIF, APNG, or JSON for the `askey-player.js` runtime.

You can export animations in a `json.gz` format and play it everywhere in the web with the companion `askey-player.js` or run it in the terminal using the [cli tool](#askey-cli).

## ƒ Features

- Offline-ready PWA.
- Animated input support with adjustable frame limits, skip rates, and playback speed.
- Control over gradients, brightness/contrast and more...
- Background color picker.
- One-click exports to TXT, SVG, PNG, WebP, GIF, APNG, or JSON for animations.

## Screenshots

|                     Init                     |                     ASCII Conversion                     |
| :--------------------------------------------------: | :------------------------------------------------------: |
| ![VERT upload page](https://ucarecdn.com/0c223453-627f-45f7-9209-04bb83032c7c/) | ![VERT convert page](https://ucarecdn.com/c4a00a1b-40bd-49ee-a402-8405c2d45410/Screenshot20251118093222.png) |

## 🖪 Running the project locally

```bash
# 1. Install dependencies
npm i

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Run the full type + lint suite (optional)
npm run check && npm run lint
```

The dev server hot-reloads when you edit files inside `src/`. Use `npm run check -- --watch` for incremental accessibility + type checks while iterating on components.


## 🛪 Deployment 

1. `npm run check` – type and accessibility safety net.
2. `npm run lint` – ESLint + Prettier formatting.
3. `npm run build` – emits optimized client, server, and service worker bundles.
4. `npm run test` - Run test suites.
5. Deploy the adapter output (`.vercel/output`, `.netlify`, or `build`) to your host of choice.

## Roadmap
- [x] "Universal" export file for ASCII animations.
- [x] Offline support with service workers.
- [ ] C# terminal player for `json.gz` files. (see: [askey-cli](#askey-cli))
- [ ] Implement dithering algorithms options.
- [ ] Fix render bug in certain animations with certain backgrounds/complex color combinations.
- [ ] Increased test coverage.
- [ ] Animated WebP support.
- [ ] Video support maybe?
- [ ] Build a site to share and download asꄗ animations.

## asꄗ cli (comming soon)
A .NET CLI tool will be available to run ASCII animations directly in the terminal using exported `json.gz` files. 


## ⛃ Tech stack

- [SvelteKit 2](https://kit.svelte.dev/) with Vite 7
- TypeScript 5 + ESLint 9 + Prettier 3
- Custom service worker for offline caching

## ☻ Contributing

1. Fork and clone the repo.
2. Create a feature branch off `main`.
3. Add or update tests for your change when possible.
4. Run `npm run lint && npm run check && npm run test`.
5. Open a PR with screenshots or GIFs for UI tweaks.

Have ideas for effects, exporters, or any other feats? Open an issue and describe the use case!

## ☛ License

This project is licensed under the MIT License - check [LICENSE](LICENSE) for details.