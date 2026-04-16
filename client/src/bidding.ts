// Client-side bidding helpers — mirror of the server's Bidding.ts.
// These are used to build the bid grid and display contract labels in the UI.

import type { Contract, ContractLevel, Suit } from './types';

// Suit order (weakest to strongest in bidding)
const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

// Converts a contract to a number so we can compare bids
// Higher number = stronger bid
export function bidValue(c: Omit<Contract, 'bidValue'>): number {
  if (c.type === 'pass')   return -1;
  if (c.type === 'misere') return 5;

  const level       = c.level!;
  const levelOffset = (level - 6) * 5; // 6→0, 7→5, 8→10, 9→15, 10→20

  if (c.type === 'sans') return levelOffset + 4;

  return levelOffset + SUITS.indexOf(c.suit!);
}

// Builds a full Contract object by computing its bidValue
export function makeContractRaw(raw: Omit<Contract, 'bidValue'>): Contract {
  return { ...raw, bidValue: bidValue(raw) } as Contract;
}

// Returns a human-readable label for a contract, e.g. "7♥" or "Misère"
export function contractLabel(c: Contract): string {
  if (c.type === 'pass')   return 'Pass';
  if (c.type === 'misere') return 'Misère';

  const sym: Record<string, string> = { spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥' };
  if (c.type === 'sans') return `${c.level} NS`;

  return `${c.level}${sym[c.suit!]}`;
}

// Returns all bids that are higher than the current bid
// Used to decide which bid buttons should be enabled
export function validBids(currentBid: Contract | null): Contract[] {
  const minValue = currentBid ? currentBid.bidValue + 1 : 0;
  const bids: Contract[] = [];

  for (let level = 6; level <= 10; level++) {
    for (const suit of SUITS) {
      const raw = { type: 'suit' as const, level: level as ContractLevel, suit };
      if (bidValue(raw) >= minValue) bids.push(makeContractRaw(raw));
    }
    const sansRaw = { type: 'sans' as const, level: level as ContractLevel };
    if (bidValue(sansRaw) >= minValue) bids.push(makeContractRaw(sansRaw));

    // Misere slots in between level 6 and level 7
    if (level === 6) {
      const misere = { type: 'misere' as const };
      if (bidValue(misere) >= minValue) bids.push(makeContractRaw(misere));
    }
  }
  return bids;
}
