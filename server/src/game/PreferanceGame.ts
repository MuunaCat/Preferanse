import {
  Card, Contract, GamePhase, PlayerPublic, PlayerScore,
  ClientGameState, HandResult, PlayerScoreDelta,
  WhistChoice, OpenChoice, TrickCard,
} from '../types';
import { deal } from './Deck';
import { trickWinner, contractTrump, legalCards, cardsEqual } from './Card';
import { makeContract, makePass, contractScore, bidValue } from './Bidding';

interface InternalPlayer {
  id: string;
  name: string;
  seatIndex: number;
  hand: Card[];
  score: PlayerScore;
  connected: boolean;
}

export class PreferanceGame {
  private players: InternalPlayer[] = [];
  private phase: GamePhase = 'lobby';
  private dealer = 0;
  private activeSeat = 0; // seat whose action is awaited

  private talon: Card[] = [];
  private bids: (Contract | null)[] = [null, null, null];
  private passCount = 0;
  private currentBid: Contract | null = null;
  private bidder: number | null = null;
  private firstBidder = 0; // seat that starts bidding

  private whistChoices: (WhistChoice | null)[] = [null, null, null];
  private whistOrder: number[] = []; // seats in whist order (clockwise from bidder)
  private openPlay = false;
  private openSeat: number | null = null; // who plays open hand

  private currentTrick: TrickCard[] = [];
  private trickLeader = 0;
  private tricksWon = [0, 0, 0];
  private handNumber = 0;
  private handResult: HandResult | null = null;

  bulletSize: number = 10;

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

  removePlayer(id: string): void {
    const p = this.players.find(p => p.id === id);
    if (p) p.connected = false;
  }

  reconnectPlayer(oldId: string, newId: string): boolean {
    const p = this.players.find(p => p.id === oldId);
    if (!p) return false;
    p.id = newId;
    p.connected = true;
    return true;
  }

  getPlayer(id: string): InternalPlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  playerCount(): number {
    return this.players.length;
  }

  canStart(): boolean {
    return this.players.length === 3 && this.phase === 'lobby';
  }

  isHost(id: string): boolean {
    return this.players.length > 0 && this.players[0].id === id;
  }

  // ---- Game flow ----

  startGame(): void {
    this.handNumber = 0;
    this.dealer = 0;
    this.startHand();
  }

  private startHand(): void {
    this.handNumber++;
    const { hands, talon } = deal();
    for (let i = 0; i < 3; i++) {
      this.players[i].hand = hands[i];
    }
    this.talon = talon;
    this.bids = [null, null, null];
    this.passCount = 0;
    this.currentBid = null;
    this.bidder = null;
    this.whistChoices = [null, null, null];
    this.whistOrder = [];
    this.openPlay = false;
    this.openSeat = null;
    this.currentTrick = [];
    this.tricksWon = [0, 0, 0];
    this.handResult = null;

    // Bidding starts left of dealer
    this.firstBidder = (this.dealer + 1) % 3;
    this.activeSeat = this.firstBidder;
    this.phase = 'bidding';
  }

  placeBid(id: string, rawContract: Omit<Contract, 'bidValue'>): string | null {
    if (this.phase !== 'bidding') return 'Not in bidding phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    const contract = rawContract.type === 'pass' ? makePass() : makeContract(rawContract);

    if (contract.type !== 'pass' && this.currentBid && contract.bidValue <= this.currentBid.bidValue) {
      return 'Bid must be higher than current bid';
    }

    this.bids[p.seatIndex] = contract;

    if (contract.type === 'pass') {
      this.passCount++;
    } else {
      this.currentBid = contract;
      this.bidder = p.seatIndex;
      this.passCount = 0;
    }

    // Check if bidding ends:
    // - bidder made a bid and the other 2 passed (passCount >= 2 with a bidder)
    // - all 3 passed (raspasovka)
    const totalBids = this.bids.filter(b => b !== null).length;
    const allBid = totalBids === 3;
    const twoPassedAfterBid = this.bidder !== null && this.passCount >= 2;
    const allPassed = this.passCount === 3;

    if (allPassed || (allBid && !this.currentBid)) {
      // Raspasovka
      this.startRaspasovka();
      return null;
    }

    if (twoPassedAfterBid) {
      // Winner picks up talon
      this.activeSeat = this.bidder!;
      this.phase = 'talon';
      return null;
    }

    // Next bidder
    this.activeSeat = (this.activeSeat + 1) % 3;
    return null;
  }

