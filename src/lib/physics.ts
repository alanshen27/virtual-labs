/** Reference formulas used to check the built-in labs. The simulations duplicate them in sandbox code. */

export function ellipticK(k: number): number {
  const m = k * k;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 12; n += 1) {
    const factor = (2 * n - 1) / (2 * n);
    term *= factor * factor * m;
    sum += term;
  }
  return (Math.PI / 2) * sum;
}

/** Finite-amplitude period, T = 4 √(L/g) K(sin(θ₀/2)). */
export function pendulumPeriod(length: number, gravity: number, theta0Rad: number): number {
  const k = Math.sin(Math.abs(theta0Rad) / 2);
  return 4 * Math.sqrt(length / gravity) * ellipticK(k);
}

export function smallAnglePeriod(length: number, gravity: number): number {
  return 2 * Math.PI * Math.sqrt(length / gravity);
}

/** Level-ground range with no drag: R = v² sin(2θ) / g. */
export function vacuumRange(speed: number, angleRad: number, gravity: number): number {
  return (speed * speed * Math.sin(2 * angleRad)) / gravity;
}

/** P in kPa from PV = nRT, with V in liters. */
export function idealGasPressureKPa(
  moles: number,
  temperatureK: number,
  volumeLiters: number,
): number {
  const R = 8.314462618;
  return (moles * R * temperatureK) / volumeLiters;
}

export function ohmCurrent(voltage: number, resistance: number): number {
  if (resistance <= 0) return 0;
  return voltage / resistance;
}

/** Far-field fringe spacing Δy ≈ λL / d. */
export function fringeSpacing(wavelength: number, distance: number, separation: number): number {
  if (separation === 0) return 0;
  return (wavelength * distance) / separation;
}
