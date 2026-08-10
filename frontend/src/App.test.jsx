import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Stars } from './components'

describe('Components Test', () => {
  it('Stars component renders correctly', () => {
    const { container } = render(<Stars rating={3} />)
    const stars = container.querySelectorAll('svg')
    expect(stars).toHaveLength(5)
    // 3 stars should be filled
    expect(container.querySelectorAll('.text-yellow-400')).toHaveLength(3)
  })
})