  private startRaspasovka(): void {
    this.phase = 'raspasovka';
    // Leader is left of dealer
    this.trickLeader = (this.dealer + 1) % 3;
    this.activeSeat = this.trickLeader;
    this.currentTrick = [];
    this.tricksWon = [0, 0, 0];
  }

  // Player sees talon and must discard 2 cards
  getTalonForBidder(id: string): Card[] | string {
    if (this.phase !== 'talon') return 'Not in talon phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.bidder) return 'Not the bidder';
    // Give talon to bidder's hand
    p.hand = [...p.hand, ...this.talon];
    this.phase = 'discarding';
    return this.talon;
  }

  discardCards(id: string, cards: Card[]): string | null {
    if (this.phase !== 'discarding') return 'Not in discarding phase';
    if (cards.length !== 2) return 'Must discard exactly 2 cards';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.bidder) return 'Not the bidder';

    // Verify player has these cards
    for (const card of cards) {
      if (!p.hand.some(c => cardsEqual(c, card))) {
        return `Card not in hand: ${card.rank} of ${card.suit}`;
      }
    }

    // Remove discarded cards
    for (const card of cards) {
      const idx = p.hand.findIndex(c => cardsEqual(c, card));
      p.hand.splice(idx, 1);
    }
    this.talon = cards; // keep discards face-down

