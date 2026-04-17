import { getGradientStyle } from '../gradient'

it('returns a background style with linear-gradient', () => {
  const style = getGradientStyle('abc123')
  expect(style.background).toMatch(/linear-gradient/)
})

it('returns different gradients for different ids', () => {
  const a = getGradientStyle('id-one')
  const b = getGradientStyle('id-two')
  expect(a.background).not.toBe(b.background)
})

it('returns the same gradient for the same id', () => {
  expect(getGradientStyle('stable-id')).toEqual(getGradientStyle('stable-id'))
})
