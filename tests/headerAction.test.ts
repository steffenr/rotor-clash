import test from 'node:test';
import assert from 'node:assert/strict';
import { headerAction } from '../src/shared/headerAction.ts';

const playing = { status: 'PLAYING' };
const reveal = { status: 'ROUND_REVEAL' };
const finished = { status: 'FINISHED' };

test('header button: no game -> Quick Match, or Searching while queued', () => {
  assert.equal(headerAction(null, 'arena', false), 'quick');
  assert.equal(headerAction(null, 'compendium', false), 'quick');
  assert.equal(headerAction(null, 'arena', true), 'searching');
});

test('header button: game running in the arena -> Quit Game, for every round phase', () => {
  assert.equal(headerAction(playing, 'arena', false), 'quit');
  assert.equal(headerAction(reveal, 'arena', false), 'quit');
});

test('header button: game running on another page -> Back to Game', () => {
  for (const tab of ['compendium', 'leaderboard', 'tutorial']) {
    assert.equal(headerAction(playing, tab, false), 'back', tab);
    assert.equal(headerAction(reveal, tab, false), 'back', tab);
  }
});

test('header button: a finished game offers Quick Match, never Quit (there is nothing left to quit)', () => {
  assert.equal(headerAction(finished, 'arena', false), 'quick');
  assert.equal(headerAction(finished, 'leaderboard', false), 'quick');
  assert.equal(headerAction(finished, 'arena', true), 'searching');
});
