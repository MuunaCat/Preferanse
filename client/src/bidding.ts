import type { Contract, ContractLevel, Suit } from './types';

const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

export function bidValue(c: Omit<Contract, 'bidValue'>): number {
  if (c.type === 'pass') return -1;
  if (c.type === 'misere') return 5;
  const level = c.level!;
  const levelOffset = (level - 6) * 5;
  if (c.type === 'sans') return levelOffset + 4;
  return levelOffset + SUITS.indexOf(c.suit!);
}

export function makeContractRaw(raw: Omit<Contract, 'bidValue'>): Contract {
  return { ...raw, bidValue: bidValue(raw) } as Contract;
}

export function contractLabel(c: Contract): string {
  if (c.type === 'pass') return 'Pass';
  if (c.type === 'misere') return 'Misère';
  const sym: Record<string, string> = { spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥' };
  if (c.type === 'sans') return `${c.level} Sans`;
  return `${c.level}${sym[c.suit!]}`;
}

export function validBids(currentBid: Contract | null): Contract[] {
  const minValue = currentBid ? currentBid.bidValue + 1 : 0;
  const bids: Contract[] = [];

  for (let level = 6; level <= 10; level++) {
    for (const suit of SUITS) {
      const raw = { type: 'suit' as const, level: level as ContractLevel, suit };
      const v = bidValue(raw);
      if (v >= minValue) bids.push(makeContractRaw(raw));
    }
    const sansRaw = { type: 'sans' as const, level: level as ContractLevel };
    if (bidValue(sansRaw) >= minValue) bids.push(makeContractRaw(sansRaw));
    if (level === 6) {
      const misere = { type: 'misere' as const };
      if (bidValue(misere) >= minValue) bids.push(makeContractRaw(misere));
    }
  }
  return bids;
}
