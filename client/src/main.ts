import { io, Socket } from 'socket.io-client';
import type { ClientGameState, Card, Contract } from './types';
import { contractLabel, makeContractRaw } from './bidding';
import { cardLabel, suitClass, sortHand } from './cards';
import { T, setLang, getLang, type Lang, TRANSLATIONS } from './i18n';

const socket: Socket = io();

let state: ClientGameState | null = null;
let mySocketId: string | null = null;
let selectedCards: Card[] = [];

// ---- DOM refs ----
const $lobby        = document.getElementById('lobby')!;
const $game         = document.getElementById('game')!;
const $nameInput    = document.getElementById('name-input') as HTMLInputElement;
const $joinBtn      = document.getElementById('join-btn') as HTMLButtonElement;
const $startBtn     = document.getElementById('start-btn') as HTMLButtonElement;
const $playerList   = document.getElementById('player-list')!;
const $settingsArea = document.getElementById('settings-area')!;
const $bulletSizeInput  = document.getElementById('bullet-size-input') as HTMLInputElement;
const $setSettingsBtn   = document.getElementById('set-settings-btn') as HTMLButtonElement;
const $tablePlayers = document.getElementById('table-players')!;
const $trickArea    = document.getElementById('trick-area')!;
const $myHand       = document.getElementById('my-hand')!;
const $actionPanel  = document.getElementById('action-panel')!;
const $handNum      = document.getElementById('hand-num')!;
const $bulletSizeDisplay  = document.getElementById('bullet-size-display')!;
const $currentBidDisplay  = document.getElementById('current-bid-display')!;
const $bulletHeader = document.getElementById('bullet-header')!;
const $bulletBody   = document.getElementById('bullet-body')!;
const $talonArea    = document.getElementById('talon-area')!;
const $handResult   = document.getElementById('hand-result')!;
const $resultTitle  = document.getElementById('result-title')!;
const $resultHeader = document.getElementById('result-header')!;
const $resultBody   = document.getElementById('result-body')!;
const $nextHandBtn  = document.getElementById('next-hand-btn') as HTMLButtonElement;
const $errorMsgLobby = document.getElementById('error-msg')!;
const $errorMsgGame  = document.querySelectorAll('#game #error-msg')[0] as HTMLElement;

// ---- Suit background ----
(function() {
  const bg = document.querySelector('.suit-bg') as HTMLElement;
  if (bg) bg.textContent = Array(250).fill('♠♣♦♥').join('  ');
})();

// ---- Language ----
function applyLang(): void {
  // Static labels
  $nameInput.placeholder = T.yourName;
  $joinBtn.textContent = T.joinGame;
  $setSettingsBtn.textContent = T.set;
  document.getElementById('label-taskai-target')!.textContent = T.taškaiTarget + ':';
  document.getElementById('rules-btn')!.textContent = T.rules;
  document.getElementById('chat-title')!.textContent = T.chat;
  document.getElementById('chat-send-btn')!.textContent = T.send;
  (document.getElementById('chat-input') as HTMLInputElement).placeholder = T.typeMessage;
  document.getElementById('label-hand')!.textContent = T.hand;
  document.getElementById('label-taskai')!.textContent = T.taskai;
  document.getElementById('label-bid')!.textContent = T.bid;
  document.getElementById('bullet-panel-title')!.textContent = T.taskai;
  document.getElementById('next-hand-btn')!.textContent = T.nextHand;
  document.getElementById('rules-title-text')!.textContent = T.rulesTitle;
  document.getElementById('rules-content')!.innerHTML = T.rulesHtml;
  document.getElementById('rules-close-bottom')!.textContent = T.close;
  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    (btn as HTMLElement).classList.toggle('active', btn.getAttribute('data-lang') === getLang());
  });
  // Start button
  if (state?.phase === 'lobby') renderLobby();
  else if (state) render();
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setLang(btn.getAttribute('data-lang') as Lang);
    applyLang();
  });
});

// ---- Socket events ----
socket.on('connect', () => { mySocketId = socket.id ?? null; });

socket.on('game:state', (s: ClientGameState) => {
  state = s;
  render();
});

socket.on('game:error', (msg: string) => { showError(msg); });

