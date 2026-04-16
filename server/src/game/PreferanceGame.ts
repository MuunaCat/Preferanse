// This is the main game engine — it holds all the game state and runs the rules.
// Everything the server needs to know about the current game lives here.

import {
  Card, Contract, GamePhase, PlayerPublic, PlayerScore,
  ClientGameState, HandResult, PlayerScoreDelta,
  WhistChoice, OpenChoice, TrickCard,
} from '../types';
import { deal } from './Deck';
import { trickWinner, contractTrump, legalCards, cardsEqual } from './Card';
import { makeContract, makePass, contractScore, bidValue } from './Bidding';

// The full internal version of a player — includes their private hand
interface InternalPlayer {
  id: string;
  name: string;
  seatIndex: number;
  hand: Card[];
  score: PlayerScore;
  connected: boolean;
}

export class PreferanceGame {
  // Players currently in the game (max 3)
  private players: InternalPlayer[] = [];

  // What stage the game is in right now
  private phase: GamePhase = 'lobby';

  // Which seat is the dealer this hand
  private dealer = 0;

  // Which seat needs to take an action right now
  private activeSeat = 0;

  // The 2 face-down cards set aside before the hand
  private talon: Card[] = [];

  // What each player bid (null = hasn't bid yet)
  private bids: (Contract | null)[] = [null, null, null];

  // How many players have passed since the last real bid
  private passCount = 0;

  // The highest bid placed so far
  private currentBid: Contract | null = null;

  // Which seat placed the highest bid
  private bidder: number | null = null;

  // Which seat opens the bidding (left of dealer)
  private firstBidder = 0;

  // What each opponent chose (whist = challenge the bidder, pass = sit out)
  private whistChoices: (WhistChoice | null)[] = [null, null, null];

  // The order in which opponents decide whether to whist
  private whistOrder: number[] = [];

  // True if the whisting player chose to play open (show their hand)
  private openPlay = false;

  // Which seat is playing with their hand shown to everyone
  private openSeat: number | null = null;

  // The cards played so far in the current trick
  private currentTrick: TrickCard[] = [];

  // Which seat led the current trick
  private trickLeader = 0;

  // How many tricks each seat has won this hand
  private tricksWon = [0, 0, 0];

  // Which hand number we're on (goes up each round)
  private handNumber = 0;

  // Score summary shown at the end of a hand (null during play)
  private handResult: HandResult | null = null;

  // The score target — game ends when any player reaches this
  bulletSize: number = 10;

  // ---- Player management ----

  // Adds a new player if there's still a seat open
  addPlayer(id: string, name: string): boolean {
    if (this.players.length >= 3) return false;
    const seatIndex = this.players.length;
    this.players.push({
      id, name, seatIndex,
      hand: [],
      score: { bulletEntries: [], pool: 0, whistFromLeft: 0, whistFromRight: 0 },
      connected: true,
    });
    return true;
  }

  // Marks a player as disconnected (keeps their seat)
  removePlayer(id: string): void {
    const p = this.players.find(p => p.id === id);
    if (p) p.connected = false;
  }

  // Updates a player's socket ID when they reconnect
  reconnectPlayer(oldId: string, newId: string): boolean {
    const p = this.players.find(p => p.id === oldId);
    if (!p) return false;
    p.id = newId;
    p.connected = true;
    return true;
  }

  // Finds a player by their socket ID
  getPlayer(id: string): InternalPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  playerCount(): number { return this.players.length; }

  // The game can only start when exactly 3 players are in the lobby
  canStart(): boolean {
    return this.players.length === 3 && this.phase === 'lobby';
  }

  // The host is always the first player who joined
  isHost(id: string): boolean {
    return this.players.length > 0 && this.players[0].id === id;
  }

  // ---- Game flow ----

  startGame(): void {
    this.handNumber = 0;
    this.dealer = 0;
    this.startHand();
  }

