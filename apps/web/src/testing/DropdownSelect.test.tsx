import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DropdownSelect from '../pages/dmc/DropdownSelect'

const OPTIONS = [
  { value: 'ALL', label: 'All districts' },
  { value: 'Kandy', label: 'Kandy' },
  { value: 'Galle', label: 'Galle' },
]

function renderDropdown(overrides: Partial<Parameters<typeof DropdownSelect>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <div>
      <DropdownSelect
        ariaLabel="Filter by district"
        value="ALL"
        options={OPTIONS}
        onChange={onChange}
        {...overrides}
      />
      <button type="button">outside</button>
    </div>,
  )
  return { onChange, user: userEvent.setup() }
}

describe('DropdownSelect', () => {
  it('shows the label of the selected option and starts closed', () => {
    renderDropdown({ value: 'Kandy' })

    expect(screen.getByRole('button', { name: 'Filter by district' })).toHaveTextContent('Kandy')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the placeholder when no option matches the value', () => {
    renderDropdown({ value: '', placeholder: 'Add a district…' })

    expect(screen.getByRole('button', { name: 'Filter by district' })).toHaveTextContent(
      'Add a district…',
    )
  })

  it('opens below the button and lists every option with the selected one marked', async () => {
    const { user } = renderDropdown({ value: 'Galle' })

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Galle' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Kandy' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('listbox').className).toContain('top-full')
  })

  it('reports the chosen value and closes the list', async () => {
    const { user, onChange } = renderDropdown()

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.click(screen.getByRole('button', { name: 'Kandy' }))

    expect(onChange).toHaveBeenCalledWith('Kandy')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes when the Escape key is pressed', async () => {
    const { user } = renderDropdown()

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes when the user clicks outside without changing the value', async () => {
    const { user, onChange } = renderDropdown()

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.click(screen.getByRole('button', { name: 'outside' }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('toggles closed when the button is clicked twice', async () => {
    const { user } = renderDropdown()
    const button = screen.getByRole('button', { name: 'Filter by district' })

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders an empty list safely when there are no options', async () => {
    const { user } = renderDropdown({ options: [], value: '' })

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('works as a controlled input inside a parent component', async () => {
    function Harness() {
      const [value, setValue] = useState('ALL')
      return (
        <DropdownSelect
          ariaLabel="Filter by district"
          value={value}
          options={OPTIONS}
          onChange={setValue}
        />
      )
    }
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.click(screen.getByRole('button', { name: 'Galle' }))

    expect(screen.getByRole('button', { name: 'Filter by district' })).toHaveTextContent('Galle')
  })
})
