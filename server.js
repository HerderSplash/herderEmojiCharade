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

const EMOJIS = [
  '🕺', '💃', '🎤', '🎸', '🎭', '⚽', '🏀', '🎯', '🚗', '🚴', '✈️',
  '🏖️', '🍕', '🍔', '🍎', '🍌', '🍩', '🍦', '☕', '📱', '💻', '📚', '🎮',
  '🤖', '🐶', '🐱', '🐸', '🦄', '🦊', '🐢', '🐍', '🙈', '👑', '🧙', '🧛',
  '🦸', '🕵️', '👮', '👨‍🍳', '👩‍🎤', '👨‍🚀', '👰', '🤡', '💪', '🤸', '🧘',
  '🚿', '🛏️', '🏆', '🎉',

  // Newly added, actable and well-known
  '📷', '🎧', '🍿', '🍣', '🍜', '🚀',
  '🛹', '🏄', '⛷️', '🏔️', '🎆', '🌈',
  '🐧', '🦁', '🐘', '🧟', '🦖', '🎩', '👓',
  '🐔', '🐷', '🐴', '🐒', '🐬'
];


const EMOJI_NAMES = {
  '🕺': 'dancer',
  '💃': 'dancer (female)',
  '🎤': 'singer',
  '🎸': 'guitarist',
  '🎭': 'actor',
  '⚽': 'soccer',
  '🏀': 'basketball',
  '🎯': 'dart',
  '🚗': 'car',
  '🚴': 'cyclist',
  '✈️': 'airplane',
  '🏖️': 'beach',
  '🍕': 'pizza',
  '🍔': 'burger',
  '🍎': 'apple',
  '🍌': 'banana',
  '🍩': 'donut',
  '🍦': 'ice cream',
  '☕': 'coffee',
  '📱': 'phone',
  '💻': 'computer',
  '📚': 'books',
  '🎮': 'video game',
  '🤖': 'robot',
  '🐶': 'dog',
  '🐱': 'cat',
  '🐸': 'frog',
  '🦄': 'unicorn',
  '🦊': 'fox',
  '🐢': 'turtle',
  '🐍': 'snake',
  '🙈': 'monkey',
  '👑': 'king/queen',
  '🧙': 'wizard',
  '🧛': 'vampire',
  '🦸': 'superhero',
  '🕵️': 'detective',
  '👮': 'police officer',
  '👨‍🍳': 'chef',
  '👩‍🎤': 'rock star',
  '👨‍🚀': 'astronaut',
  '👰': 'bride',
  '🤡': 'clown',
  '💪': 'strong',
  '🤸': 'gymnast',
  '🧘': 'yogi',
  '🚿': 'shower',
  '🛏️': 'bed',
  '🏆': 'trophy',
  '🎉': 'celebration',

  // New entries
  '📷': 'camera',
  '🎧': 'headphones',
  '🍿': 'popcorn',
  '🍣': 'sushi',
  '🍜': 'ramen',
  '🚀': 'rocket',
  '🛹': 'skateboard',
  '🏄': 'surfer',
  '⛷️': 'skier',
  '🏔️': 'mountain',
  '🎆': 'fireworks',
  '🌈': 'rainbow',
  '🐧': 'penguin',
  '🦁': 'lion',
  '🐘': 'elephant',
  '🧟': 'zombie',
  '🦖': 'dinosaur',
  '🎩': 'top hat',
  '👓': 'glasses',
  '🐔': 'chicken',
  '🐷': 'pig',
  '🐴': 'horse',
  '🐒': 'monkey (swinging)',
  '🐬': 'dolphin'
};



const gameRooms = {}; // gameCode => { players: [], status, currentEmoji, ... }

function generateEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('create-game', ({ gameCode, playerName }) => {
    console.log(`🎮 Creating game: ${gameCode} by ${playerName}`);
    
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
  });

  socket.on('join-game', ({ gameCode, playerName }) => {
    console.log(`👤 Player ${playerName} attempting to join game: ${gameCode}`);
    
    const room = gameRooms[gameCode];
    if (!room) {
      console.warn(`⚠️ Game not found: ${gameCode}`);
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

    console.log(`✅ ${playerName} joined game ${gameCode}`);
    io.to(gameCode).emit('player-joined', { players: room.players });

    socket.emit('game-joined', { gameCode, player, gameRoom: room });
  });

  socket.on('ready-up', ({ gameCode, isReady }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = isReady;
      console.log(`🎯 ${player.name} is ${isReady ? 'READY' : 'NOT READY'}`);
      io.to(gameCode).emit('player-ready', { players: room.players });
    }
  });

  socket.on('start-game', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    room.status = 'playing';
    room.currentRound = 1;

    console.log(`🚀 Game started: ${gameCode}`);
    startNewRound(gameCode);
  });

  socket.on('submit-guess', ({ gameCode, guess }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const emoji = EMOJI_NAMES[room.currentEmoji]
    const player = room.players.find(p => p.id === socket.id);

    console.log(`📝 ${player?.name} guessed: ${guess} | Actual: ${emoji}`);

    if (guess === emoji && player) {
      player.score += 1;
      console.log(`🎉 Correct guess by ${player.name}! Score: ${player.score}`);

      io.to(gameCode).emit('correct-guess', {
        player: player.name,
        emoji,
      });

      if (room.currentRound < room.totalRounds) {
        room.currentRound++;
        console.log(`➡️ Advancing to round ${room.currentRound}`);
        io.to(gameCode).emit('round-transition', { nextRound: room.currentRound });
        setTimeout(() => startNewRound(gameCode), 2000);
      } else {
        console.log(`🏁 Game over: ${gameCode}`);
        io.to(gameCode).emit('game-ended', { players: room.players });
        room.status = 'finished';
      }
    }
  });

  socket.on('skip-round', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    console.log(`⏭️ Round skipped in game ${gameCode}`);

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
    console.log(`❌ Socket disconnected: ${socket.id}`);

    for (const [gameCode, room] of Object.entries(gameRooms)) {
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const playerName = room.players[index].name;
        room.players.splice(index, 1);
        console.log(`👋 ${playerName} left game ${gameCode}`);

        io.to(gameCode).emit('player-left', { players: room.players });
        if (room.players.length === 0) {
          console.log(`🗑️ Removing empty game room: ${gameCode}`);
          delete gameRooms[gameCode];
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

  console.log(`🎭 Round ${room.currentRound} - Actor: ${actor.name} - Emoji: ${room.currentEmoji}`);

  io.to(gameCode).emit('round-started', {
    round: room.currentRound,
    actorId: actor.id,
    emoji: room.currentEmoji,
  });

  // Only send emoji to the actor
  io.to(actor.id).emit('emoji', room.currentEmoji);
}

server.listen(3000, () => {
  console.log('🌐 Server is running on http://localhost:3000');
});
