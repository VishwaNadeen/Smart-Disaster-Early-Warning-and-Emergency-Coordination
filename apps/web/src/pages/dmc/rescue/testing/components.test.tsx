
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { RescueTeamsStats } from '../components/RescueTeamsStats'
import { RescueTeamsHeader } from '../components/RescueTeamsHeader'
import { RescueTeamsEmptyState } from '../components/RescueTeamsEmptyState'

// [SE3070 - TEST] Rescue Teams Statistics Component
describe('RescueTeamsStats', () => {
  const defaultProps = {
    isLoading: false,
    totalTeams: 10,
    deployedCount: 5,
    availableCount: 3,
    totalMembers: 100,
    selectedDistrict: 'ALL',
  }

  it('should render statistics cards correctly', () => {
    render(<RescueTeamsStats {...defaultProps} />)

    expect(screen.getByText('Total Rescue Teams')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Deployed in Field')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Ready for Dispatch')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Total Personnel')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(
      <RescueTeamsStats
        {...defaultProps}
        isLoading={true}
      />
    )

    expect(screen.getAllByText('…')).toHaveLength(4)
  })

  it('should display selected district information', () => {
    render(
      <RescueTeamsStats
        {...defaultProps}
        selectedDistrict="Colombo"
      />
    )

    expect(
      screen.getByText('Assigned to Colombo')
    ).toBeInTheDocument()
  })
})

// [SE3070 - TEST] Rescue Teams Header Component
describe('RescueTeamsHeader', () => {
  const defaultProps = {
    selectedDistrict: 'ALL',
    allDistricts: ['Colombo', 'Gampaha'],
    isLoadingDistricts: false,
    onDistrictChange: vi.fn(),
  }

  it('should render the header title and description', () => {
    render(<RescueTeamsHeader {...defaultProps} />)

    expect(
      screen.getByText('Emergency Rescue Teams')
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Deploy, coordinate, and monitor emergency rescue units.'
      )
    ).toBeInTheDocument()
  })

  it('should display district selection options', () => {
    render(
      <RescueTeamsHeader
        {...defaultProps}
        registeredDistrict="Colombo"
      />
    )

    expect(screen.getByText('All Districts')).toBeInTheDocument()
    expect(screen.getByText('★ Colombo')).toBeInTheDocument()
  })

  it('should display district dropdown with default value', () => {
    render(<RescueTeamsHeader {...defaultProps} />)

    const select = screen.getByLabelText('District filter')

    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('ALL')
  })

  it('should call onDistrictChange when district changes', () => {
    const onDistrictChange = vi.fn()

    render(
      <RescueTeamsHeader
        {...defaultProps}
        onDistrictChange={onDistrictChange}
      />
    )

    const select = screen.getByLabelText('District filter')

    fireEvent.change(select, {
      target: { value: 'Colombo' },
    })

    expect(onDistrictChange).toHaveBeenCalledWith('Colombo')
  })
})

// [SE3070 - TEST] Rescue Teams Empty State Component
describe('RescueTeamsEmptyState', () => {
  it('should display empty state for all districts', () => {
    const onAddTeam = vi.fn()

    render(
      <RescueTeamsEmptyState
        selectedDistrict="ALL"
        onAddTeam={onAddTeam}
      />
    )

    expect(
      screen.getByText('No rescue teams found')
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'No emergency rescue teams registered yet.'
      )
    ).toBeInTheDocument()

    expect(
      screen.getByText('Register New Rescue Team')
    ).toBeInTheDocument()
  })

  it('should display empty state for selected district', () => {
    render(
      <RescueTeamsEmptyState
        selectedDistrict="Colombo"
        onAddTeam={vi.fn()}
      />
    )

    expect(
      screen.getByText(
        'No rescue teams found in Colombo District.'
      )
    ).toBeInTheDocument()
  })

  it('should call onAddTeam when register button is clicked', () => {
    const onAddTeam = vi.fn()

    render(
      <RescueTeamsEmptyState
        selectedDistrict="ALL"
        onAddTeam={onAddTeam}
      />
    )

    fireEvent.click(
      screen.getByText('Register New Rescue Team')
    )

    expect(onAddTeam).toHaveBeenCalledTimes(1)
  })
})
