import type { Card } from './types';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
};

export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

export function suitClass(c: Card): string {
  return c.suit === 'diamonds' || c.suit === 'hearts' ? 'red' : '';
}
