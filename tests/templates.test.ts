import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderAppShell } from '../src/templates/sections.ts';
import { renderTurbineCard, renderTurbineCardBack } from '../src/templates/cardMarkup.ts';

test('Alpine HTML shell uses Rotor Clash branding, EN/DE switcher, and valid x-if templates', () => {
  const html = renderAppShell();
  assert.ok(html.includes('Rotor Clash'));
  assert.ok(html.includes("setLang('en')"));
  assert.ok(html.includes("setLang('de')"));
  assert.ok(html.includes('45m'));
  assert.ok(html.includes('ROTOR CLASH'));

  // Alpine x-if must ONLY be placed on <template>, never on <div> or <article>
  assert.equal(/<(div|article|section|span)[^>]*\bx-if=/.test(html), false);
});

test('Turbine card template wraps dynamic card expressions in template x-if for null safety', () => {
  const markup = renderTurbineCard('arenaOppCard()');
  assert.match(markup, /<template\s+x-if="arenaOppCard\(\)">/);
  const backMarkup = renderTurbineCardBack('16', "'Stack'");
  assert.ok(backMarkup.includes('ROTOR CLASH'));
});

test('index.html loads Alpine entry point without React mount', () => {
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  assert.ok(indexHtml.includes('/src/main.ts'));
  assert.ok(indexHtml.includes('x-data="rotorClashApp()"'));
  assert.equal(indexHtml.includes('/src/main.tsx'), false);
});
