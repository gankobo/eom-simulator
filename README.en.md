[日本語](README.md) | 🌐 **English**

# Extraocular Muscle Action Simulator (eom-simulator)

An educational / research simulator that computes and 3D-visualizes the
gaze-dependent actions of the six extraocular muscles. The numerical **core**
is separated from the **rendering (viz/app)** layer, and the 3D was built only
after the acceptance criteria (§11) were locked in as unit tests.

---

> ## ⚠️ Important disclaimer
>
> This is an **educational / research demo** that visualizes the kinematics of
> the extraocular muscles. The anatomical parameters include provisional values
> chosen to satisfy the acceptance criteria (§11).
> **Do not use it for clinical decisions, patient care, surgical planning, or
> individual predictions. It is not a medical device.** Provided without warranty.

---

## Try it

- **Online (anyone with the link):** **https://gankobo.github.io/eom-simulator/**
  (Listing's-law page: https://gankobo.github.io/eom-simulator/listing.html )
- **Run locally:**

  ```bash
  npm install          # install dependencies (first time only)
  npm run dev          # dev preview (opens in the browser)
  ```

  Open it in a browser and change the eye position; the action of each of the
  six muscles (torsion / elevation-depression / horizontal) updates numerically
  and in 3D. `listing.html` visualizes Listing's law and the half-angle rule.

## What it does (current: Phase 1)

- **Muscle-action simulator** (`index.html`): shows each muscle's action per
  gaze position, both numerically and in 3D. Model fidelity is switchable.
  - Tier0 (kinematic): orbit-fixed rotation axes (educational baseline)
  - Tier1 (string model): recomputes `axis = normalize(P×Q)` per gaze position
    from insertion P and functional origin Q (Robinson 1975), so the
    gaze-dependence of the tertiary action becomes correct.
- **Listing / half-angle 3D explainer** (`listing.html`): visualizes how the
  angular-velocity axis tilts off Listing's plane by half the eccentricity (E/2).

## Verified acceptance criteria (§11 = source of truth)

All 44 checks pass with `npm test`. Highlights:

- §11.1 Primary-position action decomposition (6 muscles, matches the table
  within ±0.05, correct primary action)
- §11.2 Torsion zero-crossings: recti at abduction ≈ 23°, obliques at
  adduction ≈ 51°
- §11.3 SR at 23° abduction gives pure elevation (torsion ≈ 0, horizontal damped)
- §6 Listing's law (rotation vector on Listing's plane) and the half-angle rule
  (tilt = E/2)

## Develop

```bash
npm install          # install dependencies (first time only)
npm run dev          # dev preview
npm test             # §11 acceptance tests
npm run build        # build the static site into dist/ for GitHub Pages
```

## Publishing (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests → builds →
publishes to Pages automatically. In the GitHub repo, set
Settings → Pages → "Source: GitHub Actions".

## About the anatomical parameters

The P0/Q values in `src/core/data/anatomy.ts` are **provisional starters** chosen
to satisfy §11. They are meant to be replaced from Phase 3 onward with measured
values from primary sources such as Clark 2000 (IOVS 41:3787-97) Table 2 (each
value carries a `source`).

## License

MIT License (see [LICENSE](LICENSE)). © 2026 gankobo