  // Resets everything and deals a new hand
  private startHand(): void {
    this.handNumber++;
    const { hands, talon } = deal();

    // Give each player their 10 cards
    for (let i = 0; i < 3; i++) {
      this.players[i].hand = hands[i];
    }

    // Reset all the per-hand state
    this.talon         = talon;
    this.bids          = [null, null, null];
    this.passCount     = 0;
    this.currentBid    = null;
    this.bidder        = null;
    this.whistChoices  = [null, null, null];
    this.whistOrder    = [];
    this.openPlay      = false;
    this.openSeat      = null;
    this.currentTrick  = [];
    this.tricksWon     = [0, 0, 0];
    this.handResult    = null;

    // Bidding starts left of dealer
    this.firstBidder = (this.dealer + 1) % 3;
    this.activeSeat  = this.firstBidder;
    this.phase       = 'bidding';
  }

  // Handles a player making a bid or passing
  placeBid(id: string, rawContract: Omit<Contract, 'bidValue'>): string | null {
    if (this.phase !== 'bidding') return 'Not in bidding phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    const contract = rawContract.type === 'pass' ? makePass() : makeContract(rawContract);

    // Make sure the new bid is actually higher than the current one
    if (contract.type !== 'pass' && this.currentBid && contract.bidValue <= this.currentBid.bidValue) {
      return 'Bid must be higher than current bid';
    }

    this.bids[p.seatIndex] = contract;

    if (contract.type === 'pass') {
      this.passCount++;
    } else {
      this.currentBid = contract;
      this.bidder     = p.seatIndex;
      this.passCount  = 0; // reset pass count after a real bid
    }

    // Figure out if bidding is over
    const totalBids        = this.bids.filter(b => b !== null).length;
    const allBid           = totalBids === 3;
    const twoPassedAfterBid = this.bidder !== null && this.passCount >= 2;
    const allPassed        = this.passCount === 3;

    if (allPassed || (allBid && !this.currentBid)) {
      // Everyone passed — play raspasovka instead
      this.startRaspasovka();
      return null;
    }

    if (twoPassedAfterBid) {
      // The bidder won — let them pick up the talon
      this.activeSeat = this.bidder!;
      this.phase = 'talon';
      return null;
    }

    // Move to the next player
    this.activeSeat = (this.activeSeat + 1) % 3;
    return null;
  }

  // Starts the raspasovka phase (everyone passed — now try to take as few tricks as possible)
  private startRaspasovka(): void {
    this.phase       = 'raspasovka';
    this.trickLeader = (this.dealer + 1) % 3; // play starts left of dealer
    this.activeSeat  = this.trickLeader;
    this.currentTrick = [];
    this.tricksWon    = [0, 0, 0];
  }

  // Gives the 2 talon cards to the winning bidder so they can see them
  getTalonForBidder(id: string): Card[] | string {
    if (this.phase !== 'talon') return 'Not in talon phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.bidder) return 'Not the bidder';

    p.hand    = [...p.hand, ...this.talon]; // add talon to their hand temporarily
    this.phase = 'talon_rebid';
    this.activeSeat = this.bidder!;
    return this.talon;
  }

  // After seeing the talon, the bidder can raise their bid or keep it the same
  confirmRebid(id: string, rawContract: Omit<Contract, 'bidValue'>): string | null {
    if (this.phase !== 'talon_rebid') return 'Not in rebid phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.bidder) return 'Not the bidder';

    if (rawContract.type !== 'pass') {
      const contract = makeContract(rawContract);
      if (this.currentBid && contract.bidValue < this.currentBid.bidValue) {
        return 'New bid must be at least as high as current bid';
      }
      this.currentBid = contract;
    }

    this.phase = 'discarding';
    return null;
  }

  // The bidder discards exactly 2 cards before play starts
  discardCards(id: string, cards: Card[]): string | null {
    if (this.phase !== 'discarding') return 'Not in discarding phase';
    if (cards.length !== 2) return 'Must discard exactly 2 cards';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.bidder) return 'Not the bidder';

