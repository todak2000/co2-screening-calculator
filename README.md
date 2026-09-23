# CO2 Geological Storage Screening Calculator

A browser-based physics calculator implementing the 14-criterion regulatory-aligned screening matrix for CO2 geological storage.

**Live demo:** https://todak2000.github.io/co2-screening-calculator/

---

## Overview

Implements the framework from:

> Olagunju, D. (2027). "A 14-Criterion Regulatory-Aligned Screening Matrix for CO2 Geological Storage: Physics-Based Probabilistic Assessment Across Four International Permitting Standards." SPE International CCUS Conference, Den Haag.

### Criteria

| ID | Criterion | Method |
|----|-----------|--------|
| C1 | Fault Reactivation Safety | Mohr-Coulomb with thermoelastic correction |
| C2 | Caprock Seal Integrity | Winland r35 pore-throat / Young-Laplace |
| C3 | Area of Review | Cooper-Jacob pressure inversion + plume volume |
| C4 | Dissolution Trapping (Ra) | Rayleigh number; NSR gate for V_DP >= 0.5 |
| C5 | Minimum Injection Rate | Mass rate threshold (0.1 Mt/year) |
| C6 | Supercritical Phase | CO2 critical point check |
| C7 | Capillary Seal Overpressure | Buoyancy vs. entry pressure margin |
| C8 | Storage Capacity | Volumetric method |
| C9 | Injectivity Index | Radial Darcy steady-state |
| C10 | Monitoring Feasibility | Seismic depth + salinity + plume area |
| C11 | USDW Exemption | Regulatory permit input |
| C12 | Legacy Well Assessment | Regulatory permit input |
| C13 | Mineral Rights | Regulatory permit input |
| C14 | EIA Complete | Regulatory permit input |

### Status codes

| Code | Meaning |
|------|---------|
| **PASS** | Criterion met |
| **FAIL** | Criterion not met |
| **NSR** | Not Suitable for Regulatory screening (C4: extreme heterogeneity, V_DP >= 0.5) |
| **N/A** | Permit input not yet assessed |

---

## Technology

- **TypeScript** + **Vite** (static build, zero backend)
- **Vitest** for unit and integration tests
- **GitHub Pages** for free hosting (base path: `/co2-screening-calculator/`)
- **Peng-Robinson EOS** (1976) for CO2 density; **Fenghour et al. (1998)** for viscosity
- **No ML surrogates.** All criteria evaluated analytically from closed-form equations.

---

## Development

### Prerequisites

- Node.js >= 20
- Yarn

### Install

```bash
yarn install
```

### Run tests (required before any deployment)

```bash
yarn test
```

### Type check

```bash
yarn typecheck
```

### Local development server

```bash
yarn dev
```

### Build

```bash
yarn build
```

---

## Deployment

Deployment to GitHub Pages is automated via `.github/workflows/deploy.yml` and only triggers **after all tests pass** on the `main` branch.

To enable GitHub Pages on a new repository:

1. Go to **Settings > Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` to trigger the deploy workflow

---

## Project structure

```
co2_screening_calculator/
  src/
    types.ts              # FormationInput, CriterionResult, ScreeningResult interfaces
    main.ts               # runScreening() entry point
    physics/
      pvt.ts              # Peng-Robinson EOS + Fenghour viscosity
      c1_fault.ts         # C1: Mohr-Coulomb fault reactivation
      c2_seal.ts          # C2: Winland r35 seal integrity
      c3_aor.ts           # C3: Cooper-Jacob AoR
      c4_dissolution.ts   # C4: Rayleigh number + NSR gate
      c5_injection.ts     # C5: Minimum injection rate
      c6_phase.ts         # C6: Supercritical phase check
      c7_capillary.ts     # C7: Capillary seal overpressure margin
      c8_capacity.ts      # C8: Volumetric storage capacity
      c9_injectivity.ts   # C9: Radial Darcy injectivity index
      c10_monitoring.ts   # C10: Seismic + wellbore monitoring feasibility
    uq/
      lhs.ts              # Latin Hypercube Sampling UQ (N=1000, seeded PRNG)
  tests/
    unit/
      pvt.test.ts         # PVT function range checks
      criteria.test.ts    # Per-criterion PASS/FAIL/NSR unit tests
    integration/
      screening.test.ts   # Full 14-criterion pipeline tests
  index.html              # Web UI (two-column layout, print-ready)
  .github/workflows/
    test.yml              # Runs on all pushes and pull requests
    deploy.yml            # Deploys to GitHub Pages only after tests pass
```

---

## References

- Peng, D.Y. and Robinson, D.B. (1976). A new two-constant equation of state. *I&EC Fundamentals* 15(1), 59-64.
- Fenghour, A., Wakeham, W.A. and Vesovic, V. (1998). The viscosity of carbon dioxide. *J. Physical and Chemical Reference Data* 27(1), 31-44.
- McKay, M.D., Beckman, R.J. and Conover, W.J. (1979). A comparison of three methods for selecting values of input variables in the analysis of output from a computer code. *Technometrics* 21(2), 239-245.
- Zoback, M.D. (2007). *Reservoir Geomechanics*. Cambridge University Press.
- Cooper, H.H. and Jacob, C.E. (1946). A generalized graphical method for evaluating formation constants. *Trans. AGU* 27(4), 526-534.
- Ennis-King, J. and Paterson, L. (2005). Role of convective mixing in the long-term storage of CO2 in deep saline formations. *SPEJ* 10(3), 349-356.
