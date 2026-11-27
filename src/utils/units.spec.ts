import { describe, expect, it } from 'vitest'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay } from './units'

describe('unidades', () => {
  it('mantém kg e cm como vieram (arredondando)', () => {
    expect(kgToDisplay(22.5, 'KG')).toBe(22.5)
    expect(kgToDisplay(60.004, 'KG')).toBe(60)
    expect(cmToDisplay(88.46, 'CM')).toBe(88.5)
  })

  it('converte libras e polegadas só na exibição e volta para kg/cm', () => {
    expect(kgToDisplay(45, 'LB')).toBe(99.2)
    expect(displayToKg(100, 'LB')).toBe(45.36)
    expect(cmToDisplay(88, 'IN')).toBe(34.6)
    expect(displayToCm(34.6, 'IN')).toBe(87.9)
  })

  it('ida e volta em libras fica perto do valor original', () => {
    const kg = 62.5
    expect(Math.abs(displayToKg(kgToDisplay(kg, 'LB'), 'LB') - kg)).toBeLessThan(0.05)
  })
})
