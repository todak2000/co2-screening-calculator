/**
 * Latin Hypercube Sampling (LHS) Uncertainty Quantification
 *
 * Single-tier LHS (N=1000) over formation and thermophysical parameter
 * uncertainty distributions. No ML surrogates. Output: P10/P50/P90
 * distributions on all quantitative screening outputs plus pass probabilities.
 *
 * LHS reference:
 *   McKay, M.D., Beckman, R.J. and Conover, W.J. (1979). A comparison of three
 *   methods for selecting values of input variables in the analysis of output
 *   from a computer code. Technometrics 21(2), 239-245.
 *
 * Normal quantile via Abramowitz and Stegun (1964) rational approximation.
 * Seeded PRNG via Mulberry32 (32-bit fixed-period PRNG, period 2^32).
 */

import type { FormationInput, LHSResult, ParamSpec } from "../types.js";
import { runScreening } from "../main.js";

/** Mulberry32 seeded PRNG - returns uniform [0,1) */
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normal quantile function (inverse CDF) via Abramowitz-Stegun 26.2.17.
 * Max absolute error < 4.5e-4.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -6;
  if (p >= 1) return 6;
  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const c = [2.515517, 0.802853, 0.010328];
  const d = [1.432788, 0.189269, 0.001308];
  const num = c[0] + c[1] * t + c[2] * t * t;
  const den = 1 + d[0] * t + d[1] * t * t + d[2] * t * t * t;
  return sign * (t - num / den);
}

/** Lognormal quantile: exp(mu + sigma * normalQuantile(p)) */
function lognormalQuantile(p: number, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * normalQuantile(p));
}

/**
 * Generate a Latin Hypercube sample matrix.
 * Returns samples[n_samples][n_params] and param name array.
 */
export function lhsSample(
  nSamples: number,
  paramSpecs: Record<string, ParamSpec>,
  seed = 42
): { samples: number[][]; paramNames: string[] } {
  const prng = makePrng(seed);
  const paramNames = Object.keys(paramSpecs);
  const nParams = paramNames.length;

  // Unit-interval LHS: n_samples strata per dimension, one sample per stratum
  const unitSamples: number[][] = Array.from({ length: nSamples }, () =>
    new Array<number>(nParams).fill(0)
  );

  for (let j = 0; j < nParams; j++) {
    // Draw one uniform per stratum
    const intervals: number[] = [];
    for (let i = 0; i < nSamples; i++) {
      intervals.push((i + prng()) / nSamples);
    }
    // Fisher-Yates shuffle
    for (let i = nSamples - 1; i > 0; i--) {
      const k = Math.floor(prng() * (i + 1));
      [intervals[i], intervals[k]] = [intervals[k], intervals[i]];
    }
    for (let i = 0; i < nSamples; i++) {
      unitSamples[i][j] = intervals[i];
    }
  }

  // Transform unit samples to parameter distributions
  const samples: number[][] = unitSamples.map((row) => {
    return row.map((u, j) => {
      const spec = paramSpecs[paramNames[j]];
      if (spec.dist === "normal") {
        return (spec.mean ?? 0) + (spec.std ?? 1) * normalQuantile(u);
      } else if (spec.dist === "lognormal") {
        return lognormalQuantile(u, spec.mean ?? 0, spec.std ?? 1);
      } else {
        // uniform
        return (spec.low ?? 0) + u * ((spec.high ?? 1) - (spec.low ?? 0));
      }
    });
  });

  return { samples, paramNames };
}

/**
 * Run single-tier LHS UQ for a single formation.
 * Returns P10/P50/P90 on quantitative outputs and pass probabilities per criterion.
 */
