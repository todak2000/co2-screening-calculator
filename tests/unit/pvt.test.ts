/**
 * Unit tests for PVT functions (Peng-Robinson EOS + Fenghour viscosity).
 */

import { describe, it, expect } from "vitest";
import { prDensity, fenghourViscosity } from "../../src/physics/pvt.js";

describe("prDensity (Peng-Robinson EOS)", () => {
  it("returns supercritical density > 600 kg/m3 at Sleipner conditions (T=37C, P=10 MPa)", () => {
    const rho = prDensity(37, 10);
    expect(rho).toBeGreaterThan(600);
    expect(rho).toBeLessThan(900);
  });

  it("returns reasonable density at deep storage conditions (T=60C, P=20 MPa)", () => {
    const rho = prDensity(60, 20);
    // PR EOS gives ~690-710 kg/m3 at these conditions
    expect(rho).toBeGreaterThan(600);
    expect(rho).toBeLessThan(900);
  });

  it("returns lower density at higher temperature (same pressure)", () => {
    const rho_low_T = prDensity(40, 15);
    const rho_high_T = prDensity(80, 15);
    expect(rho_low_T).toBeGreaterThan(rho_high_T);
  });

  it("returns higher density at higher pressure (same temperature)", () => {
    const rho_low_P = prDensity(60, 10);
    const rho_high_P = prDensity(60, 25);
    expect(rho_high_P).toBeGreaterThan(rho_low_P);
  });

  it("returns positive value for subcritical gas conditions (T=20C, P=5 MPa)", () => {
    const rho = prDensity(20, 5);
    expect(rho).toBeGreaterThan(0);
  });
});

describe("fenghourViscosity", () => {
  it("returns viscosity in physically reasonable range at storage conditions", () => {
    const rho = prDensity(54, 22);
    const mu = fenghourViscosity(54, rho);
    // Simplified Fenghour: returns positive value in micro-Pa.s range
    expect(mu).toBeGreaterThan(1e-5);
    expect(mu).toBeLessThan(5e-4);
  });

  it("viscosity increases with density at constant temperature (dense phase)", () => {
    const mu_low_rho = fenghourViscosity(50, 200);
    const mu_high_rho = fenghourViscosity(50, 700);
    // At high density the excess viscosity dominates over dilute-gas term
    expect(mu_high_rho).toBeGreaterThan(mu_low_rho);
  });

  it("returns positive value for all valid inputs", () => {
    for (const [T, rho] of [[30, 500], [60, 600], [100, 400], [150, 200]] as [number, number][]) {
      expect(fenghourViscosity(T, rho)).toBeGreaterThan(0);
    }
  });
});
