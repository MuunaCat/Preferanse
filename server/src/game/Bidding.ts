// This file handles everything about bidding:
// comparing bids, building the list of valid bids, and calculating contract scores.

import { Contract, ContractLevel, Suit } from '../types';
import { SUITS } from './Card';

// Bid order (lowest to highest):
// 6♠=0, 6♣=1, 6♦=2, 6♥=3, 6sans=4,
// misere=5,
// 7♠=6, 7♣=7, 7♦=8, 7♥=9, 7sans=10,
// 8♠=11 ... all the way up to 10sans=24

// Converts a contract to a number so we can easily compare which bid is higher
export function bidValue(c: Omit<Contract, 'bidValue'>): number {
  if (c.type === 'pass')   return -1; // passing is "below" all real bids
  if (c.type === 'misere') return 5;  // misere sits between 6sans and 7spades

  const level       = c.level!;
  const levelOffset = (level - 6) * 5; // 6→0, 7→5, 8→10, 9→15, 10→20

  if (c.type === 'sans') return levelOffset + 4; // sans is the strongest at each level

  // For suit bids, spades=0, clubs=1, diamonds=2, hearts=3
  const suitOffset = SUITS.indexOf(c.suit!);
  return levelOffset + suitOffset;
}

// Builds a full Contract object by calculating its bidValue
export function makeContract(raw: Omit<Contract, 'bidValue'>): Contract {
  return { ...raw, bidValue: bidValue(raw) } as Contract;
}

// Creates a pass contract (used when a player doesn't want to bid)
export function makePass(): Contract {
  return { type: 'pass', bidValue: -1 };
}

// Returns a human-readable label for a contract, like "7♥" or "Misère"
export function contractLabel(c: Contract): string {
  if (c.type === 'pass')   return 'Pass';
  if (c.type === 'misere') return 'Misère';

  const suitSymbol: Record<string, string> = {
    spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
  };

  if (c.type === 'sans') return `${c.level} NS`;

  return `${c.level}${suitSymbol[c.suit!]}`;
}

// Returns all bids that are higher than the current highest bid
// If currentBid is null, all bids are valid (no one has bid yet)
export function validBids(currentBid: Contract | null): Contract[] {
  const minValue = currentBid ? currentBid.bidValue + 1 : 0;
  const bids: Contract[] = [];

  for (let level = 6; level <= 10; level++) {
    // Add all 4 suit bids at this level
    for (const suit of SUITS) {
      const raw = { type: 'suit' as const, level: level as ContractLevel, suit };
      if (bidValue(raw) >= minValue) bids.push(makeContract(raw));
    }

    // Add the sans (no trump) bid at this level
    const sansRaw = { type: 'sans' as const, level: level as ContractLevel };
    if (bidValue(sansRaw) >= minValue) bids.push(makeContract(sansRaw));

    // Misere goes between level 6 and level 7 (bidValue 5)
    if (level === 6) {
      const misereRaw = { type: 'misere' as const };
      if (bidValue(misereRaw) >= minValue) bids.push(makeContract(misereRaw));
    }
  }

  return bids;
}

// How many points the winning bidder scores (or loses) for a contract
// Based on Sochi rules
export function contractScore(c: Contract): number {
  if (c.type === 'misere') return 10; // misere is worth 10 points
  if (c.type === 'pass')   return 0;
  const level = c.level!;
  return (level - 5) * 2; // 6→2, 7→4, 8→6, 9→8, 10→10
}