export function runLhsUq(
  baseFormation: FormationInput,
  paramSpecs: Record<string, ParamSpec>,
  nSamples = 1000,
  seed = 42
): LHSResult {
  const { samples, paramNames } = lhsSample(nSamples, paramSpecs, seed);

  const allResults: ReturnType<typeof runScreening>[] = [];

  for (let i = 0; i < nSamples; i++) {
    const fi = { ...baseFormation };
    const fiAny = fi as unknown as Record<string, number>;
    for (let j = 0; j < paramNames.length; j++) {
      const name = paramNames[j];
      // Thermophysical error fractions handled below; skip boolean fields
      if (!name.endsWith("_error_frac")) {
        fiAny[name] = samples[i][j];
      }
    }
    // Apply multiplicative thermophysical correlation error fractions
    const errPairs: [string, keyof FormationInput][] = [
      ["IFT_error_frac", "IFT_mNm"],
      ["mu_CO2_error_frac", "mu_CO2"],
      ["delta_rho_error_frac", "delta_rho_kgm3"],
    ];
    for (const [errKey, targetKey] of errPairs) {
      const errIdx = paramNames.indexOf(errKey);
      if (errIdx >= 0 && fi[targetKey] !== undefined) {
        const err = samples[i][errIdx];
        fiAny[targetKey as string] = (fi[targetKey] as number) * (1 + err);
      }
    }
    try {
      allResults.push(runScreening(fi, "sample"));
    } catch {
      // Skip invalid parameter combinations
    }
  }

  // Numeric outputs to track
  const outputKeys: Record<string, string[]> = {
    C1: ["P_max_MPa"],
    C2: ["r35_um", "P_entry_MPa"],
    C5: ["Q_min_Mtpa"],
    C8: ["M_CO2_Mt"],
    C9: ["II_m3d_per_MPa"],
  };

  const percentiles: Record<string, number> = {};
  for (const [crit, keys] of Object.entries(outputKeys)) {
    for (const k of keys) {
      const values: number[] = allResults
        .map((r) => {
          const c = r.criteria.find((x) => x.criterion === crit);
          return c?.details[k] as number | undefined;
        })
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const p = (pct: number) =>
          values[Math.floor((pct / 100) * (values.length - 1))];
        percentiles[`${crit}_${k}_P10`] = p(10);
        percentiles[`${crit}_${k}_P50`] = p(50);
        percentiles[`${crit}_${k}_P90`] = p(90);
      }
    }
  }

  const passProbabilities: Record<string, number> = {};
  for (const crit of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"]) {
    const flags = allResults
      .map((r) => r.criteria.find((x) => x.criterion === crit)?.pass_flag)
      .filter((v): v is boolean => v !== undefined);
    if (flags.length > 0) {
      passProbabilities[`${crit}_pass_prob`] =
        flags.filter(Boolean).length / flags.length;
    }
  }

  return {
    n_valid_samples: allResults.length,
    percentiles,
    pass_probabilities: passProbabilities,
  };
}

/** Default uncertain parameter specifications for screening-level UQ. */
export const DEFAULT_PARAM_SPECS: Record<string, ParamSpec> = {
  mu_f:              { dist: "uniform", low: 0.55, high: 0.75 },
  alpha_biot:        { dist: "uniform", low: 0.60, high: 0.80 },
  beta_deg:          { dist: "normal",  mean: 30.0, std: 10.0 },
  delta_T_C:         { dist: "normal",  mean: -15.0, std: 10.0 },
  V_DP:              { dist: "uniform", low: 0.20, high: 0.60 },
  phi_res_frac:      { dist: "normal",  mean: 0.20, std: 0.04 },
  k_res_mD:          { dist: "lognormal", mean: 3.555, std: 0.5 },
  T_C:               { dist: "normal",  mean: 60.0, std: 10.0 },
  P_MPa:             { dist: "normal",  mean: 15.0, std: 2.0 },
  mu_CO2_error_frac: { dist: "normal",  mean: 0.0, std: 0.02 },
  IFT_error_frac:    { dist: "normal",  mean: 0.0, std: 0.05 },
  delta_rho_error_frac: { dist: "normal", mean: 0.0, std: 0.04 },
  theta_deg:         { dist: "uniform", low: 5.0, high: 35.0 },
};
