export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Bid value index (for ordering): 6♠=0, 6♣=1, 6♦=2, 6♥=3, 6sans=4,
// misere=5, 7♠=6, 7♣=7 ... 10sans=24
export type ContractType = 'suit' | 'sans' | 'misere' | 'pass';
export type ContractLevel = 6 | 7 | 8 | 9 | 10;

export interface Contract {
  type: ContractType;
  level?: ContractLevel; // undefined for misere/pass
  suit?: Suit;           // only for 'suit' type
  bidValue: number;      // numeric ordering value
}

export type GamePhase =
  | 'lobby'
  | 'bidding'
  | 'talon'        // winner picks up 2 talon cards
  | 'discarding'   // winner discards 2 cards
  | 'whisting'     // opponents choose whist/pass
  | 'open_choice'  // the one who whisted chooses open/closed
  | 'playing'
  | 'raspasovka'   // all passed — take as few tricks as possible
  | 'hand_end'     // show scoring summary before next hand
  | 'game_over';

export interface BulletEntry {
  // Score entered in the bullet for this hand
  declarer: number | null;
  pool: number;   // penalty added to гора
  whistScore: number; // points earned from whistin
}

export interface PlayerScore {
  bulletEntries: number[]; // each hand's declared score (upper part of bullet)
  pool: number;            // accumulated penalty (гора)
  whistFromLeft: number;   // whist points received from left neighbor's declarations
  whistFromRight: number;  // whist points received from right neighbor
}

export interface PlayerPublic {
  id: string;
  name: string;
  seatIndex: number;
  cardCount: number;
  score: PlayerScore;
  connected: boolean;
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
}

export type WhistChoice = 'whist' | 'pass';
export type OpenChoice = 'open' | 'closed';

export interface TrickCard {
  seat: number;
  card: Card;
}

// What the server sends to each client (their own hand is included)
export interface ClientGameState {
  phase: GamePhase;
  myHand: Card[];         // only this player's cards
  mySeat: number;
  players: PlayerPublic[];
  dealer: number;
  activeSeat: number;     // whose turn it is

  talon: Card[] | null;   // revealed only when appropriate

  currentBid: Contract | null;
  bidder: number | null;
  bids: (Contract | null)[]; // indexed by seat, null = not yet bid

  whistChoices: (WhistChoice | null)[];
  openPlay: boolean;
  openCards: Card[] | null; // the "open" hand in open play, null otherwise

  currentTrick: TrickCard[];
  trickLeader: number;
  tricksWon: number[];       // indexed by seat

  bulletSize: number;
  handNumber: number;

  // Populated at hand_end
  handResult: HandResult | null;
}

export interface HandResult {
  phase: 'normal' | 'raspasovka';
  declarer: number | null;
  contract: Contract | null;
  made: boolean | null;
  tricksWon: number[];
  scoreDeltas: PlayerScoreDelta[];
}

export interface PlayerScoreDelta {
  seat: number;
  bulletDelta: number;
  poolDelta: number;
  whistLeftDelta: number;
  whistRightDelta: number;
}

// ---- Socket.io event payloads ----

export interface JoinPayload {
  name: string;
}

export interface BidPayload {
  contract: Omit<Contract, 'bidValue'>;
}

export interface DiscardPayload {
  cards: Card[]; // exactly 2 cards
}

export interface WhistPayload {
  choice: WhistChoice;
}

export interface OpenChoicePayload {
  choice: OpenChoice;
}

export interface PlayCardPayload {
  card: Card;
}

export interface SettingsPayload {
  bulletSize: number;
}
