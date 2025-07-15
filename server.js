// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// List of emojis for the game
const emojis = [
  '🍕', '🚗', '🐱', '🏖️', '🎉', '🤖', '💻', '🎤', '🛏️', '🎮', '👑', '🍎'
];

// Store game state and players
let players = [];
let currentEmoji = null;
let currentPlayerIndex = 0;

// Serve static files (if you have a frontend)
app.use(express.static('public'));

// When a new player connects
io.on('connection', (socket) => {
  console.log('A player connected: ' + socket.id);
  
  // Assign the new player an index and add to the players list
  const player = {
    id: socket.id,
    name: `Player ${players.length + 1}`,
    score: 0
  };
  
  players.push(player);
  
  // Emit updated player list to all players
  io.emit('players', players);
  
  // Emit the emoji for the current acting round
  socket.emit('emoji', currentEmoji);
  
  // Listen for guesses from players
  socket.on('guess', (guess) => {
    console.log(`Player ${player.name} guessed: ${guess}`);
    
    if (guess === currentEmoji) {
      // Player guessed correctly
      player.score += 1;
      io.emit('correct-guess', {
        player: player.name,
        emoji: currentEmoji
      });
      
      // Move to next round
      nextRound();
    }
  });
  
  // Disconnect the player
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id);
    players = players.filter(p => p.id !== socket.id);
    io.emit('players', players);
  });
});

// Start a new round with a random emoji
function nextRound() {
  // Pick a new emoji randomly
  currentEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  
  // Notify all players of the new round and the current player who will act it out
  io.emit('new-round', {
    emoji: currentEmoji,
    player: players[currentPlayerIndex].name
  });

  // Emit the emoji to the acting player
  io.to(players[currentPlayerIndex].id).emit('emoji', currentEmoji);
}

// Start the server on a port (e.g., 3000)
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});