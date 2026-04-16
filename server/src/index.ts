// This is the server entry point — it starts the web server and handles
// all real-time communication between players using Socket.io.

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { PreferanceGame } from './game/PreferanceGame';
import {
  JoinPayload, BidPayload, DiscardPayload,
  WhistPayload, OpenChoicePayload, PlayCardPayload, SettingsPayload,
  ChatPayload, ConfirmRebidPayload,
} from './types';

// Set up Express and wrap it in an HTTP server (required for Socket.io)
const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });

// Serve the built frontend files from the client/dist folder
const clientDist = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

// One instance of the game — all 3 players share the same game object
const game = new PreferanceGame();

// Simple chat log — keeps the last 50 messages in memory
interface ChatEntry { name: string; text: string; }
const chatLog: ChatEntry[] = [];

// Sends the current game state to every player (each gets their own private version)
function broadcast(): void {
  for (const id of game.getAllPlayerIds()) {
    io.to(id).emit('game:state', game.getStateFor(id));
  }
}

// Sends an error message back to one specific player
function err(socket: Socket, msg: string): void {
  socket.emit('game:error', msg);
}

// ---- Socket.io event handlers ----
// Each "socket.on" block listens for a specific message from a client

io.on('connection', (socket: Socket) => {
  console.log('connect', socket.id);

  // When someone connects, immediately send them the current game state
  socket.emit('game:state', game.getStateFor(socket.id));

  // Player joins the lobby with their chosen name
  socket.on('lobby:join', (payload: JoinPayload) => {
    const name = (payload?.name ?? '').trim().slice(0, 20); // max 20 chars
    if (!name) return err(socket, 'Name required');
    if (game.playerCount() >= 3) return err(socket, 'Game is full');
    if (game.getPlayer(socket.id)) return err(socket, 'Already joined');

    const ok = game.addPlayer(socket.id, name);
    if (!ok) return err(socket, 'Could not join');
    broadcast();
  });

  // Host changes the score target (only the first player who joined can do this)
  socket.on('lobby:setSettings', (payload: SettingsPayload) => {
    if (!game.isHost(socket.id)) return err(socket, 'Only the host can change settings');
    const size = Number(payload?.bulletSize);
    if (!Number.isInteger(size) || size < 5 || size > 100) return err(socket, 'Invalid bullet size (5–100)');
    game.bulletSize = size;
    broadcast();
  });

  // Host starts the game (need exactly 3 players)
  socket.on('lobby:start', () => {
    if (!game.isHost(socket.id)) return err(socket, 'Only the host can start');
    if (!game.canStart()) return err(socket, 'Need exactly 3 players');
    game.startGame();
    broadcast();
  });

  // A player makes a bid (or passes)
  socket.on('game:bid', (payload: BidPayload) => {
    const error = game.placeBid(socket.id, payload?.contract);
    if (error) return err(socket, error);
    // If the bidder won and needs to pick up the talon, handle it automatically
    if ((game as any).phase === 'talon') {
      game.getTalonForBidder(socket.id);
    }
    broadcast();
  });

  // The winning bidder picks up the 2 talon cards
  socket.on('game:takeTalon', () => {
    const result = game.getTalonForBidder(socket.id);
    if (typeof result === 'string') return err(socket, result);
    broadcast();
  });

  // The bidder discards 2 cards after seeing the talon
  socket.on('game:discard', (payload: DiscardPayload) => {
    const error = game.discardCards(socket.id, payload?.cards ?? []);
    if (error) return err(socket, error);
    broadcast();
  });

  // A player decides to whist (challenge the bidder) or pass
  socket.on('game:whist', (payload: WhistPayload) => {
    const error = game.makeWhistChoice(socket.id, payload?.choice);
    if (error) return err(socket, error);
    broadcast();
  });

  // The whister chooses to play open or closed
  socket.on('game:openChoice', (payload: OpenChoicePayload) => {
    const error = game.makeOpenChoice(socket.id, payload?.choice);
    if (error) return err(socket, error);
    broadcast();
  });

  // A player plays a card during a trick
  socket.on('game:playCard', (payload: PlayCardPayload) => {
    const error = game.playCard(socket.id, payload?.card);
    if (error) return err(socket, error);
    broadcast();
  });

  // Everyone clicked "Next Hand" — move to the next round
  socket.on('game:nextHand', () => {
    game.nextHand();
    broadcast();
  });

  // After seeing the talon, the bidder can raise their bid
  socket.on('game:confirmRebid', (payload: ConfirmRebidPayload) => {
    const error = game.confirmRebid(socket.id, payload?.contract);
    if (error) return err(socket, error);
    broadcast();
  });

  // A player sends a chat message
  socket.on('chat:message', (payload: ChatPayload) => {
    const p = game.getPlayer(socket.id);
    if (!p) return;
    const text = (payload?.text ?? '').trim().slice(0, 200); // max 200 chars
    if (!text) return;

    const entry: ChatEntry = { name: (p as any).name, text };
    chatLog.push(entry);
    if (chatLog.length > 50) chatLog.shift(); // keep only the last 50 messages

    io.emit('chat:message', entry); // send to all connected players
  });

  // Player disconnected (tab closed, network issue, etc.)
  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    game.removePlayer(socket.id);
    broadcast();
  });
});

// Start listening for connections
const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Preferanse server running on http://localhost:${PORT}`);
});
