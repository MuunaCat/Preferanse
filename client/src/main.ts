import { io, Socket } from 'socket.io-client';
import type { ClientGameState, Card, Contract, WhistChoice, OpenChoice } from './types';
import { contractLabel, bidValue, makeContractRaw } from './bidding';
import { cardLabel, suitClass, sortHand } from './cards';

const socket: Socket = io();

// ---- State ----
let state: ClientGameState | null = null;
let mySocketId: string | null = null;
let selectedCards: Card[] = [];

// ---- Elements ----
const $lobby = document.getElementById('lobby')!;
const $game = document.getElementById('game')!;
const $nameInput = document.getElementById('name-input') as HTMLInputElement;
const $joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const $startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const $playerList = document.getElementById('player-list')!;
const $settingsArea = document.getElementById('settings-area')!;
const $bulletSizeInput = document.getElementById('bullet-size-input') as HTMLInputElement;
const $setSettingsBtn = document.getElementById('set-settings-btn') as HTMLButtonElement;
const $tablePlayers = document.getElementById('table-players')!;
const $trickArea = document.getElementById('trick-area')!;
const $myHand = document.getElementById('my-hand')!;
const $actionPanel = document.getElementById('action-panel')!;
const $status = document.getElementById('status')!;
const $handNum = document.getElementById('hand-num')!;
const $bulletSizeDisplay = document.getElementById('bullet-size-display')!;
const $currentBidDisplay = document.getElementById('current-bid-display')!;
const $bulletHeader = document.getElementById('bullet-header')!;
const $bulletBody = document.getElementById('bullet-body')!;
const $talonArea = document.getElementById('talon-area')!;
const $handResult = document.getElementById('hand-result')!;
const $resultTitle = document.getElementById('result-title')!;
const $resultHeader = document.getElementById('result-header')!;
const $resultBody = document.getElementById('result-body')!;
const $nextHandBtn = document.getElementById('next-hand-btn') as HTMLButtonElement;
const $errorMsgLobby = document.getElementById('error-msg')!;
const $errorMsgGame = document.querySelectorAll('#game #error-msg')[0] as HTMLElement;

// ---- Socket events ----
socket.on('connect', () => {
  mySocketId = socket.id ?? null;
});

socket.on('game:state', (s: ClientGameState) => {
  state = s;
  render();
});

socket.on('game:error', (msg: string) => {
  showError(msg);
});

