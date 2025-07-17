// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Consider locking down in prod
  },
});

app.use(cors());

// Emoji and their keywords for guessing
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

const gameRooms = {}; // Store all game rooms: gameCode => room object

// Helper: generate random emoji
const generateEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

// Helper: find player in room by socket id
const findPlayerById = (room, id) => room.players.find(p => p.id === id);

// Helper: broadcast player list update to room
const broadcastPlayers = (gameCode) => {
  const room = gameRooms[gameCode];
  if (room) {
    io.to(gameCode).emit('player-list', { players: room.players });
  }
};

// Start new round helper
function startNewRound(gameCode) {
  const room = gameRooms[gameCode];
  if (!room || room.players.length === 0) return;

  // Determine actor index cyclically based on round number
  const actorIndex = (room.currentRound - 1) % room.players.length;
  const actor = room.players[actorIndex];

  // Pick new emoji
  room.currentEmoji = generateEmoji();
  room.currentActorId = actor.id;

  console.log(`🎭 [${gameCode}] Round ${room.currentRound}: Actor ${actor.name}, Emoji ${room.currentEmoji}`);

  // Emit round start info to all players
  io.to(gameCode).emit('round-started', {
    round: room.currentRound,
    actorId: actor.id,
    emoji: null, // hide emoji from guessers
  });

  // Send emoji only to actor
  io.to(actor.id).emit('emoji', room.currentEmoji);
}

// Validate if all players are ready
function areAllPlayersReady(room) {
  return room.players.length > 0 && room.players.every(p => p.isReady);
}

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // Create a new game room
  socket.on('create-game', ({ gameCode, playerName }) => {
    if (!gameCode || !playerName) {
      socket.emit('error', { message: 'Missing gameCode or playerName.' });
      return;
    }

    if (gameRooms[gameCode]) {
      socket.emit('error', { message: 'Game code already exists.' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName.trim(),
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
    console.log(`🎮 Game created: ${gameCode} by host ${player.name}`);

    socket.emit('game-joined', { gameCode, player, gameRoom: gameRooms[gameCode] });
  });

  // Join an existing game
  socket.on('join-game', ({ gameCode, playerName }) => {
    if (!gameCode || !playerName) {
      socket.emit('error', { message: 'Missing gameCode or playerName.' });
      return;
    }

    const room = gameRooms[gameCode];
    if (!room) {
      socket.emit('error', { message: 'Game not found.' });
      return;
    }

    // Prevent duplicate player names in same game
    if (room.players.find(p => p.name === playerName.trim())) {
      socket.emit('error', { message: 'Player name already taken in this game.' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName.trim(),
      isReady: false,
      isHost: false,
      score: 0,
    };

    room.players.push(player);
    socket.join(gameCode);

    console.log(`👤 Player ${player.name} joined game ${gameCode}`);

    io.to(gameCode).emit('player-joined', { players: room.players });
    socket.emit('game-joined', { gameCode, player, gameRoom: room });
  });

  // Mark player ready/unready
  socket.on('ready-up', ({ gameCode, isReady }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const player = findPlayerById(room, socket.id);
    if (!player) return;

    player.isReady = Boolean(isReady);
    console.log(`🎯 ${player.name} is ${player.isReady ? 'READY' : 'NOT READY'}`);

    io.to(gameCode).emit('player-ready', { players: room.players });

    // Optionally auto-start game if all ready
    // if (areAllPlayersReady(room) && room.status === 'waiting') {
    //   room.status = 'playing';
    //   room.currentRound = 1;
    //   startNewRound(gameCode);
    // }
  });

  // Start the game manually (host only)
  socket.on('start-game', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room) return;

    const player = findPlayerById(room, socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only the host can start the game.' });
      return;
    }

    if (!areAllPlayersReady(room)) {
      socket.emit('error', { message: 'Not all players are ready.' });
      return;
    }

    room.status = 'playing';
    room.currentRound = 1;

    console.log(`🚀 Game started: ${gameCode}`);
    io.to(gameCode).emit('game-started');

    startNewRound(gameCode);
  });

  // Player submits a guess
  socket.on('submit-guess', ({ gameCode, guess }) => {
    const room = gameRooms[gameCode];
    if (!room || room.status !== 'playing') return;

    const player = findPlayerById(room, socket.id);
    if (!player || !guess) return;

    const correctKeywords = EMOJI_NAMES[room.currentEmoji] || [];
    const isCorrect = correctKeywords.some(keyword => keyword.toLowerCase() === guess.toLowerCase());

    console.log(`📝 [${gameCode}] ${player.name} guessed "${guess}" | Emoji: ${room.currentEmoji}`);

    if (isCorrect) {
      player.score += 1;
      console.log(`🎉 Correct guess by ${player.name}! New score: ${player.score}`);

      io.to(gameCode).emit('correct-guess', {
        player: player.name,
        emoji: room.currentEmoji,
      });

      if (room.currentRound < room.totalRounds) {
        room.currentRound += 1;
        io.to(gameCode).emit('round-transition', { nextRound: room.currentRound });

        setTimeout(() => {
          startNewRound(gameCode);
        }, 2000);
      } else {
        room.status = 'finished';
        io.to(gameCode).emit('game-ended', { players: room.players });
        console.log(`🏁 Game ended: ${gameCode}`);
      }
    }
  });

  // Skip the current round (host only)
  socket.on('skip-round', ({ gameCode }) => {
    const room = gameRooms[gameCode];
    if (!room || room.status !== 'playing') return;

    const player = findPlayerById(room, socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only the host can skip rounds.' });
      return;
    }

    console.log(`⏭️ Round skipped by host ${player.name} in game ${gameCode}`);

    if (room.currentRound < room.totalRounds) {
      room.currentRound += 1;
      io.to(gameCode).emit('round-transition', { nextRound: room.currentRound });

      setTimeout(() => {
        startNewRound(gameCode);
      }, 2000);
    } else {
      room.status = 'finished';
      io.to(gameCode).emit('game-ended', { players: room.players });
      console.log(`🏁 Game ended after skip: ${gameCode}`);
    }
  });

  // Chat message broadcast
  socket.on('chat-message', ({ gameCode, senderName, message }) => {
    if (!gameCode || !message) return;

    console.log(`💬 [${gameCode}] ${senderName}: ${message}`);
    io.to(gameCode).emit('chat-message', { senderName, message });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);

    for (const [gameCode, room] of Object.entries(gameRooms)) {
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const player = room.players[index];
        room.players.splice(index, 1);

        socket.leave(gameCode);
        console.log(`👋 ${player.name} left game ${gameCode}`);

        // Notify others in the game
        io.to(gameCode).emit('player-left', { players: room.players });

        // If no players left, delete room
        if (room.players.length === 0) {
          delete gameRooms[gameCode];
          console.log(`🗑️ Removed empty game room: ${gameCode}`);
        } else {
          // If host left, assign a new host
          if (player.isHost) {
            room.players[0].isHost = true;
            io.to(gameCode).emit('host-changed', { newHostId: room.players[0].id });
            console.log(`👑 New host assigned: ${room.players[0].name} in game ${gameCode}`);
          }
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Server is running on http://localhost:${PORT}`);
});
