import { Contract, ContractLevel, Suit } from '../types';
import { SUITS } from './Card';

// Bid order:
// 6♠=0, 6♣=1, 6♦=2, 6♥=3, 6sans=4,
// misere=5,
// 7♠=6, 7♣=7, 7♦=8, 7♥=9, 7sans=10,
// 8♠=11 ... 10sans=24

export function bidValue(c: Omit<Contract, 'bidValue'>): number {
  if (c.type === 'pass') return -1;
  if (c.type === 'misere') return 5;

  const level = c.level!;
  const levelOffset = (level - 6) * 5; // 6→0, 7→5, 8→10, 9→15, 10→20

  if (c.type === 'sans') return levelOffset + 4;

  // suit
  const suitOffset = SUITS.indexOf(c.suit!); // spades=0, clubs=1, diamonds=2, hearts=3
  return levelOffset + suitOffset;
}

export function makeContract(raw: Omit<Contract, 'bidValue'>): Contract {
  return { ...raw, bidValue: bidValue(raw) } as Contract;
}

export function makePass(): Contract {
  return { type: 'pass', bidValue: -1 };
}

export function contractLabel(c: Contract): string {
  if (c.type === 'pass') return 'Pass';
  if (c.type === 'misere') return 'Misère';
  const suitSymbol: Record<string, string> = {
    spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
  };
  if (c.type === 'sans') return `${c.level} Sans`;
  return `${c.level}${suitSymbol[c.suit!]}`;
}

// Returns all valid bids higher than currentBid (or all if null)
export function validBids(currentBid: Contract | null): Contract[] {
  const minValue = currentBid ? currentBid.bidValue + 1 : 0;
  const bids: Contract[] = [];

  for (let level = 6; level <= 10; level++) {
    for (const suit of SUITS) {
      const raw = { type: 'suit' as const, level: level as ContractLevel, suit };
      const v = bidValue(raw);
      if (v >= minValue) bids.push(makeContract(raw));
    }
    const sansRaw = { type: 'sans' as const, level: level as ContractLevel };
    const sv = bidValue(sansRaw);
    if (sv >= minValue) bids.push(makeContract(sansRaw));

    // Insert misere after 6sans (bidValue 5)
    if (level === 6) {
      const misereRaw = { type: 'misere' as const };
      const mv = bidValue(misereRaw);
      if (mv >= minValue) bids.push(makeContract(misereRaw));
    }
  }

  return bids;
}

// Contract value for scoring purposes (Sochi rules)
export function contractScore(c: Contract): number {
  if (c.type === 'misere') return 10; // misere = 10 points
  if (c.type === 'pass') return 0;
  const level = c.level!;
  return (level - 5) * 2; // 6→2, 7→4, 8→6, 9→8, 10→10
}
