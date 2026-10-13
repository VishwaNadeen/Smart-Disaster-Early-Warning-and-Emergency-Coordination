// Unit tests for api.ts with mocked fetch
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTeams, listDistricts, createTeam, updateTeam, updateTeamStatus, deleteTeam } from '../api'
import type { RescueTeamItem, RescueTeamStatus, RescueTeamType } from '../types'

// Mock global fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('listTeams', () => {
    it('should fetch teams without district filter', async () => {
      const mockTeams: RescueTeamItem[] = [
        {
          _id: '1',
          teamId: 'TEAM-001',
          teamName: 'Alpha Team',
          teamType: 'ARMY' as RescueTeamType,
          memberCount: 10,
          status: 'AVAILABLE' as RescueTeamStatus
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeams
      })

      const result = await listTeams('token123', 'ALL')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams',
        {
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json'
          }
        }
      )
      expect(result).toEqual(mockTeams)
    })

    it('should fetch teams with district filter', async () => {
      const mockTeams: RescueTeamItem[] = [
        {
          _id: '1',
          teamId: 'TEAM-001',
          teamName: 'Alpha Team',
          teamType: 'NAVY' as RescueTeamType,
          memberCount: 5,
          district: 'Colombo',
          status: 'DEPLOYED' as RescueTeamStatus
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeams
      })

      const result = await listTeams('token123', 'Colombo')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams?district=Colombo',
        {
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json'
          }
        }
      )
      expect(result).toEqual(mockTeams)
    })

    it('should handle response with data property', async () => {
      const mockTeams: RescueTeamItem[] = [
        {
          _id: '1',
          teamId: 'TEAM-001',
          teamName: 'Alpha Team',
          teamType: 'ARMY' as RescueTeamType,
          memberCount: 10,
          status: 'AVAILABLE' as RescueTeamStatus
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTeams })
      })

      const result = await listTeams('token123', 'ALL')

      expect(result).toEqual(mockTeams)
    })

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const result = await listTeams('token123', 'ALL')

      expect(result).toEqual([])
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' })
      })

      await expect(listTeams('token123', 'ALL')).rejects.toThrow('Unauthorized')
    })
  })

  describe('listDistricts', () => {
    it('should fetch districts', async () => {
      const mockDistricts = ['Colombo', 'Gampaha', 'Kandy']

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockDistricts })
      })

      const result = await listDistricts()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/reports/districts',
        {
          headers: { Accept: 'application/json' }
        }
      )
      expect(result).toEqual(mockDistricts)
    })

    it('should filter non-string districts', async () => {
      const mockDistricts = ['Colombo', 123, 'Gampaha', null, 'Kandy']

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockDistricts })
      })

      const result = await listDistricts()

      expect(result).toEqual(['Colombo', 'Gampaha', 'Kandy'])
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(listDistricts()).rejects.toThrow('Districts unavailable')
    })
  })

  describe('createTeam', () => {
    it('should create a team', async () => {
      const payload = {
        teamName: 'New Team',
        teamType: 'ARMY' as RescueTeamType,
        memberCount: 10,
        status: 'AVAILABLE' as RescueTeamStatus,
        specialization: ['Search']
      }

      const mockResponse: RescueTeamItem = {
        _id: '1',
        teamId: 'TEAM-001',
        ...payload
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await createTeam('token123', payload)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateTeam', () => {
    it('should update a team', async () => {
      const payload = {
        teamName: 'Updated Team',
        teamType: 'NAVY' as RescueTeamType,
        memberCount: 15,
        status: 'DEPLOYED' as RescueTeamStatus,
        specialization: ['Rescue']
      }

      const mockResponse: RescueTeamItem = {
        _id: '1',
        teamId: 'TEAM-001',
        ...payload
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await updateTeam('token123', 'TEAM-001', payload)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams/TEAM-001',
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateTeamStatus', () => {
    it('should update team status', async () => {
      const mockResponse: RescueTeamItem = {
        _id: '1',
        teamId: 'TEAM-001',
        teamName: 'Alpha Team',
        teamType: 'ARMY' as RescueTeamType,
        memberCount: 10,
        status: 'STANDBY' as RescueTeamStatus
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await updateTeamStatus('token123', 'TEAM-001', 'STANDBY')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams/TEAM-001/status',
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'STANDBY' })
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteTeam', () => {
    it('should delete a team', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Team deleted' })
      })

      await deleteTeam('token123', 'TEAM-001')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rescue-teams/TEAM-001',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json'
          }
        }
      )
    })
  })
})