    // Make sure the player actually has both of these cards
    for (const card of cards) {
      if (!p.hand.some(c => cardsEqual(c, card))) {
        return `Card not in hand: ${card.rank} of ${card.suit}`;
      }
    }

    // Remove the discarded cards from their hand
    for (const card of cards) {
      const idx = p.hand.findIndex(c => cardsEqual(c, card));
      p.hand.splice(idx, 1);
    }

    this.talon = cards; // store discards face-down (nobody sees them)

    // Move to the whisting phase — opponents decide whether to challenge the bidder
    this.whistOrder = [(this.bidder! + 1) % 3, (this.bidder! + 2) % 3];
    this.activeSeat = this.whistOrder[0];
    this.phase      = 'whisting';
    return null;
  }

  // An opponent decides to whist (challenge) or pass (sit out)
  makeWhistChoice(id: string, choice: WhistChoice): string | null {
    if (this.phase !== 'whisting') return 'Not in whisting phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    this.whistChoices[p.seatIndex] = choice;

    // Check if all opponents have decided
    const done = this.whistOrder.every(seat => this.whistChoices[seat] !== null);
    if (!done) {
      const nextIdx   = this.whistOrder.indexOf(p.seatIndex) + 1;
      this.activeSeat = this.whistOrder[nextIdx];
      return null;
    }

    // Both have decided — figure out what happens next
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');

    if (whisters.length === 0) {
      // Both passed — bidder plays alone
      this.startPlaying();
      return null;
    }

    if (whisters.length === 2) {
      // Both are whisting — closed play, everyone plays
      this.openPlay = false;
      this.startPlaying();
      return null;
    }

    // Exactly one player whisted — they get to choose open or closed
    this.activeSeat = whisters[0];
    this.phase      = 'open_choice';
    return null;
  }

  // The whister chooses whether to play open (show their hand) or closed
  makeOpenChoice(id: string, choice: OpenChoice): string | null {
    if (this.phase !== 'open_choice') return 'Not in open_choice phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    if (choice === 'open') {
      this.openPlay = true;
      this.openSeat = p.seatIndex;
    } else {
      this.openPlay = false;
    }

    this.startPlaying();
    return null;
  }

  // Moves the game into the card-playing phase
  private startPlaying(): void {
    this.trickLeader  = (this.dealer + 1) % 3; // play starts left of dealer
    this.activeSeat   = this.trickLeader;
    this.currentTrick = [];
    this.phase        = 'playing';
  }

  // A player plays a card from their hand
  playCard(id: string, card: Card): string | null {
    if (this.phase !== 'playing' && this.phase !== 'raspasovka') return 'Not in playing phase';
    const p = this.getPlayer(id);
    if (!p) return 'Player not found';

    // In open play, the whister controls the open hand too
    let actingPlayer = p;
    if (this.openPlay && this.openSeat !== null) {
      const whisterSeat = this.whistOrder.find(s => this.whistChoices[s] === 'whist')!;
      if (this.activeSeat === this.openSeat || this.activeSeat === whisterSeat) {
        if (p.seatIndex !== whisterSeat) return 'Not your turn (open play)';
        actingPlayer = this.players[this.activeSeat]; // play from the active seat's hand
      } else {
        if (p.seatIndex !== this.activeSeat) return 'Not your turn';
      }
    } else {
      if (p.seatIndex !== this.activeSeat) return 'Not your turn';
    }

    // Check that the chosen card is actually a legal play
    const ledSuit = this.currentTrick.length > 0 ? this.currentTrick[0].card.suit : null;
    const trump   = this.currentBid ? contractTrump(this.currentBid) : null;
    const legal   = legalCards(actingPlayer.hand, ledSuit, trump);
    if (!legal.some(c => cardsEqual(c, card))) return 'Illegal card play';

    // Remove the card from the player's hand
    const idx = actingPlayer.hand.findIndex(c => cardsEqual(c, card));
    actingPlayer.hand.splice(idx, 1);

    this.currentTrick.push({ seat: this.activeSeat, card });

    // Check if the trick is complete
    if (this.currentTrick.length === this.getTrickSize()) {
      this.completeTrick();
    } else {
      // Move to the next player who is actually playing
      this.activeSeat = (this.activeSeat + 1) % 3;
      while (!this.isPlayingSeat(this.activeSeat)) {
        this.activeSeat = (this.activeSeat + 1) % 3;
      }
    }

    return null;
  }

  // Returns how many cards need to be played before a trick is complete
  private getTrickSize(): number {
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');
    if (this.phase === 'playing' && whisters.length === 0) {
      return 1; // bidder is playing solo — each "trick" is just 1 card
    }
    return 3; // normal play — all 3 seats play one card per trick
  }

  // Returns whether a seat is actively playing this hand
  private isPlayingSeat(seat: number): boolean {
    if (this.phase === 'raspasovka') return true; // everyone plays in raspasovka
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');
    if (whisters.length === 0) {
      return seat === this.bidder; // solo play — only the bidder plays
    }
    return true;
  }

  // Finishes a trick, figures out who won it, and starts the next one
  private completeTrick(): void {
    const trump  = this.currentBid ? contractTrump(this.currentBid) : null;
    const winner = trickWinner(this.currentTrick, trump);
    this.tricksWon[winner]++;
    this.trickLeader  = winner;
    this.currentTrick = [];

    // Check if all 10 tricks have been played
    const totalTricks = this.tricksWon.reduce((a, b) => a + b, 0);
    if (totalTricks >= 10) {
      this.endHand();
    } else {
      this.activeSeat = winner; // winner leads the next trick
    }
  }

  // Called when all 10 tricks have been played
  private endHand(): void {
    const result    = this.calculateHandResult();
    this.handResult = result;
    this.applyScores(result);
    this.phase      = 'hand_end';

    // Check if someone has reached the score target
    if (this.players.some(p => this.isGameOver(p))) {
      this.phase = 'game_over';
    }
  }

  // Calculates how each player's score should change based on what happened
  private calculateHandResult(): HandResult {
    if (this.phase === 'raspasovka' || !this.currentBid || this.bidder === null) {
      // Raspasovka: each trick taken is a penalty
      return {
        phase: 'raspasovka',
        declarer: null,
        contract: null,
        made: null,
        tricksWon: [...this.tricksWon],
        scoreDeltas: this.calcRaspasovkaDeltas(),
      };
    }

    const contract     = this.currentBid;
    const declarer     = this.bidder;
    const tricksNeeded = contract.type === 'misere' ? 0 : contract.level!;
    const declarerTricks = this.tricksWon[declarer];

    // Misere: bidder wins by taking 0 tricks; others win by making them take any
    const made = contract.type === 'misere'
      ? declarerTricks === 0
      : declarerTricks >= tricksNeeded;

    return {
      phase: 'normal',
      declarer,
      contract,
      made,
      tricksWon: [...this.tricksWon],
      scoreDeltas: this.calcNormalDeltas(declarer, contract, made),
    };
  }

  // Scoring for raspasovka: each trick taken = 2 penalty points added to pool
  private calcRaspasovkaDeltas(): PlayerScoreDelta[] {
    return this.players.map(p => ({
      seat: p.seatIndex,
      bulletDelta: 0,
      poolDelta: this.tricksWon[p.seatIndex] * 2, // 2 penalty per trick
      whistLeftDelta: 0,
      whistRightDelta: 0,
    }));
  }

  // Scoring for a normal hand
  private calcNormalDeltas(declarer: number, contract: Contract, made: boolean): PlayerScoreDelta[] {
    const deltas: PlayerScoreDelta[] = this.players.map(p => ({
      seat: p.seatIndex,
      bulletDelta: 0,
      poolDelta: 0,
      whistLeftDelta: 0,
      whistRightDelta: 0,
    }));

    const score    = contractScore(contract);
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');

    if (made) {
      // Bidder earns the contract value in their bullet
      deltas[declarer].bulletDelta = score;

      // Whisters also earn whist points for tricks they took
      if (whisters.length > 0 && contract.type !== 'misere') {
        for (const ws of whisters) {
          const isLeft = ws === (declarer + 1) % 3;
          if (isLeft) {
            deltas[ws].whistLeftDelta += this.tricksWon[ws];
          } else {
            deltas[ws].whistRightDelta += this.tricksWon[ws];
          }
        }
      }
    } else {
      // Bidder failed — add double the contract value as a penalty to their pool
      deltas[declarer].poolDelta = score * 2;

      // Whisters still earn points for tricks they took
      for (const ws of whisters) {
        const isLeft = ws === (declarer + 1) % 3;
        if (isLeft) {
          deltas[ws].whistLeftDelta += this.tricksWon[ws];
        } else {
          deltas[ws].whistRightDelta += this.tricksWon[ws];
        }
      }
    }

    return deltas;
  }

  // Actually writes the score changes into each player's score
  private applyScores(result: HandResult): void {
    for (const delta of result.scoreDeltas) {
      const p = this.players[delta.seat];
      if (delta.bulletDelta > 0) {
        p.score.bulletEntries.push(delta.bulletDelta); // add to the bullet
      }
      p.score.pool           += delta.poolDelta;
      p.score.whistFromLeft  += delta.whistLeftDelta;
      p.score.whistFromRight += delta.whistRightDelta;
    }
  }

  // Returns true if this player has reached the score target
  private isGameOver(p: InternalPlayer): boolean {
    const totalBullet = p.score.bulletEntries.reduce((a, b) => a + b, 0);
    return totalBullet >= this.bulletSize;
  }

  // Moves to the next hand (called when everyone clicks "Next Hand")
  nextHand(): void {
    if (this.phase !== 'hand_end') return;
    this.dealer = (this.dealer + 1) % 3; // dealer rotates clockwise
    this.startHand();
  }

  // ---- Sending state to clients ----

  // Builds the game state object to send to a specific player
  // Each player gets their own version (so only they see their hand)
  getStateFor(playerId: string): ClientGameState {
    const me     = this.getPlayer(playerId);
    const mySeat = me?.seatIndex ?? 0;

    // In open play, show the open hand's cards to everyone
    let openCards: Card[] | null = null;
    if (this.openPlay && this.openSeat !== null && me) {
      openCards = this.players[this.openSeat].hand;
    }

    // Show the talon during pickup and rebid phases; hide it otherwise
    let visibleTalon: Card[] | null = null;
    if (this.phase === 'talon' || this.phase === 'talon_rebid') {
      visibleTalon = this.talon;
    }

    return {
      phase: this.phase,
      myHand: me?.hand ?? [],
      mySeat,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        cardCount: p.hand.length,
        score: p.score,
        connected: p.connected,
      })),
      dealer: this.dealer,
      activeSeat: this.activeSeat,
      talon: visibleTalon,
      currentBid: this.currentBid,
      bidder: this.bidder,
      bids: this.bids,
      whistChoices: this.whistChoices,
      openPlay: this.openPlay,
      openCards,
      currentTrick: this.currentTrick,
      trickLeader: this.trickLeader,
      tricksWon: [...this.tricksWon],
      bulletSize: this.bulletSize,
      handNumber: this.handNumber,
      handResult: this.handResult,
    };
  }

  // Returns all connected player IDs (used to broadcast state updates)
  getAllPlayerIds(): string[] {
    return this.players.map(p => p.id);
  }
}
