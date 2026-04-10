import { Card, Suit, Rank } from '../types';
import { SUITS, RANKS } from './Card';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deal 10 cards to each of 3 players, 2 talon cards
export function deal(): { hands: [Card[], Card[], Card[]], talon: Card[] } {
  const deck = shuffle(createDeck()); // 32 cards
  return {
    hands: [deck.slice(0, 10), deck.slice(10, 20), deck.slice(20, 30)],
    talon: deck.slice(30, 32),
  };
}
