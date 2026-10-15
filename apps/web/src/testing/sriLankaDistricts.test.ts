import { describe, expect, it } from 'vitest'
import { SRI_LANKA_CENTER, SRI_LANKA_DISTRICTS } from '../pages/dmc/sriLankaDistricts'

const PROVINCES = [
  'Central',
  'Eastern',
  'North Central',
  'North Western',
  'Northern',
  'Sabaragamuwa',
  'Southern',
  'Uva',
  'Western',
]

describe('Sri Lanka district reference data', () => {
  const districts = Object.entries(SRI_LANKA_DISTRICTS)

  it('contains all 25 administrative districts', () => {
    expect(districts).toHaveLength(25)
    expect(Object.keys(SRI_LANKA_DISTRICTS)).toEqual(
      expect.arrayContaining(['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Nuwara Eliya']),
    )
  })

  it.each(districts)('%s: key matches its name and province is valid', (key, info) => {
    expect(info.name).toBe(key)
    expect(PROVINCES).toContain(info.province)
  })

  it.each(districts)('%s: coordinates fall inside Sri Lanka', (_key, info) => {
    expect(info.lat).toBeGreaterThan(5.8)
    expect(info.lat).toBeLessThan(9.9)
    expect(info.lng).toBeGreaterThan(79.5)
    expect(info.lng).toBeLessThan(82)
  })

  it.each(districts)('%s: lists at least three unique cities', (_key, info) => {
    expect(info.popularCities.length).toBeGreaterThanOrEqual(3)
    expect(new Set(info.popularCities).size).toBe(info.popularCities.length)
  })

  it('does not repeat district coordinates', () => {
    const points = districts.map(([, info]) => `${info.lat},${info.lng}`)
    expect(new Set(points).size).toBe(points.length)
  })

  it('exposes a map centre inside the island', () => {
    expect(SRI_LANKA_CENTER).toEqual([7.8731, 80.7718])
  })
})
