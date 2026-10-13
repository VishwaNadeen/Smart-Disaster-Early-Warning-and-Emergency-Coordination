// Unit tests for types.ts
import { describe, it, expect } from 'vitest'
import type {
  RescueTeamType,
  RescueTeamStatus,
  RescueTeamItem,
  RescueTeamsSectionProps
} from '../types'

describe('types', () => {
  describe('RescueTeamType', () => {
    it('should accept valid team types', () => {
      const validTypes: RescueTeamType[] = [
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

      validTypes.forEach(type => {
        expect(type).toBeDefined()
      })
    })

    it('should have exactly 9 team types', () => {
      const validTypes: RescueTeamType[] = [
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

      expect(validTypes.length).toBe(9)
    })
  })

  describe('RescueTeamStatus', () => {
    it('should accept valid statuses', () => {
      const validStatuses: RescueTeamStatus[] = [
        'AVAILABLE',
        'DEPLOYED',
        'STANDBY',
        'OFF_DUTY'
      ]

      validStatuses.forEach(status => {
        expect(status).toBeDefined()
      })
    })

    it('should have exactly 4 statuses', () => {
      const validStatuses: RescueTeamStatus[] = [
        'AVAILABLE',
        'DEPLOYED',
        'STANDBY',
        'OFF_DUTY'
      ]

      expect(validStatuses.length).toBe(4)
    })
  })

  describe('RescueTeamItem', () => {
    it('should accept valid rescue team item', () => {
      const teamItem: RescueTeamItem = {
        _id: '123',
        teamId: 'TEAM-001',
        teamName: 'Alpha Team',
        teamType: 'ARMY',
        memberCount: 10,
        district: 'Colombo',
        baseStation: 'Camp XYZ',
        contactPerson: 'John Doe',
        contactPhone: '0771234567',
        status: 'AVAILABLE',
        specialization: ['Search', 'Rescue'],
        notes: 'Specialized team',
        createdByName: 'Admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }

      expect(teamItem._id).toBe('123')
      expect(teamItem.teamId).toBe('TEAM-001')
      expect(teamItem.teamName).toBe('Alpha Team')
      expect(teamItem.teamType).toBe('ARMY')
      expect(teamItem.memberCount).toBe(10)
      expect(teamItem.status).toBe('AVAILABLE')
    })

    it('should accept rescue team item with optional fields', () => {
      const teamItem: RescueTeamItem = {
        _id: '123',
        teamId: 'TEAM-001',
        teamName: 'Alpha Team',
        teamType: 'NAVY',
        memberCount: 5,
        status: 'DEPLOYED'
      }

      expect(teamItem._id).toBe('123')
      expect(teamItem.district).toBeUndefined()
      expect(teamItem.baseStation).toBeUndefined()
      expect(teamItem.contactPerson).toBeUndefined()
    })
  })

  describe('RescueTeamsSectionProps', () => {
    it('should accept valid section props', () => {
      const props: RescueTeamsSectionProps = {
        token: 'abc123',
        registeredDistrict: 'Colombo',
        assignedDistricts: ['Colombo', 'Gampaha'],
        role: 'admin',
        openAddRequest: 1
      }

      expect(props.token).toBe('abc123')
      expect(props.registeredDistrict).toBe('Colombo')
      expect(props.assignedDistricts).toEqual(['Colombo', 'Gampaha'])
      expect(props.role).toBe('admin')
      expect(props.openAddRequest).toBe(1)
    })

    it('should accept section props with only required fields', () => {
      const props: RescueTeamsSectionProps = {
        token: 'abc123'
      }

      expect(props.token).toBe('abc123')
      expect(props.registeredDistrict).toBeUndefined()
      expect(props.assignedDistricts).toBeUndefined()
      expect(props.role).toBeUndefined()
      expect(props.openAddRequest).toBeUndefined()
    })
  })
})
