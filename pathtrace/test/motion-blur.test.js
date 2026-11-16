import { test, expect } from 'bun:test'
import { shutterTime, shutterScale } from '../motion-blur.js'

test('a 180 degree shutter at 24 fps exposes for 1/48 second', () => {
  expect(shutterTime(180, 24)).toBeCloseTo(1 / 48, 12)
})

test('velocity scales from the rendered interval to the shutter interval', () => {
  expect(shutterScale(180, 1 / 60)).toBeCloseTo(1.25, 12)
  expect(shutterScale(180, 1 / 24)).toBeCloseTo(0.5, 12)
  expect(shutterScale(360, 1 / 24)).toBeCloseTo(1, 12)
})

test('cuts, still frames, invalid values and excessive gaps are bounded', () => {
  expect(shutterScale(180, 1 / 60, { cut: true })).toBe(0)
  expect(shutterScale(180, 0)).toBe(0)
  expect(shutterTime(NaN)).toBe(0)
  expect(shutterScale(360, 1 / 1000)).toBe(4)
  expect(shutterTime(720, 24)).toBeCloseTo(1 / 24, 12)
})
