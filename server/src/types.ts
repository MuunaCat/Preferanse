// This file defines all the types (shapes of data) used across the game.
// Think of types as blueprints — they describe what information each thing contains.

// A card has a suit (like hearts) and a rank (like K or 7)
export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Bid order from lowest to highest:
// 6♠=0, 6♣=1, 6♦=2, 6♥=3, 6sans=4,
// misere=5,
// 7♠=6, 7♣=7 ... all the way up to 10sans=24
export type ContractType = 'suit' | 'sans' | 'misere' | 'pass';
export type ContractLevel = 6 | 7 | 8 | 9 | 10; // the number part of a bid like "7 hearts"

// A contract is what a player bids (e.g. "I'll take 7 tricks with hearts as trump")
export interface Contract {
  type: ContractType;
  level?: ContractLevel;  // only needed for suit/sans bids
  suit?: Suit;            // only needed when bidding a suit
  bidValue: number;       // numeric rank so we can compare bids easily
}

// All the different stages a game can be in
export type GamePhase =
  | 'lobby'           // waiting for players to join
  | 'bidding'         // players are making bids
  | 'talon'           // the winner gets to see the 2 hidden talon cards
  | 'talon_rebid'     // after seeing the talon, the bidder can raise their bid
  | 'discarding'      // the bidder discards 2 cards from their hand
  | 'whisting'        // the other players decide whether to whist (challenge) or pass
  | 'open_choice'     // the whister chooses to play open or closed
  | 'playing'         // main card-playing phase
  | 'raspasovka'      // everyone passed the bidding — now try to take as few tricks as possible
  | 'hand_end'        // show the scores before starting the next hand
  | 'game_over';      // someone reached the target score

// A single row in the scoring table for one hand
export interface BulletEntry {
  declarer: number | null; // how many tricks the bidder declared
  pool: number;            // penalty added to their pool (баuda) this hand
  whistScore: number;      // whist points earned this hand
}

// The running score for one player
export interface PlayerScore {
  bulletEntries: number[]; // list of points earned each hand (upper bullet)
  pool: number;            // total accumulated penalty (баuda / гора)
  whistFromLeft: number;   // whist points from playing against left neighbor
  whistFromRight: number;  // whist points from playing against right neighbor
}

// Info about a player that everyone can see
export interface PlayerPublic {
  id: string;
  name: string;
  seatIndex: number;  // which seat they're sitting in (0, 1, or 2)
  cardCount: number;  // how many cards they're holding (but not which ones)
  score: PlayerScore;
  connected: boolean; // false if they disconnected
}

// Same as PlayerPublic but also includes their actual cards (only sent to that player)
export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
}

export type WhistChoice = 'whist' | 'pass'; // did the player choose to whist or pass?
export type OpenChoice = 'open' | 'closed'; // did the whister choose open or closed play?

// One card played in the current trick, along with who played it
export interface TrickCard {
  seat: number;
  card: Card;
}

// The game state the server sends to each client (each player gets their own version)
export interface ClientGameState {
  phase: GamePhase;
  myHand: Card[];         // only this player's private cards
  mySeat: number;
  players: PlayerPublic[];
  dealer: number;         // which seat is the dealer this hand
  activeSeat: number;     // whose turn it is right now

  talon: Card[] | null;   // the 2 face-down cards (only shown when relevant)

  currentBid: Contract | null;          // the highest bid so far
  bidder: number | null;                // which seat made the highest bid
  bids: (Contract | null)[];            // what each player bid (null = hasn't bid yet)

  whistChoices: (WhistChoice | null)[];
  openPlay: boolean;                    // true if someone chose to play open
  openCards: Card[] | null;             // the open hand's cards (visible to everyone)

  currentTrick: TrickCard[];   // cards played so far in this trick
  trickLeader: number;         // who led this trick
  tricksWon: number[];         // how many tricks each seat has won

  bulletSize: number;    // the score target (game ends when someone reaches this)
  handNumber: number;    // which hand we're on

  handResult: HandResult | null; // filled in at the end of a hand
}

// Summary of what happened at the end of a hand
export interface HandResult {
  phase: 'normal' | 'raspasovka';
  declarer: number | null;    // which seat was the bidder (null for raspasovka)
  contract: Contract | null;  // what they bid
  made: boolean | null;       // did they make their contract?
  tricksWon: number[];
  scoreDeltas: PlayerScoreDelta[]; // how each player's score changed
}

// How one player's score changed after a hand
export interface PlayerScoreDelta {
  seat: number;
  bulletDelta: number;       // points added to their bullet (positive = good)
  poolDelta: number;         // penalty added to their pool (positive = bad)
  whistLeftDelta: number;    // whist points earned from left side
  whistRightDelta: number;   // whist points earned from right side
}

// ---- Messages sent between the browser and the server via Socket.io ----

export interface JoinPayload {
  name: string; // the player's chosen name
}

export interface BidPayload {
  contract: Omit<Contract, 'bidValue'>; // the bid the player wants to make
}

export interface DiscardPayload {
  cards: Card[]; // exactly 2 cards to discard
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
  bulletSize: number; // the score target the host set
}

export interface ChatPayload {
  text: string;
}

export interface ConfirmRebidPayload {
  contract: Omit<Contract, 'bidValue'>; // pass = keep current bid unchanged
}
