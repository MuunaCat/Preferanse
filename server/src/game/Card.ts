// This file handles everything about individual cards:
// comparing them, figuring out which card wins a trick,
// and deciding which cards a player is allowed to play.

import { Card, Rank, Suit, Contract } from '../types';

// All 4 suits and all 8 ranks in the Preferanse deck (no 2–6 cards)
export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Maps each rank to a number so we can compare cards easily
// Higher number = stronger card
const RANK_ORDER: Record<Rank, number> = {
  '7': 0, '8': 1, '9': 2, '10': 3,
  'J': 4, 'Q': 5, 'K': 6, 'A': 7,
};

// Returns the numeric strength of a rank
export function rankValue(rank: Rank): number {
  return RANK_ORDER[rank];
}

// Checks if a candidate card beats the current winning card in a trick
// Returns true if the candidate should take over as the trick winner
export function cardBeats(candidate: Card, current: Card | null, led: Suit, trump: Suit | null): boolean {
  if (!current) return true; // first card always "wins" so far

  const isTrumpCandidate = trump !== null && candidate.suit === trump;
  const isTrumpCurrent   = trump !== null && current.suit === trump;

  if (isTrumpCandidate && !isTrumpCurrent) return true;  // trump beats non-trump
  if (!isTrumpCandidate && isTrumpCurrent) return false; // non-trump can't beat trump
  if (candidate.suit !== current.suit)     return false; // different suits, no trump — can't win

  // Both cards are the same suit — higher rank wins
  return rankValue(candidate.rank) > rankValue(current.rank);
}

// Finds which seat (player) wins a completed trick
export function trickWinner(trick: { seat: number; card: Card }[], trump: Suit | null): number {
  const led = trick[0].card.suit; // the suit that was led
  let winning = trick[0];         // start by assuming the first card wins

  for (let i = 1; i < trick.length; i++) {
    if (cardBeats(trick[i].card, winning.card, led, trump)) {
      winning = trick[i]; // this card is now winning
    }
  }

  return winning.seat; // return the seat number of the winner
}

// Checks if two cards are the same card
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// Returns the trump suit for a contract (null means no trump, like in Sans or Misere)
export function contractTrump(contract: Contract): Suit | null {
  if (contract.type === 'suit') return contract.suit!;
  return null; // sans and misere have no trump
}

// Returns which cards in a hand are legal to play right now
// Players must follow the led suit if they can; otherwise play trump if they have it
export function legalCards(hand: Card[], ledSuit: Suit | null, trump: Suit | null): Card[] {
  if (!ledSuit) return hand; // you're leading the trick — play anything

  // Try to follow the led suit first
  const followSuit = hand.filter(c => c.suit === ledSuit);
  if (followSuit.length > 0) return followSuit;

  // Can't follow suit — try to play trump
  if (trump) {
    const trumpCards = hand.filter(c => c.suit === trump);
    if (trumpCards.length > 0) return trumpCards;
  }

  return hand; // no led suit, no trump — play anything
}
