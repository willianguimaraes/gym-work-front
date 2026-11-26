import type { LengthUnit, WeightUnit } from '@/types/account'

/** A API guarda sempre quilos e centímetros; a conversão acontece só na exibição/entrada. */
const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return unit === 'IN' ? round(cm / CM_PER_IN) : round(cm)
}

export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'IN' ? round(value * CM_PER_IN) : round(value)
}

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'LB' ? round(kg / KG_PER_LB) : round(kg, 2)
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'LB' ? round(value * KG_PER_LB, 2) : round(value, 2)
}

export const lengthLabel: Record<LengthUnit, string> = { CM: 'cm', IN: 'pol' }
export const weightLabel: Record<WeightUnit, string> = { KG: 'kg', LB: 'lb' }
