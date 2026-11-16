export type HeaderAction = 'quit' | 'back' | 'searching' | 'quick';

/**
 * What the main button in the page header does:
 * - `quit`:      a game is running and the arena is on screen -> "Quit Game" (asks for confirmation first)
 * - `back`:      a game is running and another page is open -> "Back to Game"
 * - `searching`: waiting in the matchmaking queue
 * - `quick`:     no game -> "Quick Match". A finished game whose result is still on screen counts as no game.
 */
export function headerAction(match: { status: string } | null, activeTab: string, inQueue: boolean): HeaderAction {
  if (match && match.status !== 'FINISHED') return activeTab === 'arena' ? 'quit' : 'back';
  return inQueue ? 'searching' : 'quick';
}
