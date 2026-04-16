// Helper functions for displaying cards in the browser.

import type { Card } from './types';

// Maps suit names to their Unicode symbols
const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
};

// Used when sorting a hand — spades first, hearts last
const SUIT_ORDER: Record<string, number> = { spades: 0, clubs: 1, diamonds: 2, hearts: 3 };

// Used when sorting cards within a suit — 7 lowest, A highest
const RANK_ORDER: Record<string, number> = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 };

// Returns the display text for a card, e.g. "K♥" or "10♠"
export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

// Returns "red" for red suits (diamonds and hearts), "" for black suits
// Used to colour cards correctly in the UI
export function suitClass(c: Card): string {
  return c.suit === 'diamonds' || c.suit === 'hearts' ? 'red' : '';
}

// Sorts a hand of cards: grouped by suit, highest rank first within each suit
export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;             // sort by suit first
    return RANK_ORDER[b.rank] - RANK_ORDER[a.rank];  // then highest card first
  });
}
