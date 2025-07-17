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
  '🚿', '🛏️', '🏆', '🎉', '📷', '🎧', '🍿', '🍣', '🍜', '🚀', '🛹', '🏄',
  '⛷️', '🏔️', '🎆', '🌈', '🐧', '🦁', '🐘', '🧟', '🦖', '🎩', '👓', '🐔',
  '🐷', '🐴', '🐒', '🐬'
];

const EMOJI_NAMES = {
  '🎤': ['sing', 'voice', 'mic'],
  '🎸': ['guitar', 'instrument', 'strum'],
  '🎭': ['act', 'drama', 'theater'],
  '⚽': ['soccer', 'football'],
  '🏀': ['basketball', 'hoop'],
  '🎯': ['dart', 'target'],
  '🚗': ['car', 'auto', 'vehicle'],
  '🚴': ['bike', 'pedal', 'ride'],
  '✈️': ['airplane', 'plane', 'jet'],
  '🏖️': ['beach', 'sand', 'sea'],
  '🍕': ['pizza', 'slice', 'cheese'],
  '🍔': ['burger', 'bun', 'beef'],
  '🍎': ['apple', 'fruit'],
  '🍌': ['banana', 'fruit'],
  '🍩': ['donut', 'doughnut'],
  '🍦': ['ice cream', 'gelato'],
  '☕': ['coffee', 'brew', 'espresso'],
  '📱': ['phone', 'mobile', 'cell'],
  '💻': ['computer', 'laptop', 'pc'],
  '📚': ['books', 'read', 'pages'],
  '🎮': ['game', 'play', 'console'],
  '🤖': ['robot', 'android', 'machine'],
  '🐶': ['dog', 'puppy', 'canine'],
  '🐱': ['cat', 'kitten', 'feline'],
  '🐸': ['frog', 'amphibian', 'jump'],
  '🦄': ['unicorn', 'myth'],
  '🦊': ['fox', 'vulpine'],
  '🐢': ['turtle', 'shell', 'reptile'],
  '🐍': ['snake', 'serpent'],
  '🙈': ['monkey', 'hide', 'see'],
  '👑': ['crown', 'royal', 'king'],
  '🧙': ['wizard', 'magic', 'spell'],
  '🧛': ['vampire', 'fangs', 'blood'],
  '🦸': ['hero', 'super', 'cape'],
  '🕵️': ['detective', 'spy', 'investigate'],
  '👮': ['police', 'cop', 'officer'],
  '👨‍🍳': ['chef', 'cook', 'kitchen'],
  '🤡': ['clown', 'joke', 'circus'],
  '💪': ['strong', 'muscle', 'lift'],
  '🧘': ['meditate', 'yoga', 'pose'],
  '🚿': ['shower', 'wash', 'clean'],
  '🛏️': ['bed', 'sleep', 'rest'],
  '🏆': ['trophy', 'win', 'award'],
  '📷': ['camera', 'photo', 'snapshot'],
  '🎧': ['headphones', 'listen', 'audio'],
  '🍿': ['popcorn', 'snack', 'movie'],
  '🍣': ['sushi', 'fish', 'rice'],
  '🍜': ['ramen', 'noodles', 'soup'],
  '🚀': ['rocket', 'launch', 'space'],
  '🛹': ['skateboard', 'skate'],
  '🏄': ['surf', 'wave', 'board'],
  '⛷️': ['ski', 'snow', 'slope'],
  '🏔️': ['mountain', 'peak', 'climb'],
  '🎆': ['fireworks', 'burst', 'light'],
  '🌈': ['rainbow', 'color', 'arc'],
  '🐧': ['penguin', 'bird', 'ice'],
  '🦁': ['lion', 'mane', 'roar'],
  '🐘': ['elephant', 'trunk', 'tusk'],
  '🧟': ['zombie', 'undead'],
  '🦖': ['dinosaur', 'rex', 'fossil'],
  '🎩': ['hat', 'top', 'formal'],
  '👓': ['glasses', 'lens', 'vision'],
  '🐔': ['chicken', 'hen', 'cluck'],
  '🐷': ['pig', 'oink', 'swine'],
  '🐴': ['horse', 'mane', 'ride'],
  '🐒': ['monkey', 'swing', 'tail'],
  '🐬': ['dolphin', 'swim', 'ocean']
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

    const correctGuess = Array.isArray(EMOJI_NAMES[room.currentEmoji])
      ? EMOJI_NAMES[room.currentEmoji].includes(guess.toLowerCase())
      : EMOJI_NAMES[room.currentEmoji] === guess.toLowerCase();

    
    const player = room.players.find(p => p.id === socket.id);

    console.log(`📝 ${player?.name} guessed: ${guess} | Actual: ${emoji}`);

    if (correctGuess && player) {
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

  socket.on('chat-message', ({ gameCode, senderName, message }) => {
    console.log(`💬 [${gameCode}] ${senderName}: ${message}`);
    io.to(gameCode).emit('chat-message', { senderName, message });
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
