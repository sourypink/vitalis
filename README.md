# Vitalis

Front-end prototype of Vitalis, a fall-risk coach for older adults (BTE 371, University of Miami). Sign up, answer a short survey, connect a watch, then see a daily fall-risk check, activity, reports and tips. All data is simulated; nothing is sent anywhere.

Live at **https://sourypink.github.io/vitalis/**. The printed poster's QR code points there, so `base: '/vitalis/'` in `vite.config.ts` must not change.

```bash
npm install
npm run dev      # http://localhost:5173/vitalis/
npm test         # engine, scenario and survey unit tests
npm run build    # typecheck + production build
npm run deploy   # build, then push dist/ to the gh-pages branch
```

- `src/engine/`: pure risk engine (`baseline`, `zScore`, `checkInFlags`, `decide` = the poster's tree, `recommend`). Thresholds in `constants.ts` with sources.
- `src/survey.ts`: survey questions, CDC STEADI scoring, activity level. `src/tips.ts`: recommendations. `src/devices.ts`: supported watches.
- `src/data/simulate.ts`: seeded synthetic watch data (28 baseline days + 14 recent days); scenarios overlay the recent days.
- Sources `[n]` match `research/RESEARCH.md`. Full spec: `docs/APP_SPEC.md`.

No GitHub Actions: deploys are run by hand with `npm run deploy`.