socket.on('chat:message', (entry: { name: string; text: string }) => {
  const $msgs = document.getElementById('chat-messages')!;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<span class="chat-name">${entry.name}:</span> ${entry.text}`;
  $msgs.appendChild(div);
  $msgs.scrollTop = $msgs.scrollHeight;
});

// ---- Lobby controls ----
$joinBtn.addEventListener('click', () => {
  const name = $nameInput.value.trim();
  if (!name) { showError(T.yourName); return; }
  socket.emit('lobby:join', { name });
});

$setSettingsBtn.addEventListener('click', () => {
  socket.emit('lobby:setSettings', { bulletSize: parseInt($bulletSizeInput.value) });
});

$startBtn.addEventListener('click', () => { socket.emit('lobby:start'); });

$nextHandBtn.addEventListener('click', () => {
  socket.emit('game:nextHand');
  $handResult.classList.remove('show');
});

// ---- Chat ----
document.getElementById('chat-send-btn')!.addEventListener('click', sendChat);
document.getElementById('chat-input')!.addEventListener('keydown', (e) => {
  if ((e as KeyboardEvent).key === 'Enter') sendChat();
});
function sendChat() {
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat:message', { text });
  input.value = '';
}

// ---- Rules ----
document.getElementById('rules-btn')!.addEventListener('click', () => {
  document.getElementById('rules-modal')!.classList.add('show');
});
document.getElementById('rules-close-btn')!.addEventListener('click', () => {
  document.getElementById('rules-modal')!.classList.remove('show');
});
document.getElementById('rules-close-bottom')!.addEventListener('click', () => {
  document.getElementById('rules-modal')!.classList.remove('show');
});

// ---- Init ----
applyLang();

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
  $game.style.gap = '14px';

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
    <li>${p.name} ${i === 0 ? `<span class="badge">${T.host}</span>` : ''}</li>
  `).join('');

  const joined = players.some(p => p.id === mySocketId);
  $joinBtn.style.display = joined ? 'none' : '';
  $nameInput.style.display = joined ? 'none' : '';

  const isHost = players.length > 0 && players[0].id === mySocketId;
  $settingsArea.classList.toggle('hidden', !isHost);
  if (isHost) $bulletSizeInput.value = String(state!.bulletSize);

  $startBtn.disabled = players.length < 3 || !isHost;
  $startBtn.textContent = players.length < 3
    ? `${T.startGame} (${players.length}/3 — ${T.needPlayers})`
    : T.startGame;
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
    const showTricks = state!.phase === 'playing' || state!.phase === 'raspasovka';
    return `
      <div class="player-box ${isActive ? 'active' : ''}">
        <div class="pname">
          ${isMe ? '★ ' : ''}${p.name}
          ${isDealer ? `<span class="dealer-marker">${T.dealer}</span>` : ''}
        </div>
        <div class="pcards">${p.cardCount} cards</div>
        <div class="pscore">
          ${T.taskai}: ${p.score.bulletEntries.reduce((a, b) => a + b, 0)} /
          ${T.pool}: ${p.score.pool} /
          ${T.wk}: ${p.score.whistFromLeft} ${T.wd}: ${p.score.whistFromRight}
        </div>
        ${showTricks ? `<div class="pcards" style="color:var(--accent);font-size:0.95rem;margin-top:4px">${T.home}: ${state!.tricksWon[p.seatIndex]}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderTalon(): void {
  if (!state!.talon) { $talonArea.innerHTML = ''; return; }
  const phase = state!.phase;
  const label = phase === 'talon_rebid' ? T.bidderPickedUp
    : phase === 'talon' ? T.talonOpen
    : T.talonLabel;
  $talonArea.innerHTML = `<span style="color:var(--accent);margin-right:10px;font-size:0.95rem">${label}</span>` +
    state!.talon.map(c => `<div class="card ${suitClass(c)}">${cardLabel(c)}</div>`).join('');
}

function renderTrick(): void {
  const { currentTrick, players } = state!;
  if (currentTrick.length === 0) {
    $trickArea.innerHTML = '<span style="color:#555">—</span>';
    return;
  }
  $trickArea.innerHTML = currentTrick.map(tc => {
    const p = players.find(pl => pl.seatIndex === tc.seat);
    return `
      <div style="text-align:center">
        <div style="font-size:0.78rem;margin-bottom:2px;color:#aaa">${p?.name ?? '?'}</div>
        <div class="card in-trick ${suitClass(tc.card)}">${cardLabel(tc.card)}</div>
      </div>
    `;
  }).join('');
}

function renderHand(): void {
  const { phase, activeSeat, mySeat, openCards, openPlay } = state!;
  const myHand = sortHand(state!.myHand);

  let openSection = '';
  if (openPlay && openCards && openCards.length > 0) {
    const openOwner = state!.players.find(p =>
      state!.whistChoices[p.seatIndex] !== 'whist' && p.seatIndex !== state!.bidder
    );
    openSection = `<div style="margin-bottom:6px;color:var(--accent);font-size:0.82rem">
      ${openOwner?.name ?? 'Open'} ${T.openHand}
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
  if (idx >= 0) selectedCards.splice(idx, 1);
  else if (selectedCards.length < 2) selectedCards.push(card);
  renderHand();
  renderActionPanel();
}

function renderActionPanel(): void {
  const { phase, activeSeat, mySeat } = state!;
  $actionPanel.innerHTML = '';
  const isMyTurn = activeSeat === mySeat;

  if (phase === 'bidding' && isMyTurn) {
    renderBidPanel();
  } else if (phase === 'talon' && isMyTurn) {
    $actionPanel.innerHTML = `<button id="take-talon-btn" style="font-size:1.05rem;padding:12px 28px">${T.pickUpTalon}</button>`;
    document.getElementById('take-talon-btn')!.addEventListener('click', () => socket.emit('game:takeTalon'));
  } else if (phase === 'talon' && !isMyTurn) {
    const name = state!.players.find(p => p.seatIndex === state!.bidder)?.name ?? '...';
    $actionPanel.innerHTML = `<p style="color:#aaa">${T.waitingFor} ${name} ${T.waitingTalon}</p>`;
  } else if (phase === 'talon_rebid' && isMyTurn) {
    renderRebidPanel();
  } else if (phase === 'talon_rebid' && !isMyTurn) {
    const name = state!.players.find(p => p.seatIndex === state!.bidder)?.name ?? '...';
    $actionPanel.innerHTML = `<p style="color:#aaa">${T.waitingFor} ${name} ${T.waitingRebid}</p>`;
  } else if (phase === 'discarding' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">${T.selectDiscard}</p>
      <button id="discard-btn" ${selectedCards.length !== 2 ? 'disabled' : ''}>${T.discardSelected}</button>
    `;
    document.getElementById('discard-btn')?.addEventListener('click', () => {
      if (selectedCards.length !== 2) return;
      socket.emit('game:discard', { cards: selectedCards });
      selectedCards = [];
    });
  } else if (phase === 'whisting' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">${T.whistOrPass}</p>
      <div class="action-row">
        <button id="whist-btn">${T.whist}</button>
        <button id="pass-w-btn">${T.pass}</button>
      </div>
    `;
    document.getElementById('whist-btn')!.addEventListener('click', () => socket.emit('game:whist', { choice: 'whist' }));
    document.getElementById('pass-w-btn')!.addEventListener('click', () => socket.emit('game:whist', { choice: 'pass' }));
  } else if (phase === 'open_choice' && isMyTurn) {
    $actionPanel.innerHTML = `
      <p style="color:var(--accent)">${T.openOrClosed}</p>
      <div class="action-row">
        <button id="open-btn">${T.open}</button>
        <button id="closed-btn">${T.closed}</button>
      </div>
    `;
    document.getElementById('open-btn')!.addEventListener('click', () => socket.emit('game:openChoice', { choice: 'open' }));
    document.getElementById('closed-btn')!.addEventListener('click', () => socket.emit('game:openChoice', { choice: 'closed' }));
  } else if (phase === 'playing' && isMyTurn) {
    $actionPanel.innerHTML = `<p style="color:var(--accent)">${T.yourTurnPlay}</p>`;
  } else if (phase === 'raspasovka' && isMyTurn) {
    $actionPanel.innerHTML = `<p style="color:var(--accent)">${T.raspasovkaMsg}</p>`;
  } else {
    const active = state!.players.find(p => p.seatIndex === activeSeat);
    $actionPanel.innerHTML = `<p style="color:#aaa">${T.waitingFor} ${active?.name ?? '...'}...</p>`;
  }
}

// ---- Bid grid builder ----
function buildBidGrid(minValue: number, emitEvent: string): string {
  const suits = ['spades', 'clubs', 'diamonds', 'hearts'] as const;
  const sym: Record<string, string> = { spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥' };
  let html = `<div id="bid-grid">`;
  for (let level = 6; level <= 10; level++) {
    for (const suit of suits) {
      const c = makeContractRaw({ type: 'suit', level: level as 6|7|8|9|10, suit });
      const cls = (suit === 'diamonds' || suit === 'hearts') ? 'bid-red' : '';
      html += `<button class="bid-btn ${cls}" ${c.bidValue < minValue ? 'disabled' : ''} data-bid='${JSON.stringify(c)}' data-ev="${emitEvent}">${level}${sym[suit]}</button>`;
    }
    const sc = makeContractRaw({ type: 'sans', level: level as 6|7|8|9|10 });
    html += `<button class="bid-btn bid-blue" ${sc.bidValue < minValue ? 'disabled' : ''} data-bid='${JSON.stringify(sc)}' data-ev="${emitEvent}">${level} NS</button>`;
  }
  html += `</div>`;
  const mc = makeContractRaw({ type: 'misere' });
  html += `<div style="margin-top:8px">
    <button class="bid-btn bid-misere" ${mc.bidValue < minValue ? 'disabled' : ''} data-bid='${JSON.stringify(mc)}' data-ev="${emitEvent}">Misère</button>
  </div>`;
  return html;
}

function attachBidListeners(): void {
  $actionPanel.querySelectorAll('.bid-btn:not([disabled])').forEach(el => {
    el.addEventListener('click', () => {
      socket.emit(el.getAttribute('data-ev')!, { contract: JSON.parse(el.getAttribute('data-bid')!) });
    });
  });
}

function renderBidPanel(): void {
  const minValue = (state!.currentBid?.bidValue ?? -1) + 1;
  $actionPanel.innerHTML = `<h3>${T.yourBid}</h3>` + buildBidGrid(minValue, 'game:bid') +
    `<div style="margin-top:10px"><button class="danger" id="pass-bid-btn">${T.pass}</button></div>`;
  attachBidListeners();
  document.getElementById('pass-bid-btn')!.addEventListener('click', () =>
    socket.emit('game:bid', { contract: { type: 'pass' } }));
}

function renderRebidPanel(): void {
  const minValue = state!.currentBid?.bidValue ?? 0;
  const currentLabel = state!.currentBid ? contractLabel(state!.currentBid) : '—';
  $actionPanel.innerHTML = `<h3>${T.updateBid}</h3>
    <div style="margin-bottom:10px">
      <button id="keep-bid-btn" class="secondary">${T.keepBid}: <strong>${currentLabel}</strong></button>
    </div>` + buildBidGrid(minValue, 'game:confirmRebid');
  attachBidListeners();
  document.getElementById('keep-bid-btn')!.addEventListener('click', () =>
    socket.emit('game:confirmRebid', { contract: { type: 'pass' } }));
}

function renderBullet(): void {
  const { players } = state!;
  $bulletHeader.innerHTML = '<th>#</th>' + players.map(p => `<th>${p.name}</th>`).join('');
  const maxEntries = Math.max(...players.map(p => p.score.bulletEntries.length), 1);
  let rows = '';
  for (let i = 0; i < maxEntries; i++) {
    rows += `<tr><td>${i + 1}</td>` +
      players.map(p => `<td>${p.score.bulletEntries[i] ?? '—'}</td>`).join('') + '</tr>';
  }
  rows += `<tr style="font-weight:bold"><td>${T.total}</td>${players.map(p => `<td>${p.score.bulletEntries.reduce((a, b) => a + b, 0)}</td>`).join('')}</tr>`;
  rows += `<tr><td>${T.bauda}</td>${players.map(p => `<td style="color:var(--danger)">${p.score.pool ? '-' + p.score.pool : '—'}</td>`).join('')}</tr>`;
  rows += `<tr><td>${T.wk}</td>${players.map(p => `<td>${p.score.whistFromLeft || '—'}</td>`).join('')}</tr>`;
  rows += `<tr><td>${T.wd}</td>${players.map(p => `<td>${p.score.whistFromRight || '—'}</td>`).join('')}</tr>`;
  $bulletBody.innerHTML = rows;
}

function renderHandResult(): void {
  const { handResult, players } = state!;
  if (!handResult) return;

  if (state!.phase === 'game_over') {
    $resultTitle.textContent = `🏆 ${T.gameOver}`;
    $nextHandBtn.textContent = T.gameOver;
    $nextHandBtn.disabled = true;
  } else {
    $resultTitle.textContent = handResult.phase === 'raspasovka' ? 'Raspasovka' : 'Hand Result';
    $nextHandBtn.textContent = T.nextHand;
    $nextHandBtn.disabled = false;
  }

  $resultHeader.innerHTML = `<th>Player</th><th>${T.home}</th><th>${T.taskai}+</th><th>${T.bauda}</th><th>${T.whistPlus}</th>`;
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
    $resultTitle.textContent += ` — ${contractLabel(handResult.contract)} ${made ? '✓' : '✗'}`;
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
