/**
 * PVT calculations for CO2 at reservoir conditions.
 *
 * Implements:
 *   - Peng-Robinson EOS (1976) for CO2 density
 *   - Simplified Fenghour et al. (1998) viscosity correlation
 *
 * References:
 *   Peng, D.Y. and Robinson, D.B. (1976). A new two-constant equation of state.
 *     Industrial & Engineering Chemistry Fundamentals 15(1), 59-64.
 *   Fenghour, A., Wakeham, W.A. and Vesovic, V. (1998). The viscosity of carbon dioxide.
 *     J. Physical and Chemical Reference Data 27(1), 31-44.
 */

// CO2 critical constants
const TC_CO2 = 304.13;   // K
const PC_CO2 = 7.3773;   // MPa
const OMEGA_CO2 = 0.2239; // acentric factor
const R = 8.314472e-3;   // kJ/(mol·K) -- using MPa·L/(mol·K) consistent units
const MW_CO2 = 44.01e-3; // kg/mol

/**
 * Solve a depressed cubic t^3 + pt + q = 0 via Cardano's formula.
 * Returns all real roots sorted ascending.
 */
function solveCubic(a: number, b: number, c: number, d: number): number[] {
  // Normalise: x^3 + Bx^2 + Cx + D = 0
  const B = b / a;
  const C = c / a;
  const D = d / a;
  // Depressed form: t^3 + pt + q = 0 where x = t - B/3
  const p = C - (B * B) / 3;
  const q = (2 * B * B * B) / 27 - (B * C) / 3 + D;
  const disc = (q / 2) * (q / 2) + (p / 3) * (p / 3) * (p / 3);

  if (disc > 1e-15) {
    // One real root
    const sqrtDisc = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + sqrtDisc);
    const v = Math.cbrt(-q / 2 - sqrtDisc);
    return [u + v - B / 3];
  } else if (disc < -1e-15) {
    // Three distinct real roots (trigonometric method)
    const r = Math.sqrt(-(p / 3) * (p / 3) * (p / 3));
    const theta = Math.acos(-q / (2 * r));
    const m = 2 * Math.cbrt(r);
    return [
      m * Math.cos(theta / 3) - B / 3,
      m * Math.cos((theta + 2 * Math.PI) / 3) - B / 3,
      m * Math.cos((theta + 4 * Math.PI) / 3) - B / 3,
    ].sort((x, y) => x - y);
  } else {
    // Repeated roots
    const u = Math.cbrt(-q / 2);
    return [2 * u - B / 3, -u - B / 3].sort((x, y) => x - y);
  }
}

/**
 * Peng-Robinson EOS density for CO2.
 *
 * @param T_C  Temperature (degC)
 * @param P_MPa Pressure (MPa)
 * @returns density (kg/m3)
 */
export function prDensity(T_C: number, P_MPa: number): number {
  const T = T_C + 273.15;
  const Tr = T / TC_CO2;
  const kappa = 0.37464 + 1.54226 * OMEGA_CO2 - 0.26992 * OMEGA_CO2 * OMEGA_CO2;
  const alpha1 = 1 + kappa * (1 - Math.sqrt(Tr));
  const alpha = alpha1 * alpha1;
  const a = (0.45724 * R * R * TC_CO2 * TC_CO2 * alpha) / PC_CO2;
  const b = (0.07780 * R * TC_CO2) / PC_CO2;
  // PR cubic in Z: Z^3 - (1-B)*Z^2 + (A-3B^2-2B)*Z - (AB-B^2-B^3) = 0
  const RT = R * T;
  const A = (a * P_MPa) / (RT * RT);
  const B = (b * P_MPa) / (R * T);
  const roots = solveCubic(
    1,
    -(1 - B),
    A - 3 * B * B - 2 * B,
    -(A * B - B * B - B * B * B)
  );
  // For liquid-like CO2 (supercritical dense phase) take smallest positive root;
  // for gas-like take largest positive root.
  // At storage conditions (T>31C, P>7.4 MPa) CO2 is supercritical.
  // Use the largest Z root for the fluid phase at high P (correct for supercritical fluid).
  const posRoots = roots.filter((z) => z > B);
  if (posRoots.length === 0) return 700; // fallback
  // At storage P>>Pc, CO2 is a dense fluid: take largest real root
  const Z = posRoots[posRoots.length - 1];
  // Molar volume (L/mol) -> density (kg/m3)
  const Vm_L = (Z * R * T) / P_MPa; // L/mol
  const Vm_m3 = Vm_L * 1e-3;
  return MW_CO2 / Vm_m3;
}

/**
 * Simplified Fenghour et al. (1998) viscosity correlation for CO2.
 * Valid for 220-1000 K and up to 300 MPa.
 *
 * @param T_C   Temperature (degC)
 * @param rho   Density (kg/m3)
 * @returns dynamic viscosity (Pa.s)
 */
export function fenghourViscosity(T_C: number, rho: number): number {
  const T = T_C + 273.15;
  // Zero-density viscosity (dilute-gas) via Table 1 of Fenghour 1998
  const a = [0.235156, -0.491266, 5.211155e-2, 5.347906e-2, -1.537102e-2];
  const lnT = Math.log(T / 251.196);
  const lnEta0 =
    a[0] +
    a[1] * lnT +
    a[2] * lnT * lnT +
    a[3] * lnT * lnT * lnT +
    a[4] * lnT * lnT * lnT * lnT;
  const eta0 = (1.00697 * Math.sqrt(T)) / Math.exp(lnEta0); // micro-Pa.s

  // Excess contribution (density-dependent) via Table 2 of Fenghour 1998
  const d = [0.4071119e-2, 0.7198037e-4, 0.2411697e-16, 0.2971072e-22, -0.1627888e-22];
  const rhoM = rho / MW_CO2 / 1000; // mol/L
  const dEta =
    d[0] * rhoM +
    d[1] * rhoM * rhoM +
    d[2] * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM / (T * T * T) +
    d[3] * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM +
    d[4] * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM * rhoM / T;

  return (eta0 + dEta) * 1e-6; // convert micro-Pa.s -> Pa.s
}