socket.on('chat:message', (entry: { name: string; text: string }) => {
  const $msgs = document.getElementById('chat-messages')!;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<span class="chat-name">${entry.name}:</span> ${entry.text}`;
  $msgs.appendChild(div);
  $msgs.scrollTop = $msgs.scrollHeight;
});

// ---- Chat controls ----
document.getElementById('chat-send-btn')!.addEventListener('click', sendChat);
document.getElementById('chat-input')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});
function sendChat() {
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat:message', { text });
  input.value = '';
}

// ---- Rules controls ----
document.getElementById('rules-btn')!.addEventListener('click', () => {
  document.getElementById('rules-modal')!.classList.add('show');
});
document.getElementById('rules-close-btn')!.addEventListener('click', () => {
  document.getElementById('rules-modal')!.classList.remove('show');
});

// ---- Lobby controls ----
$joinBtn.addEventListener('click', () => {
  const name = $nameInput.value.trim();
  if (!name) { showError('Enter a name'); return; }
  socket.emit('lobby:join', { name });
});

$setSettingsBtn.addEventListener('click', () => {
  const size = parseInt($bulletSizeInput.value);
  socket.emit('lobby:setSettings', { bulletSize: size });
});

$startBtn.addEventListener('click', () => {
  socket.emit('lobby:start');
});

$nextHandBtn.addEventListener('click', () => {
  socket.emit('game:nextHand');
  $handResult.classList.remove('show');
});

// ---- Render ----
function render(): void {
  if (!state) return;
  clearError();

  if (state.phase === 'lobby') {
    renderLobby();
    return;
  }

  $lobby.style.display = 'none';
  $game.style.display = 'flex';
  $game.style.flexDirection = 'column';
  $game.style.gap = '12px';

  renderInfoBar();
  renderTablePlayers();
  renderTalon();
  renderTrick();
  renderHand();
  renderActionPanel();
  renderBullet();

  if (state.phase === 'hand_end' || state.phase === 'game_over') {
    renderHandResult();
  }
}

function renderLobby(): void {
  $lobby.style.display = 'flex';
  $game.style.display = 'none';

  const players = state!.players;
  $playerList.innerHTML = players.map((p, i) => `
    <li>${p.name} ${i === 0 ? '<span class="badge">Host</span>' : ''}</li>
  `).join('');

  const joined = players.some(p => p.id === mySocketId);
  $joinBtn.style.display = joined ? 'none' : '';
  $nameInput.style.display = joined ? 'none' : '';

  const isHost = players.length > 0 && players[0].id === mySocketId;
  $settingsArea.classList.toggle('hidden', !isHost);
  if (isHost) $bulletSizeInput.value = String(state!.bulletSize);

  $startBtn.disabled = players.length < 3 || !isHost;
  $startBtn.textContent = players.length < 3
    ? `Start Game (${players.length}/3 players)`
    : 'Start Game';
}

function renderInfoBar(): void {
  $handNum.textContent = String(state!.handNumber);
  $bulletSizeDisplay.textContent = String(state!.bulletSize);
  $currentBidDisplay.textContent = state!.currentBid ? contractLabel(state!.currentBid) : '—';
}

function renderTablePlayers(): void {
  const { players, dealer, activeSeat, mySeat } = state!;
  $tablePlayers.innerHTML = players.map(p => {
    const isActive = p.seatIndex === activeSeat;
    const isDealer = p.seatIndex === dealer;
    const isMe = p.seatIndex === mySeat;
    return `
      <div class="player-box ${isActive ? 'active' : ''}">
        <div class="pname">
          ${isMe ? '★ ' : ''}${p.name}
          ${isDealer ? '<span class="dealer-marker">[D]</span>' : ''}
        </div>
        <div class="pcards">${p.cardCount} cards</div>
        <div class="pscore">
          Taškai: ${p.score.bulletEntries.reduce((a, b) => a + b, 0)} /
          Pool: ${p.score.pool} /
          WK: ${p.score.whistFromLeft} WD: ${p.score.whistFromRight}
        </div>
        ${(state!.phase === 'playing' || state!.phase === 'raspasovka')
          ? `<div class="pcards" style="color:var(--accent);font-size:0.95rem;margin-top:4px">Home: ${state!.tricksWon[p.seatIndex]}</div>`
          : ''}
      </div>
    `;
  }).join('');
}

function renderTalon(): void {
  if (!state!.talon) { $talonArea.innerHTML = ''; return; }
  const phase = state!.phase;
  const label = phase === 'talon_rebid'
    ? 'Bidder picked up:'
    : phase === 'talon'
      ? 'Talon (open):'
      : 'Talon:';
  $talonArea.innerHTML = `<span style="color:var(--accent);margin-right:10px;font-size:0.95rem">${label}</span>` +
    state!.talon.map(c => `<div class="card ${suitClass(c)}">${cardLabel(c)}</div>`).join('');
}

function renderTrick(): void {
  const { currentTrick, players } = state!;
  if (currentTrick.length === 0) {
    $trickArea.innerHTML = '<span style="color:#666">Waiting for trick...</span>';
    return;
  }
  $trickArea.innerHTML = currentTrick.map(tc => {
    const p = players.find(pl => pl.seatIndex === tc.seat);
    return `
      <div style="text-align:center">
        <div style="font-size:0.75rem;margin-bottom:2px;color:#aaa">${p?.name ?? '?'}</div>
        <div class="card in-trick ${suitClass(tc.card)}">${cardLabel(tc.card)}</div>
      </div>
    `;
  }).join('');
}

function renderHand(): void {
  const { phase, activeSeat, mySeat, currentBid, openCards, openPlay } = state!;
  const myHand = sortHand(state!.myHand);

  // Show open cards separately if applicable
  let openSection = '';
  if (openPlay && openCards && openCards.length > 0) {
    const openOwner = state!.players.find(p =>
      state!.whistChoices[p.seatIndex] !== 'whist' && p.seatIndex !== state!.bidder
    );
    openSection = `<div style="margin-bottom:6px;color:var(--accent);font-size:0.8rem">
      ${openOwner?.name ?? 'Open'} hand (open play):
    </div>` + openCards.map(c =>
      `<div class="card disabled ${suitClass(c)}">${cardLabel(c)}</div>`
    ).join('');
  }

  const isMyTurn = activeSeat === mySeat;
  const canPlay = isMyTurn && (phase === 'playing' || phase === 'raspasovka');

  $myHand.innerHTML = openSection + myHand.map(c => {
    const sel = selectedCards.some(s => s.suit === c.suit && s.rank === c.rank);
    const disabled = !canPlay && phase !== 'discarding';
    return `<div class="card ${suitClass(c)} ${disabled ? 'disabled' : ''} ${sel ? 'selected' : ''}"
      data-suit="${c.suit}" data-rank="${c.rank}">${cardLabel(c)}</div>`;
  }).join('');

  // Attach click handlers for playable cards
  $myHand.querySelectorAll('.card:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => {
      const card: Card = {
        suit: el.getAttribute('data-suit') as Card['suit'],
        rank: el.getAttribute('data-rank') as Card['rank'],
      };
      if (canPlay) {
        socket.emit('game:playCard', { card });
      } else if (phase === 'discarding' && activeSeat === mySeat) {
        toggleSelectCard(card);
      }
    });
  });
}

function toggleSelectCard(card: Card): void {
  const idx = selectedCards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
  if (idx >= 0) {
    selectedCards.splice(idx, 1);
  } else if (selectedCards.length < 2) {
    selectedCards.push(card);
  }
  renderHand();
  renderActionPanel(); // update discard button
}

function renderActionPanel(): void {
  const { phase, activeSeat, mySeat, currentBid, bids, whistChoices } = state!;
  $actionPanel.innerHTML = '';

  const isMyTurn = activeSeat === mySeat;

  if (phase === 'bidding' && isMyTurn) {
    renderBidPanel();
  } else if (phase === 'talon' && isMyTurn) {
    $actionPanel.innerHTML = '<button id="take-talon-btn" style="font-size:1.05rem;padding:12px 28px">Pick up talon</button>';
    document.getElementById('take-talon-btn')!.addEventListener('click', () => {
      socket.emit('game:takeTalon');
    });
  } else if (phase === 'talon' && !isMyTurn) {
    const bidderName = state!.players.find(p => p.seatIndex === state!.bidder)?.name ?? '...';
    $actionPanel.innerHTML = `<p style="color:#aaa">Waiting for ${bidderName} to pick up the talon...</p>`;
  } else if (phase === 'talon_rebid' && isMyTurn) {
    renderRebidPanel();
  } else if (phase === 'talon_rebid' && !isMyTurn) {
    const bidderName = state!.players.find(p => p.seatIndex === state!.bidder)?.name ?? '...';
    $actionPanel.innerHTML = `<p style="color:#aaa">Waiting for ${bidderName} to confirm their bid...</p>`;
  } else if (phase === 'discarding' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">Select 2 cards to discard</p>
      <button id="discard-btn" ${selectedCards.length !== 2 ? 'disabled' : ''}>Discard selected</button>
    `;
    document.getElementById('discard-btn')?.addEventListener('click', () => {
      if (selectedCards.length !== 2) return;
      socket.emit('game:discard', { cards: selectedCards });
      selectedCards = [];
    });
  } else if (phase === 'whisting' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">Whist or pass?</p>
      <div class="action-row">
        <button id="whist-btn">Whist</button>
        <button id="pass-w-btn">Pass</button>
      </div>
    `;
    document.getElementById('whist-btn')!.addEventListener('click', () => {
      socket.emit('game:whist', { choice: 'whist' });
    });
    document.getElementById('pass-w-btn')!.addEventListener('click', () => {
      socket.emit('game:whist', { choice: 'pass' });
    });
  } else if (phase === 'open_choice' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">Play open or closed?</p>
      <div class="action-row">
        <button id="open-btn">Open</button>
        <button id="closed-btn">Closed</button>
      </div>
    `;
    document.getElementById('open-btn')!.addEventListener('click', () => {
      socket.emit('game:openChoice', { choice: 'open' });
    });
    document.getElementById('closed-btn')!.addEventListener('click', () => {
      socket.emit('game:openChoice', { choice: 'closed' });
    });
  } else if (phase === 'playing' && isMyTurn) {
    $actionPanel.innerHTML = '<p style="color:var(--accent)">Your turn — click a card to play</p>';
  } else if (phase === 'raspasovka' && isMyTurn) {
    $actionPanel.innerHTML = '<p style="color:var(--accent)">Raspasovka — try to take as few tricks as possible</p>';
  } else {
    const active = state!.players.find(p => p.seatIndex === activeSeat);
    $actionPanel.innerHTML = `<p style="color:#aaa">Waiting for ${active?.name ?? '...'}...</p>`;
  }
}

