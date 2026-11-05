# Vitalis demo

Phone-first demo of Vitalis, an AI injury and fall-risk coach (BTE 371, University of Miami). All data is simulated; nothing is sent anywhere.

Live at **https://sourypink.github.io/vitalis/** — the printed poster's QR code points there, so `base: '/vitalis/'` in `vite.config.ts` must not change.

```bash
npm install
npm run dev      # http://localhost:5173/vitalis/
npm test         # engine + scenario unit tests
npm run build    # typecheck + production build
npm run deploy   # build, then push dist/ to the gh-pages branch
```

- `src/engine/` — pure risk engine: `baseline`, `zScore`, `acwr`, `checkInFlags`, `decide` (the poster's tree), `recommend`. Thresholds live in `constants.ts` with their sources.
- `src/data/` — seeded synthetic data: 24 athletes and Margaret, 28 baseline days + 14 recent days each; scenarios overlay the recent days.
- Sources `[n]` match `research/RESEARCH.md` and the poster.

No GitHub Actions: deploys are run by hand with `npm run deploy`.
