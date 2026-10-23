import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeProjectionSections, LIGHTING_PRESETS, PROJECTION_STYLES, projectionSectionAt, STAGE_PRESETS } from '../stage-presets.js'

const expectedStages = ['stage', 'studio', 'candle', 'water', 'projection']
const expectedLighting = ['concert', 'studio', 'candle', 'blueHour', 'projection']

test('stage catalog includes both prototypes and stable original keys', () => {
  assert.deepEqual(Object.keys(STAGE_PRESETS), expectedStages)
  assert.equal(STAGE_PRESETS.candle.props, 'candle')
  assert.equal(STAGE_PRESETS.water.props, 'water')
  assert.equal(STAGE_PRESETS.water.background, 'blueHour')
  assert.equal(STAGE_PRESETS.water.floor.visible, false)
  assert.equal(STAGE_PRESETS.projection.props, 'projection')
  assert.equal(STAGE_PRESETS.projection.lighting, 'projection')
})

test('every stage resolves to a complete lighting preset', () => {
  assert.deepEqual(Object.keys(LIGHTING_PRESETS), expectedLighting)
  for (const [stageName, stage] of Object.entries(STAGE_PRESETS)) {
    assert.ok(LIGHTING_PRESETS[stage.lighting], `${stageName} references ${stage.lighting}`)
  }
  for (const [name, preset] of Object.entries(LIGHTING_PRESETS)) {
    assert.ok(preset.label, `${name} has a label`)
    for (const role of ['key', 'back', 'fill']) {
      const light = preset[role]
      assert.equal(typeof light.color, 'number', `${name}.${role} has a color`)
      assert.ok(light.intensity > 0, `${name}.${role} has positive intensity`)
      assert.equal(light.position.length, 3, `${name}.${role} has a position`)
      assert.equal(light.target.length, 3, `${name}.${role} has a target`)
    }
    assert.equal(typeof preset.lid.color, 'number', `${name}.lid has a color`)
    assert.ok(preset.lid.intensity > 0, `${name}.lid has positive intensity`)
  }
})

test('every stage defines reusable establishing cameras', () => {
  for (const [stageName, stage] of Object.entries(STAGE_PRESETS)) {
    for (const shotName of ['establish', 'venue']) {
      const shot = stage.shots?.[shotName]
      assert.ok(shot, `${stageName} has ${shotName} shot`)
      assert.equal(shot.pos.length, 3, `${stageName}.${shotName} has a camera position`)
      assert.equal(shot.target.length, 3, `${stageName}.${shotName} has a target`)
      assert.ok(shot.fov >= 30 && shot.fov <= 60, `${stageName}.${shotName} has a usable lens`)
      assert.ok(shot.dof >= 0 && shot.dof <= 1, `${stageName}.${shotName} has restrained depth of field`)
    }
    assert.notDeepEqual(stage.shots.establish.pos, stage.shots.venue.pos, `${stageName} shots are distinct`)
  }
})


test('projection styles expose automatic and four fixed visual languages', () => {
  assert.deepEqual(Object.keys(PROJECTION_STYLES), ['auto', 'aurora', 'constellation', 'score', 'geometry'])
  assert.equal(PROJECTION_STYLES.auto.uniform, null)
  assert.deepEqual(Object.values(PROJECTION_STYLES).slice(1).map(style => style.uniform), [0, 1, 2, 3])
})

test('projection form analysis is deterministic and tracks contrasting sections', () => {
  const notes = []
  const phrase = (start, end, step, velocity, base) => {
    let index = 0
    for (let time = start; time < end; time += step) notes.push({ time, duration: Math.min(step * 0.8, 0.7), velocity, midi: base + index++ % 7 })
  }
  phrase(0, 14, 1.2, 0.35, 48)
  phrase(16, 30, 0.28, 0.95, 60)
  phrase(32, 46, 1.4, 0.28, 72)
  phrase(48, 64, 0.38, 0.78, 55)
  const song = { duration: 64, notes }
  const first = analyzeProjectionSections(song), second = analyzeProjectionSections(song)
  assert.deepEqual(first, second)
  assert.ok(first.length >= 3 && first.length <= 4, `expected 3–4 broad sections, got ${first.length}`)
  assert.equal(first[0].start, 0)
  assert.equal(first.at(-1).end, 64)
  assert.equal(first[0].label, 'Opening')
  assert.equal(first.at(-1).label, 'Finale')
  for (let index = 0; index < first.length; index++) {
    const section = first[index]
    assert.ok(section.end > section.start)
    assert.ok(section.energy >= 0 && section.energy <= 1)
    assert.ok(section.density >= 0 && section.density <= 1)
    assert.ok(section.register >= -1 && section.register <= 1)
    assert.ok(section.style >= 0 && section.style <= 3)
    if (index) assert.equal(section.start, first[index - 1].end)
  }
  assert.ok(new Set(first.map(section => section.style)).size >= 2, 'contrasting music selects more than one automatic style')
  const middle = projectionSectionAt(first, 24)
  assert.ok(middle && middle.index > 0)
  assert.ok(middle.progress >= 0 && middle.progress <= 1)
  assert.equal(projectionSectionAt(first, 1e6).index, first.length - 1)
})

test('short pieces remain one complete visual section', () => {
  const sections = analyzeProjectionSections({ duration: 8, notes: [{ time: 0, duration: 8, velocity: 0.5, midi: 60 }] })
  assert.equal(sections.length, 1)
  assert.equal(sections[0].label, 'Complete piece')
  assert.equal(projectionSectionAt(sections, 4).progress, 0.5)
})