function buildBidGrid(minValue: number, emitEvent: string): string {
  const suits = ['spades', 'clubs', 'diamonds', 'hearts'] as const;
  const suitSymbols: Record<string, string> = { spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥' };

  let html = `<div id="bid-grid">`;
  for (let level = 6; level <= 10; level++) {
    for (const suit of suits) {
      const contract = makeContractRaw({ type: 'suit', level: level as 6|7|8|9|10, suit });
      const disabled = contract.bidValue < minValue;
      const cls = (suit === 'diamonds' || suit === 'hearts') ? 'bid-red' : '';
      html += `<button class="bid-btn ${cls}" ${disabled ? 'disabled' : ''} data-bid='${JSON.stringify(contract)}' data-event="${emitEvent}">${level}${suitSymbols[suit]}</button>`;
    }
    const sansContract = makeContractRaw({ type: 'sans', level: level as 6|7|8|9|10 });
    const sansDisabled = sansContract.bidValue < minValue;
    html += `<button class="bid-btn bid-blue" ${sansDisabled ? 'disabled' : ''} data-bid='${JSON.stringify(sansContract)}' data-event="${emitEvent}">${level} NS</button>`;
  }
  html += `</div>`;

  const misereContract = makeContractRaw({ type: 'misere' });
  const misereDisabled = misereContract.bidValue < minValue;
  html += `<div style="margin-top:8px">
    <button class="bid-btn bid-misere" ${misereDisabled ? 'disabled' : ''} data-bid='${JSON.stringify(misereContract)}' data-event="${emitEvent}">Misère</button>
  </div>`;
  return html;
}

function attachBidListeners(): void {
  $actionPanel.querySelectorAll('.bid-btn:not([disabled])').forEach(el => {
    el.addEventListener('click', () => {
      const b = JSON.parse(el.getAttribute('data-bid')!);
      const ev = el.getAttribute('data-event')!;
      socket.emit(ev, { contract: b });
    });
  });
}

function renderBidPanel(): void {
  const { currentBid } = state!;
  const minValue = currentBid ? currentBid.bidValue + 1 : 0;
  let html = `<h3>Your bid</h3>` + buildBidGrid(minValue, 'game:bid');
  html += `<div style="margin-top:10px"><button class="danger" id="pass-bid-btn">Pass</button></div>`;
  $actionPanel.innerHTML = html;
  attachBidListeners();
  document.getElementById('pass-bid-btn')!.addEventListener('click', () => {
    socket.emit('game:bid', { contract: { type: 'pass' } });
  });
}

function renderRebidPanel(): void {
  const { currentBid } = state!;
  const minValue = currentBid ? currentBid.bidValue : 0; // can rebid same or higher
  const currentLabel = currentBid ? contractLabel(currentBid) : '—';
  let html = `<h3>Update your bid</h3>
    <div style="margin-bottom:10px">
      <button id="keep-bid-btn" class="secondary">Keep: <strong>${currentLabel}</strong></button>
    </div>` + buildBidGrid(minValue, 'game:confirmRebid');
  $actionPanel.innerHTML = html;
  attachBidListeners();
  document.getElementById('keep-bid-btn')!.addEventListener('click', () => {
    socket.emit('game:confirmRebid', { contract: { type: 'pass' } });
  });
}

function renderBullet(): void {
  const { players } = state!;
  $bulletHeader.innerHTML = '<th>#</th>' + players.map(p => `<th>${p.name}</th>`).join('');

  const maxEntries = Math.max(...players.map(p => p.score.bulletEntries.length), 1);
  let rows = '';
  for (let i = 0; i < maxEntries; i++) {
    rows += `<tr><td>${i + 1}</td>` +
      players.map(p => `<td>${p.score.bulletEntries[i] ?? '—'}</td>`).join('') +
      '</tr>';
  }
  rows += `<tr style="font-weight:bold">
    <td>Viso</td>
    ${players.map(p => `<td>${p.score.bulletEntries.reduce((a, b) => a + b, 0)}</td>`).join('')}
  </tr>`;
  rows += `<tr><td>Bauda</td>${players.map(p => `<td style="color:var(--danger)">${p.score.pool ? '-' + p.score.pool : '—'}</td>`).join('')}</tr>`;
  rows += `<tr><td>WK</td>${players.map(p => `<td>${p.score.whistFromLeft || '—'}</td>`).join('')}</tr>`;
  rows += `<tr><td>WD</td>${players.map(p => `<td>${p.score.whistFromRight || '—'}</td>`).join('')}</tr>`;

  $bulletBody.innerHTML = rows;
}

function renderHandResult(): void {
  const { handResult, players } = state!;
  if (!handResult) return;

  if (state!.phase === 'game_over') {
    $resultTitle.textContent = '🏆 Game Over!';
    $nextHandBtn.textContent = 'Game Over';
    $nextHandBtn.disabled = true;
  } else {
    $resultTitle.textContent = handResult.phase === 'raspasovka' ? 'Raspasovka' : 'Hand Result';
    $nextHandBtn.textContent = 'Next Hand';
    $nextHandBtn.disabled = false;
  }

  $resultHeader.innerHTML = '<th>Player</th><th>Home</th><th>Taškai+</th><th>Bauda</th><th>Whist+</th>';
  $resultBody.innerHTML = players.map(p => {
    const delta = handResult.scoreDeltas.find(d => d.seat === p.seatIndex);
    const whistTotal = (delta?.whistLeftDelta ?? 0) + (delta?.whistRightDelta ?? 0);
    return `<tr>
      <td>${p.name}${handResult.declarer === p.seatIndex ? ' (D)' : ''}</td>
      <td>${handResult.tricksWon[p.seatIndex]}</td>
      <td>${delta?.bulletDelta ? '+' + delta.bulletDelta : '—'}</td>
      <td style="color:var(--danger)">${delta?.poolDelta ? '-' + delta.poolDelta : '—'}</td>
      <td>${whistTotal ? '+' + whistTotal : '—'}</td>
    </tr>`;
  }).join('');

  if (handResult.contract) {
    const made = handResult.made;
    const contractStr = contractLabel(handResult.contract);
    $resultTitle.textContent += ` — ${contractStr} ${made ? '✓ Made' : '✗ Failed'}`;
  }

  $handResult.classList.add('show');
}

function showError(msg: string): void {
  const el = state?.phase === 'lobby' ? $errorMsgLobby : ($errorMsgGame ?? $errorMsgLobby);
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 4000);
}

function clearError(): void {
  $errorMsgLobby.textContent = '';
  if ($errorMsgGame) $errorMsgGame.textContent = '';
}
