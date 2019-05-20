// INPUT
// DISTANCE OF NEXT OBSTACLE
// WIDTH OF OBSTACLE
// SPEED OF OBSTACLE

// OUTPUT
// PRESS JUMP
// PRESS CROUCH
// DO NOTHING

const Clinterface = require('clinterface');
const fs = require('fs');
const path = require('path');
const emitter = require('./socket');
const network = require('./network');

console.log('DINO AI');
console.log('-------');
console.log('\n');

const cli = new Clinterface(
	{},
	{
		hideRegisterLogs: true
	}
);

cli.command('e', {
	description: 'Evolve',
	usage: 'e',
	method: function() {
		network.evolve();
	}
});

cli.command('n', {
	description: 'Run generation',
	usage: 'n',
	method: async function() {
		await network.nextGeneration();
	}
});

cli.command('info', {
	description: 'Get some information',
	usage: 'info',
	method: function() {
		network.printInfo();
	}
});

cli.command('print', {
	description: 'Print a genome to JSON',
	usage: 'print',
	method: function(args) {
		const index = parseInt(args[1]);

		network.dumpGenome(index);
	}
});

cli.command('save', {
	description: 'Save current generation to disk',
	usage: 'save',
	method: function(args) {
		const name = args[1] || 'X';
		const json = network.toJSON();
		fs.writeFileSync(__dirname + '/genomes/' + name + '.json');
	}
});

cli.command('load', {
	description: 'Load a network',
	usage: 'load',
	method: function(args) {
		const name = args[1] || 'X';
		const json = fs.readFileSync(__dirname + '/genomes/' + name + '.json');
		network.fromJSON(json);
	}
});

cli.command('clone', {
	description: 'Load a single genome for the whole generation',
	usage: 'clone',
	method: function(args) {
		const filepath = path.resolve(__dirname, args[1]);
		const json = fs.readFileSync(filepath);
		network.cloneJSON(json);
	}
});

// cli.command('clone', {
// 	description: 'Load a single genome for the whole generation',
// 	usage: 'clone',
// 	method: function(args) {
// 		const filepath = path.resolve(__dirname, args[1]);
// 		const json = fs.readFileSync(filepath);
// 		network.cloneJSON(json);
// 	}
// });
