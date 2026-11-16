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

test('templates use only Tailwind default font sizes (no text-[..px] arbitrary values)', () => {
  const dir = path.resolve(import.meta.dirname, '../src/templates');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(dir, file), 'utf-8');
    assert.equal(/text-\[[0-9.]+(px|rem|em)\]/.test(source), false, `${file} has a custom font size`);
  }
});

test('own card in a match shows a phone hero with the name over the photo; the opponent card does not', () => {
  const own = renderTurbineCard('c()', { hideMediaOnMobile: true, mobileHero: true });
  const opp = renderTurbineCard('c()', { hideMediaOnMobile: true });
  assert.ok(own.includes('sm:hidden relative block w-full h-64'));
  assert.ok(!opp.includes('sm:hidden relative block w-full h-64'));
  // phones get the full width; the caps start at sm
  assert.ok(own.includes('w-full sm:max-w-[356px]'));
  assert.equal(own.includes('w-full max-w-[356px]'), false);
});
