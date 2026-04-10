// Mirror of server types for client use
export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type ContractType = 'suit' | 'sans' | 'misere' | 'pass';
export type ContractLevel = 6 | 7 | 8 | 9 | 10;

export interface Contract {
  type: ContractType;
  level?: ContractLevel;
  suit?: Suit;
  bidValue: number;
}

export type GamePhase =
  | 'lobby'
  | 'bidding'
  | 'talon'
  | 'discarding'
  | 'whisting'
  | 'open_choice'
  | 'playing'
  | 'raspasovka'
  | 'hand_end'
  | 'game_over';

export interface PlayerScore {
  bulletEntries: number[];
  pool: number;
  whistFromLeft: number;
  whistFromRight: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  seatIndex: number;
  cardCount: number;
  score: PlayerScore;
  connected: boolean;
}

export type WhistChoice = 'whist' | 'pass';
export type OpenChoice = 'open' | 'closed';

export interface TrickCard {
  seat: number;
  card: Card;
}

export interface PlayerScoreDelta {
  seat: number;
  bulletDelta: number;
  poolDelta: number;
  whistLeftDelta: number;
  whistRightDelta: number;
}

export interface HandResult {
  phase: 'normal' | 'raspasovka';
  declarer: number | null;
  contract: Contract | null;
  made: boolean | null;
  tricksWon: number[];
  scoreDeltas: PlayerScoreDelta[];
}

export interface ClientGameState {
  phase: GamePhase;
  myHand: Card[];
  mySeat: number;
  players: PlayerPublic[];
  dealer: number;
  activeSeat: number;
  talon: Card[] | null;
  currentBid: Contract | null;
  bidder: number | null;
  bids: (Contract | null)[];
  whistChoices: (WhistChoice | null)[];
  openPlay: boolean;
  openCards: Card[] | null;
  currentTrick: TrickCard[];
  trickLeader: number;
  tricksWon: number[];
  bulletSize: number;
  handNumber: number;
  handResult: HandResult | null;
}
