// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());

const EMOJIS = [ '🍕', '🚗', '🐱', '🏖️', '🎉', '🤖', '💻', '🎤', '🛏️', '🎮', '👑', '🍎' ];

const gameRooms = {}; // gameCode => { players: [], status, currentEmoji, ... }

function generateEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create-game', ({ gameCode, playerName }) => {
    const player = {
      id: socket.id,
      name: playerName,
      isReady: false,
      isHost: true,
      score: 0,
    };

    gameRooms[gameCode] = {
      players: [player],
      status: 'waiting',
      currentRound: 0,
      totalRounds: 12,
      currentActorId: null,
      currentEmoji: null,
    };

    socket.join(gameCode);
    socket.emit('game-joined', { gameCode, player, gameRoom: gameRooms[gameCode] });
    console.log(`Game created: ${gameCode}`);
  });

  socket.on('join-game', ({ gameCode, playerName }) => {
    const room = gameRooms[gameCode];
    if (!room) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      isReady: false,
      isHost: false,
      score: 0,
    };

    room.players.push(player);
    socket.join(gameCode);
    io.to(gameCode).emit('player-joined', { players: room.players });

    socket.emit('game-joined', { gameCode, player, gameRoom: room });
  });

  socket.on('ready-up', ({ gameCode, isReady }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = isReady;
      io.to(gameCode).emit('player-ready', { players: room.players });
    }
  });

  socket.on('start-game', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    room.status = 'playing';
    room.currentRound = 1;

    startNewRound(gameCode);
  });

  socket.on('submit-guess', ({ gameCode, guess }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const emoji = room.currentEmoji;
    if (guess === emoji) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score += 1;
        io.to(gameCode).emit('correct-guess', {
          player: player.name,
          emoji,
        });

        if (room.currentRound < room.totalRounds) {
          room.currentRound++;
          io.to(gameCode).emit('round-transition', { nextRound: room.currentRound });
          setTimeout(() => startNewRound(gameCode), 2000);
        } else {
          io.to(gameCode).emit('game-ended', { players: room.players });
          room.status = 'finished';
        }
      }
    }
  });

  socket.on('skip-round', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    if (room.currentRound < room.totalRounds) {
      room.currentRound++;
      io.to(gameCode).emit('round-transition', { nextRound: room.currentRound });
      setTimeout(() => startNewRound(gameCode), 2000);
    } else {
      io.to(gameCode).emit('game-ended', { players: room.players });
      room.status = 'finished';
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    for (const [gameCode, room] of Object.entries(gameRooms)) {
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(gameCode).emit('player-left', { players: room.players });
        if (room.players.length === 0) {
          delete gameRooms[gameCode]; // Clean up empty room
        }
        break;
      }
    }
  });
});

function startNewRound(gameCode) {
  const room = gameRooms[gameCode];
  if (!room || room.players.length === 0) return;

  const actorIndex = (room.currentRound - 1) % room.players.length;
  const actor = room.players[actorIndex];

  room.currentEmoji = generateEmoji();
  room.currentActorId = actor.id;

  io.to(gameCode).emit('round-started', {
    round: room.currentRound,
    actorId: actor.id,
    emoji: room.currentEmoji,
  });

  // Optionally: emit emoji only to actor
  io.to(actor.id).emit('emoji', room.currentEmoji);
}

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});