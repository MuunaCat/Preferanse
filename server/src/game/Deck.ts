// This file creates and shuffles the deck, then deals cards to players.

import { Card, Suit, Rank } from '../types';
import { SUITS, RANKS } from './Card';

// Builds a fresh 32-card deck (all suits × all ranks)
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank }); // one card for every suit + rank combination
    }
  }
  return deck;
}

// Shuffles any array randomly using the Fisher-Yates algorithm
// It works by walking backwards and swapping each item with a random earlier item
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; // copy so we don't modify the original
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // swap the two items
  }
  return a;
}

// Deals out the shuffled deck: 10 cards to each of 3 players, 2 cards as the talon
export function deal(): { hands: [Card[], Card[], Card[]], talon: Card[] } {
  const deck = shuffle(createDeck()); // 32 cards total
  return {
    hands: [
      deck.slice(0, 10),  // player 0 gets cards 0–9
      deck.slice(10, 20), // player 1 gets cards 10–19
      deck.slice(20, 30), // player 2 gets cards 20–29
    ],
    talon: deck.slice(30, 32), // the last 2 cards are the hidden talon
  };
}
