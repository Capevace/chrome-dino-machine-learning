const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const EventEmitter = require('events');
const emitter = new EventEmitter();

const PORT = 1234;

server.listen(PORT, () => console.log('HTTP Server listening on port:', PORT));

app.use(cors());
app.use('/', express.static(path.resolve(__dirname, '../game')));

io.on('connection', function(socket) {
	console.log('Browser connected.');

	socket.on('disconnect', () => {
		console.log('Browser disconnected.');
	});

	socket.on('input', function(input, callback) {
		emitter.emit('input', input, callback);
	});

	socket.on('gameover', data => {
		emitter.emit('gameover', data);
	});

	socket.on('players-ready', () => emitter.emit('players-ready'));

	emitter.on('reset', data => socket.emit('reset', data));
	emitter.on('start', data => socket.emit('start', data));

	emitter.on('output', output => socket.emit('output', { output }));
});

module.exports = emitter;
