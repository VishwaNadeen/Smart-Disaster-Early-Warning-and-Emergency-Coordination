// Unit tests for validation.ts
import { describe, it, expect } from 'vitest'
import { validateField, validateForm } from '../validation'

describe('validateField', () => {
  it('should return error for empty team name', () => {
    const result = validateField('teamName', '')
    expect(result.teamName).toBe('Team name is required.')
  })

  it('should return no error for valid team name', () => {
    const result = validateField('teamName', 'Alpha Team')
    expect(result.teamName).toBe('')
  })

  it('should return error for invalid member count (zero)', () => {
    const result = validateField('memberCount', 0)
    expect(result.memberCount).toBe('Enter at least one member.')
  })

  it('should return error for invalid member count (negative)', () => {
    const result = validateField('memberCount', -5)
    expect(result.memberCount).toBe('Enter at least one member.')
  })

  it('should return error for non-integer member count', () => {
    const result = validateField('memberCount', 5.5)
    expect(result.memberCount).toBe('Enter at least one member.')
  })

  it('should return no error for valid member count', () => {
    const result = validateField('memberCount', 10)
    expect(result.memberCount).toBe('')
  })

  it('should return error for invalid phone format (short)', () => {
    const result = validateField('contactPhone', '077123456')
    expect(result.contactPhone).toBe('Use 0771234567 or +94771234567.')
  })

  it('should return error for invalid phone format (long)', () => {
    const result = validateField('contactPhone', '07712345678')
    expect(result.contactPhone).toBe('Use 0771234567 or +94771234567.')
  })

  it('should return no error for valid phone format (10 digits)', () => {
    const result = validateField('contactPhone', '0771234567')
    expect(result.contactPhone).toBe('')
  })

  it('should return no error for valid phone format (+94)', () => {
    const result = validateField('contactPhone', '+94771234567')
    expect(result.contactPhone).toBe('')
  })

  it('should return no error for empty phone (optional field)', () => {
    const result = validateField('contactPhone', '')
    expect(result.contactPhone).toBe('')
  })

  it('should handle whitespace in team name', () => {
    const result = validateField('teamName', '   ')
    expect(result.teamName).toBe('Team name is required.')
  })

  it('should handle string number for member count', () => {
    const result = validateField('memberCount', '5')
    expect(result.memberCount).toBe('')
  })
})

describe('validateForm', () => {
  it('should return no errors for valid form data', () => {
    const result = validateForm('Alpha Team', 10, '0771234567')
    expect(Object.keys(result).length).toBe(0)
  })

  it('should return error for missing team name', () => {
    const result = validateForm('', 10, '0771234567')
    expect(result.teamName).toBe('Team name is required.')
  })

  it('should return error for invalid member count', () => {
    const result = validateForm('Alpha Team', 0, '0771234567')
    expect(result.memberCount).toBe('Enter at least one member.')
  })

  it('should return error for invalid phone', () => {
    const result = validateForm('Alpha Team', 10, '123')
    expect(result.contactPhone).toBe('Use 0771234567 or +94771234567.')
  })

  it('should return multiple errors for invalid form', () => {
    const result = validateForm('', 0, '123')
    expect(result.teamName).toBe('Team name is required.')
    expect(result.memberCount).toBe('Enter at least one member.')
    expect(result.contactPhone).toBe('Use 0771234567 or +94771234567.')
  })

  it('should allow empty phone (optional field)', () => {
    const result = validateForm('Alpha Team', 10, '')
    expect(Object.keys(result).length).toBe(0)
  })

  it('should handle +94 phone format', () => {
    const result = validateForm('Alpha Team', 10, '+94771234567')
    expect(Object.keys(result).length).toBe(0)
  })
})
