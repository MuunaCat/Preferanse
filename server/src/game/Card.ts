import { Card, Rank, Suit, Contract } from '../types';

export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Higher index = higher card
const RANK_ORDER: Record<Rank, number> = {
  '7': 0, '8': 1, '9': 2, '10': 3,
  'J': 4, 'Q': 5, 'K': 6, 'A': 7,
};

export function rankValue(rank: Rank): number {
  return RANK_ORDER[rank];
}

export function cardBeats(candidate: Card, current: Card | null, led: Suit, trump: Suit | null): boolean {
  if (!current) return true;

  const isTrumpCandidate = trump !== null && candidate.suit === trump;
  const isTrumpCurrent = trump !== null && current.suit === trump;

  if (isTrumpCandidate && !isTrumpCurrent) return true;
  if (!isTrumpCandidate && isTrumpCurrent) return false;
  if (candidate.suit !== current.suit) return false; // neither changed trump situation, different suits — can't beat

  // Same suit
  return rankValue(candidate.rank) > rankValue(current.rank);
}

export function trickWinner(trick: { seat: number; card: Card }[], trump: Suit | null): number {
  const led = trick[0].card.suit;
  let winning = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (cardBeats(trick[i].card, winning.card, led, trump)) {
      winning = trick[i];
    }
  }
  return winning.seat;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function contractTrump(contract: Contract): Suit | null {
  if (contract.type === 'suit') return contract.suit!;
  return null; // sans, misere — no trump
}

// Legal cards to play given hand, led suit, and trump
export function legalCards(hand: Card[], ledSuit: Suit | null, trump: Suit | null): Card[] {
  if (!ledSuit) return hand; // trick leader can play anything

  const followSuit = hand.filter(c => c.suit === ledSuit);
  if (followSuit.length > 0) return followSuit;

  if (trump) {
    const trumpCards = hand.filter(c => c.suit === trump);
    if (trumpCards.length > 0) return trumpCards;
  }

  return hand; // can play anything
}
