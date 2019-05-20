const emitter = require('./socket');
const synaptic = require('synaptic');
const cloneDeep = require('clone-deep');

const GENOMES_PER_GEN = 10;
const LEARNING_RATE = 0.3;
let generation = 1;
let latestHighscores = [];
let genomes = buildGenome(generation);

module.exports.printInfo = function printInfo() {
	console.log('');
	console.log('Current Information:');
	console.log('Generation:', generation);
	console.log('Genomes per Generation:', GENOMES_PER_GEN);
	console.log('Learning Rate:', LEARNING_RATE);
	console.log('---');
};

// FLOW
// EXECUTE()
// - reset browser UI
// - generate initial genomes
// - start players
// - wait for incoming data
// - reply to inputs with calculated outputs
// - repeat till all players died
// - when all players dead, return best genome

function executeGeneration(generation, events, genomes) {
	return new Promise(resolve => {
		// reset browser ui
		// start players
		// wait for incoming data
		// reply to data
		// wait till all players died
		// return best genome

		function resetBrowserUI() {
			console.log('Resetting UI');
			events.emit('reset', { genomeCount: GENOMES_PER_GEN, generation });
		}

		function startPlayers() {
			console.log('Starting players');
			events.emit('start');
		}

		events.on('input', onInput);
		function onInput(inputs, sendOutput) {
			const outputArray = outputsForGenomes(inputs, genomes);
			sendOutput(outputArray);
		}

		events.once('gameover', onGameover);
		function onGameover(data) {
			console.log(
				'Gameover for generation:',
				generation,
				'Best scores:',
				data.sort().slice(data.length - 4)
			);
			latestHighscores = data;

			events.removeListener('gameover', onGameover);
			events.removeListener('input', onInput);
			events.removeListener('players-ready', startPlayers);

			resolve();
		}

		console.log('Executing Generation', generation);

		events.on('players-ready', startPlayers);
		resetBrowserUI();
	});
}

async function nextGeneration() {
	await executeGeneration(generation, emitter, genomes);
}
module.exports.nextGeneration = nextGeneration;

function evolve() {
	console.log('Starting evolution...');
	if (!latestHighscores) {
		console.log('No highscores to evolve by.');
		return;
	}

	generation++;

	genomes.map((genome, i) => {
		genome.fitness = latestHighscores[i];
		return genome;
	});

	genomes = genomes.sort((a, b) => {
		if (a.fitness < b.fitness) {
			return 1;
		} else if (a.fitness > b.fitness) {
			return -1;
		}

		return 0;
	});

	// We sorted the genomes by fitness
	// These are the two best ones
	const bestGenomes = [
		cloneDeep(genomes[0]),
		cloneDeep(genomes[1]),
		cloneDeep(genomes[2]),
		cloneDeep(genomes[3])
	];

	// We kill off all others than the best ones.
	genomes = [genomes[0], genomes[1], genomes[2], genomes[3]];

	console.log('Cross over and mutation...');
	// one less than the actual amount because we already added the best genome
	while (genomes.length < GENOMES_PER_GEN - Math.floor(GENOMES_PER_GEN / 5)) {
		let genomeA =
			bestGenomes[Math.round(Math.random() * (bestGenomes.length - 1))];
		let genomeB =
			bestGenomes[Math.round(Math.random() * (bestGenomes.length - 1))];

		const combinedNetwork = mutate(
			crossOver(genomeA.network.toJSON(), genomeB.network.toJSON())
		);

		genomes.push({
			fitness: 0,
			network: synaptic.Network.fromJSON(combinedNetwork)
		});
	}

	console.log('Mutation only...');
	// mutation only
	while (genomes.length < GENOMES_PER_GEN) {
		const genome =
			bestGenomes[Math.round(Math.random() * (bestGenomes.length - 1))];

		const mutatedNetwork = mutate(genome.network.toJSON());
		genomes.push({
			fitness: 0,
			network: synaptic.Network.fromJSON(mutatedNetwork)
		});
	}

	console.log('Successfully evolved genomes.');
}
module.exports.evolve = evolve;

function buildGenome() {
	const genomes = Array(GENOMES_PER_GEN)
		.fill({})
		.map(genome => ({
			fitness: 0,
			network: new synaptic.Architect.Perceptron(3, 4, 1)
		}));
	return genomes;
}

function outputsForGenomes(data, genomes) {
	return genomes.map((genome, i) => {
		const dataForGenome = data[i];

		// if player dead, no need to keep calculating
		if (dataForGenome === -1) {
			return -1;
		}

		const input = [
			dataForGenome.obstacleDistance,
			dataForGenome.obstacleWidth,
			dataForGenome.obstacleSpeed
		];

		const output = genome.network.activate(input)[0];

		let action = 0; // 0 = nothing, 1 = jump, 2 = crouch
		if (output < 0.45) {
			// JUMP
			action = 2;
		} else if (output > 0.55) {
			// CROUCH
			action = 1;
		}
		return action;
	});
}

function crossOver(motherNetwork, fatherNetwork) {
	// With a propability of 50% we swap mother and father
	if (Math.random() > 0.5) {
		let temp = motherNetwork;
		motherNetwork = fatherNetwork;
		fatherNetwork = temp; // motherNetwork
	}

	const newMother = cloneDeep(motherNetwork);
	const newFather = cloneDeep(fatherNetwork);

	const cutLocation = Math.round(newMother.neurons.length * Math.random());
	for (let i = cutLocation; i < newMother.neurons.length; i++) {
		let temp = newMother.neurons[i].bias;
		newMother.neurons[i].bias = newFather.neurons[i].bias;
		newFather.neurons[i].bias = temp; // newMother.neurons[i].bias
	}

	return newMother;
}

function mutate(network) {
	mutateKey(network.neurons, 'bias');
	mutateKey(network.connections, 'weight');

	return network;
}

function mutateKey(a, key) {
	for (let i = 0; i < a.length; i++) {
		if (Math.random() > LEARNING_RATE) {
			continue;
		}

		a[i][key] +=
			a[i][key] * (Math.random() - 0.5) * 3 + (Math.random() - 0.5);
	}
}

function dumpGenome(index) {
	const genome = genomes[index];

	if (!genome) {
		console.log('Genome not found:', index);
		return;
	}

	console.log('Dumping Genome', index, 'at generation:', generation);
	console.log('Fitness:', genome.fitness);
	console.log('JSON:', JSON.stringify(genome.network));
}
module.exports.dumpGenome = dumpGenome;

function toJSON() {
	return JSON.stringify(genomes);
}
module.exports.toJSON = toJSON;

function fromJSON(json) {
	const genomesData = JSON.parse(json);

	genomesData.map(genome => ({
		fitness: genome.fitness,
		network: synaptic.Network.fromJSON(genome.network)
	}));

	genomes = genomesData;
}
module.exports.fromJSON = fromJSON;

function cloneJSON(json) {
	console.log('Cloning the genome...');
	const network = JSON.parse(json);

	genomes = [];

	while (genomes.length < GENOMES_PER_GEN) {
		genomes.push({
			fitness: 0,
			network: synaptic.Network.fromJSON(network)
		});
	}
	console.log('Generation complete.');
}
module.exports.cloneJSON = cloneJSON;
