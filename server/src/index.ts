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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Serve static frontend build
const clientDist = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const game = new PreferanceGame();

interface ChatEntry { name: string; text: string; }
const chatLog: ChatEntry[] = [];

function broadcast(): void {
  for (const id of game.getAllPlayerIds()) {
    io.to(id).emit('game:state', game.getStateFor(id));
  }
}

function err(socket: Socket, msg: string): void {
  socket.emit('game:error', msg);
}

io.on('connection', (socket: Socket) => {
  console.log('connect', socket.id);
  socket.emit('game:state', game.getStateFor(socket.id));

  socket.on('lobby:join', (payload: JoinPayload) => {
    const name = (payload?.name ?? '').trim().slice(0, 20);
    if (!name) return err(socket, 'Name required');
    if (game.playerCount() >= 3) return err(socket, 'Game is full');
    if (game.getPlayer(socket.id)) return err(socket, 'Already joined');

    const ok = game.addPlayer(socket.id, name);
    if (!ok) return err(socket, 'Could not join');
    broadcast();
  });

  socket.on('lobby:setSettings', (payload: SettingsPayload) => {
    if (!game.isHost(socket.id)) return err(socket, 'Only the host can change settings');
    const size = Number(payload?.bulletSize);
    if (!Number.isInteger(size) || size < 5 || size > 100) return err(socket, 'Invalid bullet size (5–100)');
    game.bulletSize = size;
    broadcast();
  });

  socket.on('lobby:start', () => {
    if (!game.isHost(socket.id)) return err(socket, 'Only the host can start');
    if (!game.canStart()) return err(socket, 'Need exactly 3 players');
    game.startGame();
    broadcast();
  });

  socket.on('game:bid', (payload: BidPayload) => {
    const error = game.placeBid(socket.id, payload?.contract);
    if (error) return err(socket, error);
    // If talon phase, give talon to bidder automatically
    if ((game as any).phase === 'talon') {
      const talon = game.getTalonForBidder(socket.id);
      if (typeof talon !== 'string') broadcast();
      else broadcast();
    } else {
      broadcast();
    }
  });

  socket.on('game:takeTalon', () => {
    const result = game.getTalonForBidder(socket.id);
    if (typeof result === 'string') return err(socket, result);
    broadcast();
  });

  socket.on('game:discard', (payload: DiscardPayload) => {
    const error = game.discardCards(socket.id, payload?.cards ?? []);
    if (error) return err(socket, error);
    broadcast();
  });

  socket.on('game:whist', (payload: WhistPayload) => {
    const error = game.makeWhistChoice(socket.id, payload?.choice);
    if (error) return err(socket, error);
    broadcast();
  });

  socket.on('game:openChoice', (payload: OpenChoicePayload) => {
    const error = game.makeOpenChoice(socket.id, payload?.choice);
    if (error) return err(socket, error);
    broadcast();
  });

  socket.on('game:playCard', (payload: PlayCardPayload) => {
    const error = game.playCard(socket.id, payload?.card);
    if (error) return err(socket, error);
    broadcast();
  });

  socket.on('game:nextHand', () => {
    game.nextHand();
    broadcast();
  });

  socket.on('game:confirmRebid', (payload: ConfirmRebidPayload) => {
    const error = game.confirmRebid(socket.id, payload?.contract);
    if (error) return err(socket, error);
    broadcast();
  });

  socket.on('chat:message', (payload: ChatPayload) => {
    const p = game.getPlayer(socket.id);
    if (!p) return;
    const text = (payload?.text ?? '').trim().slice(0, 200);
    if (!text) return;
    const entry: ChatEntry = { name: (p as any).name, text };
    chatLog.push(entry);
    if (chatLog.length > 50) chatLog.shift();
    io.emit('chat:message', entry);
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    game.removePlayer(socket.id);
    broadcast();
  });
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Preferanse server running on http://localhost:${PORT}`);
});