    // Move to whisting phase
    this.whistOrder = [(this.bidder! + 1) % 3, (this.bidder! + 2) % 3];
    this.activeSeat = this.whistOrder[0];
    this.phase = 'whisting';
    return null;
  }

  makeWhistChoice(id: string, choice: WhistChoice): string | null {
    if (this.phase !== 'whisting') return 'Not in whisting phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    this.whistChoices[p.seatIndex] = choice;

    const done = this.whistOrder.every(seat => this.whistChoices[seat] !== null);
    if (!done) {
      // Move to next in whist order
      const nextIdx = this.whistOrder.indexOf(p.seatIndex) + 1;
      this.activeSeat = this.whistOrder[nextIdx];
      return null;
    }

    // Both have decided
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');

    if (whisters.length === 0) {
      // Both passed — bidder plays alone (contrakt bez vzatok)
      this.startPlaying();
      return null;
    }

    if (whisters.length === 2) {
      // Both whist — closed, both play
      this.openPlay = false;
      this.startPlaying();
      return null;
    }

    // Exactly one whisted — they choose open/closed
    this.activeSeat = whisters[0];
    this.phase = 'open_choice';
    return null;
  }

  makeOpenChoice(id: string, choice: OpenChoice): string | null {
    if (this.phase !== 'open_choice') return 'Not in open_choice phase';
    const p = this.getPlayer(id);
    if (!p || p.seatIndex !== this.activeSeat) return 'Not your turn';

    if (choice === 'open') {
      this.openPlay = true;
      this.openSeat = p.seatIndex;
      // The non-whisting opponent's cards are revealed; whister plays for both
    } else {
      this.openPlay = false;
    }

    this.startPlaying();
    return null;
  }

  private startPlaying(): void {
    // Lead starts left of dealer (or left of bidder for misere?)
    this.trickLeader = (this.dealer + 1) % 3;
    this.activeSeat = this.trickLeader;
    this.currentTrick = [];
    this.phase = 'playing';
  }

  playCard(id: string, card: Card): string | null {
    if (this.phase !== 'playing' && this.phase !== 'raspasovka') return 'Not in playing phase';
    const p = this.getPlayer(id);
    if (!p) return 'Player not found';

    // In open play, the whister plays for the open hand too
    const expectedSeat = this.activeSeat;
    const isOpenHandTurn = this.openPlay && this.openSeat !== null &&
      this.activeSeat !== this.openSeat && // it's the open hand's turn
      !this.whistChoices.some((c, s) => c === 'whist' && s !== (this.bidder ?? -1)); // someone is whistling

    // Determine who can actually act for this seat
    let actingPlayer = p;
    if (this.openPlay && this.openSeat !== null) {
      const whisterSeat = this.whistOrder.find(s => this.whistChoices[s] === 'whist')!;
      // whister plays cards for both seats
      if (this.activeSeat === this.openSeat || this.activeSeat === whisterSeat) {
        if (p.seatIndex !== whisterSeat) return 'Not your turn (open play)';
        actingPlayer = this.players[this.activeSeat]; // play from active seat's hand
      } else {
        if (p.seatIndex !== this.activeSeat) return 'Not your turn';
      }
    } else {
      if (p.seatIndex !== this.activeSeat) return 'Not your turn';
    }

    // Validate card is legal
    const ledSuit = this.currentTrick.length > 0 ? this.currentTrick[0].card.suit : null;
    const trump = this.currentBid ? contractTrump(this.currentBid) : null;
    const legal = legalCards(actingPlayer.hand, ledSuit, trump);
    if (!legal.some(c => cardsEqual(c, card))) return 'Illegal card play';

    // Remove card from hand
    const idx = actingPlayer.hand.findIndex(c => cardsEqual(c, card));
    actingPlayer.hand.splice(idx, 1);

    this.currentTrick.push({ seat: this.activeSeat, card });

    // Check if trick is complete (3 players, but in some cases 2 play — handled below)
    const tricksNeeded = this.getTrickSize();
    if (this.currentTrick.length === tricksNeeded) {
      this.completeTrick();
    } else {
      this.activeSeat = (this.activeSeat + 1) % 3;
      // Skip seats that aren't playing
      while (!this.isPlayingSeat(this.activeSeat)) {
        this.activeSeat = (this.activeSeat + 1) % 3;
      }
    }

    return null;
  }

  private getTrickSize(): number {
    // In closed play with 1 whister: 2 active players (bidder + 1 whister)? No — all 3 still play tricks
    // In "both passed" scenario: only bidder plays solo (10 tricks alone)
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');
    if (this.phase === 'playing' && whisters.length === 0) {
      return 1; // bidder plays alone, just counts own tricks
    }
    // In open play: whister plays for 2 hands, but still 3 cards per trick
    return 3;
  }

  private isPlayingSeat(seat: number): boolean {
    if (this.phase === 'raspasovka') return true;
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');
    if (whisters.length === 0) {
      // Solo play — only bidder
      return seat === this.bidder;
    }
    return true;
  }

  private completeTrick(): void {
    const trump = this.currentBid ? contractTrump(this.currentBid) : null;
    const winner = trickWinner(this.currentTrick, trump);
    this.tricksWon[winner]++;
    this.trickLeader = winner;
    this.currentTrick = [];

    // Check if hand is over (10 tricks total, or 1 trick for solo)
    const totalTricks = this.tricksWon.reduce((a, b) => a + b, 0);
    const maxTricks = this.getTrickSize() === 1 ? 10 : 10;

    if (totalTricks >= 10) {
      this.endHand();
    } else {
      this.activeSeat = winner;
    }
  }

  private endHand(): void {
    const result = this.calculateHandResult();
    this.handResult = result;
    this.applyScores(result);
    this.phase = 'hand_end';

    // Check if game is over (any player completed their bullet)
    const gameOver = this.players.some(p => this.isGameOver(p));
    if (gameOver) {
      this.phase = 'game_over';
    }
  }

  private calculateHandResult(): HandResult {
    if (this.phase === 'raspasovka' || !this.currentBid || this.bidder === null) {
      // Raspasovka scoring: each trick = penalty
      return {
        phase: 'raspasovka',
        declarer: null,
        contract: null,
        made: null,
        tricksWon: [...this.tricksWon],
        scoreDeltas: this.calcRaspasovkaDeltas(),
      };
    }

    const contract = this.currentBid;
    const declarer = this.bidder;
    const tricksNeeded = contract.type === 'misere' ? 0 : contract.level!;
    const declarerTricks = this.tricksWon[declarer];
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

  private calcRaspasovkaDeltas(): PlayerScoreDelta[] {
    // Each trick taken = 2 penalty points added to pool
    return this.players.map(p => ({
      seat: p.seatIndex,
      bulletDelta: 0,
      poolDelta: this.tricksWon[p.seatIndex] * 2,
      whistLeftDelta: 0,
      whistRightDelta: 0,
    }));
  }

  private calcNormalDeltas(declarer: number, contract: Contract, made: boolean): PlayerScoreDelta[] {
    const deltas: PlayerScoreDelta[] = this.players.map(p => ({
      seat: p.seatIndex,
      bulletDelta: 0,
      poolDelta: 0,
      whistLeftDelta: 0,
      whistRightDelta: 0,
    }));

    const score = contractScore(contract);
    const whisters = this.whistOrder.filter(s => this.whistChoices[s] === 'whist');

    if (made) {
      // Declarer scores the contract value in their bullet
      deltas[declarer].bulletDelta = score;

      // Whisters score 1 point per extra trick they prevented beyond required
      if (whisters.length > 0 && contract.type !== 'misere') {
        const tricksNeeded = contract.level!;
        const defenseTricks = whisters.reduce((sum, s) => sum + this.tricksWon[s], 0);
        const extraDefense = Math.max(0, defenseTricks - (10 - tricksNeeded));
        // Each extra defense trick = 1 whist point
        for (const ws of whisters) {
          const wOvertricks = Math.max(0, this.tricksWon[ws] - Math.floor((10 - tricksNeeded) / whisters.length));
          // Determine direction (left/right of declarer) to award whist points
          const isLeft = ws === (declarer + 1) % 3;
          if (isLeft) {
            deltas[ws].whistLeftDelta += this.tricksWon[ws];
          } else {
            deltas[ws].whistRightDelta += this.tricksWon[ws];
          }
        }
      }
    } else {
      // Declarer failed — add penalty to pool
      const penalty = score * 2;
      deltas[declarer].poolDelta = penalty;

      // Whisters score for tricks taken
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

  private applyScores(result: HandResult): void {
    for (const delta of result.scoreDeltas) {
      const p = this.players[delta.seat];
      if (delta.bulletDelta > 0) {
        p.score.bulletEntries.push(delta.bulletDelta);
      }
      p.score.pool += delta.poolDelta;
      p.score.whistFromLeft += delta.whistLeftDelta;
      p.score.whistFromRight += delta.whistRightDelta;
    }
  }

  private isGameOver(p: InternalPlayer): boolean {
    const totalBullet = p.score.bulletEntries.reduce((a, b) => a + b, 0);
    return totalBullet >= this.bulletSize;
  }

  nextHand(): void {
    if (this.phase !== 'hand_end') return;
    this.dealer = (this.dealer + 1) % 3;
    this.startHand();
  }

  // ---- State serialization ----

  getStateFor(playerId: string): ClientGameState {
    const me = this.getPlayer(playerId);
    const mySeat = me?.seatIndex ?? 0;

    let openCards: Card[] | null = null;
    if (this.openPlay && this.openSeat !== null && me) {
      // Show open hand to everyone
      openCards = this.players[this.openSeat].hand;
    }

    // Show talon when in talon or discarding phase (to bidder only)
    let visibleTalon: Card[] | null = null;
    if ((this.phase === 'talon' || this.phase === 'discarding') && mySeat === this.bidder) {
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

  getAllPlayerIds(): string[] {
    return this.players.map(p => p.id);
  }
}
