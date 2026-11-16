import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGRAM_GROUND_Y,
  LIGHTHOUSE_ART_HEIGHT,
  LIGHTHOUSE_HEIGHT_M,
  lighthouseDiagram,
} from '../src/shared/lighthouse.ts';
import { SERVER_TURBINE_DECK } from '../src/server/turbineRepository.ts';

/** Drawn heights, in SVG units, of the three things the diagram compares. */
function drawn(hubM: number, rotorM: number) {
  const d = lighthouseDiagram(hubM, rotorM);
  return {
    hub: DIAGRAM_GROUND_Y - d.hubY,
    radius: d.bladeLen,
    lighthouse: LIGHTHOUSE_ART_HEIGHT * d.lighthouseScale,
    tip: d.hubY - d.bladeLen,
  };
}

test('lighthouse diagram: a 100 m hub is drawn 2.2 times as tall as the 45 m lighthouse, an 18 m hub 0.4 times', () => {
  const tall = drawn(100, 100);
  assert.ok(Math.abs(tall.hub / tall.lighthouse - 100 / 45) < 1e-9);
  const small = drawn(18, 17);
  assert.ok(Math.abs(small.hub / small.lighthouse - 18 / 45) < 1e-9);
  assert.ok(small.hub < small.lighthouse, 'an 18 m hub must be clearly shorter than the lighthouse');
  assert.ok(tall.hub > 2 * tall.lighthouse, 'a 100 m hub must be more than twice as tall as the lighthouse');
});

test('lighthouse diagram: every card is drawn in true proportion and fits into the picture', () => {
  assert.ok(SERVER_TURBINE_DECK.length >= 64);
  for (const card of SERVER_TURBINE_DECK) {
    const hub = card.stats.hubHeightM;
    const rotor = card.stats.rotorDiameterM;
    const d = drawn(hub, rotor);
    assert.ok(
      Math.abs(d.hub / d.lighthouse - hub / LIGHTHOUSE_HEIGHT_M) < 1e-9,
      `${card.id}: hub ${hub} m vs lighthouse proportion`
    );
    assert.ok(
      Math.abs(d.radius / d.lighthouse - rotor / 2 / LIGHTHOUSE_HEIGHT_M) < 1e-9,
      `${card.id}: blade length proportion`
    );
    assert.ok(d.tip >= 5, `${card.id}: blade tip stays inside the drawing (y = ${d.tip.toFixed(1)})`);
    assert.ok(d.lighthouse > 8, `${card.id}: lighthouse stays visible (${d.lighthouse.toFixed(1)} units)`);
  }
});

test('lighthouse diagram: taller turbines make the shared scale smaller, never the proportion wrong', () => {
  const a = lighthouseDiagram(50, 50);
  const b = lighthouseDiagram(200, 250);
  assert.ok(b.unitsPerMetre < a.unitsPerMetre);
  assert.ok(Math.abs(lighthouseDiagram(0, 0).hubY - DIAGRAM_GROUND_Y) < 1e-9, 'a missing height does not break the picture');
});
