// Unit tests for constants.ts
import { describe, it, expect } from 'vitest'
import { API_URL, TYPE_CONFIG, STATUS_CONFIG } from '../constants'
import type { RescueTeamType, RescueTeamStatus } from '../types'

describe('constants', () => {
  describe('API_URL', () => {
    it('should be defined', () => {
      expect(API_URL).toBeDefined()
    })

    it('should be a string', () => {
      expect(typeof API_URL).toBe('string')
    })

    it('should match expected format', () => {
      expect(API_URL).toBe('http://localhost:3000/api')
    })
  })

  describe('TYPE_CONFIG', () => {
    it('should contain all rescue team types', () => {
      const expectedTypes: RescueTeamType[] = [
        'ARMY',
        'NAVY',
        'AIR_FORCE',
        'POLICE',
        'FIRE_RESCUE',
        'COAST_GUARD',
        'MEDICAL_EMT',
        'DISASTER_RELIEF',
        'OTHER'
      ]

      expectedTypes.forEach(type => {
        expect(TYPE_CONFIG[type]).toBeDefined()
        expect(TYPE_CONFIG[type]).toHaveProperty('label')
        expect(TYPE_CONFIG[type]).toHaveProperty('badge')
      })
    })

    it('should have valid label for each type', () => {
      expect(TYPE_CONFIG.ARMY.label).toBe('Sri Lanka Army')
      expect(TYPE_CONFIG.NAVY.label).toBe('Sri Lanka Navy')
      expect(TYPE_CONFIG.AIR_FORCE.label).toBe('Sri Lanka Air Force')
      expect(TYPE_CONFIG.POLICE.label).toBe('Police & STF')
      expect(TYPE_CONFIG.FIRE_RESCUE.label).toBe('Fire & Rescue')
      expect(TYPE_CONFIG.COAST_GUARD.label).toBe('Coast Guard')
      expect(TYPE_CONFIG.MEDICAL_EMT.label).toBe('Medical & EMT')
      expect(TYPE_CONFIG.DISASTER_RELIEF.label).toBe('Disaster Relief / Civil')
      expect(TYPE_CONFIG.OTHER.label).toBe('Special Unit')
    })

    it('should have badge classes for each type', () => {
      Object.values(TYPE_CONFIG).forEach(config => {
        expect(config.badge).toContain('text-')
        expect(config.badge).toContain('bg-')
        expect(config.badge).toContain('border-')
      })
    })

    it('should have unique labels', () => {
      const labels = Object.values(TYPE_CONFIG).map(c => c.label)
      const uniqueLabels = new Set(labels)
      expect(labels.length).toBe(uniqueLabels.size)
    })
  })

  describe('STATUS_CONFIG', () => {
    it('should contain all rescue team statuses', () => {
      const expectedStatuses: RescueTeamStatus[] = [
        'AVAILABLE',
        'DEPLOYED',
        'STANDBY',
        'OFF_DUTY'
      ]

      expectedStatuses.forEach(status => {
        expect(STATUS_CONFIG[status]).toBeDefined()
        expect(STATUS_CONFIG[status]).toHaveProperty('label')
        expect(STATUS_CONFIG[status]).toHaveProperty('color')
      })
    })

    it('should have valid label for each status', () => {
      expect(STATUS_CONFIG.AVAILABLE.label).toBe('Ready / Available')
      expect(STATUS_CONFIG.DEPLOYED.label).toBe('Deployed in Field')
      expect(STATUS_CONFIG.STANDBY.label).toBe('On Standby Alert')
      expect(STATUS_CONFIG.OFF_DUTY.label).toBe('Off Duty')
    })

    it('should have color classes for each status', () => {
      Object.values(STATUS_CONFIG).forEach(config => {
        expect(config.color).toContain('text-')
        expect(config.color).toContain('bg-')
        expect(config.color).toContain('border-')
      })
    })

    it('should have unique labels', () => {
      const labels = Object.values(STATUS_CONFIG).map(c => c.label)
      const uniqueLabels = new Set(labels)
      expect(labels.length).toBe(uniqueLabels.size)
    })
  })
})
