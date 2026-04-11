import type { Card } from './types';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
};

const SUIT_ORDER: Record<string, number> = { spades: 0, clubs: 1, diamonds: 2, hearts: 3 };
const RANK_ORDER: Record<string, number> = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 };

export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

export function suitClass(c: Card): string {
  return c.suit === 'diamonds' || c.suit === 'hearts' ? 'red' : '';
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER[b.rank] - RANK_ORDER[a.rank]; // highest first within suit
  });
}
