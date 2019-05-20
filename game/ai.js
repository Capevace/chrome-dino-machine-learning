const aiSocket = io.connect('http://localhost:1234');
let updateIntervalId = null;
let runners = null;
let ready = false;

aiSocket.on('reset', data => {
    console.log('resetting');
    ready = false;
    clearInterval(updateIntervalId);
    runners = null;

    document.querySelector('.players').innerHTML = '';

    runners = initPlayers(data.genomeCount, data.generation);

    setTimeout(() => {
        ready = true;
        aiSocket.emit('players-ready');
    }, 2000);
});

aiSocket.on('start', () => {
    if (!ready) {
        console.error('NOT READY YET');
        return;
    }

    runners.forEach(runner => {
        // simulate jump to start game
        const event = new Event('MouseDown');
        event.keyCode = '38';
        event.target = document.body;
        runner.onKeyDown(event);
    });

    updateIntervalId = setInterval(updateTick, 100);
});

function initPlayers(genomeCount, generation) {
    // Reset the players and generate boilerplate
    let newRunners = [];
    document.querySelector('.players').innerHTML = '';

    for (let i = 0; i < genomeCount; i++) {
        const container = document.createElement('div');

        const stats = document.createElement('p');
        stats.classList.add(`dino-stats-${i}`);
        stats.textContent = 'Player ' + (i + 1);

        const player = document.createElement('div');
        player.classList.add('dino-player-' + i);

        container.appendChild(stats);
        container.appendChild(player);

        document.querySelector('.players').appendChild(container);

        newRunners.push(new Runner('.dino-player-' + i));
    }

    return newRunners;
}

function updateTick() {
    let allCrashed = true;

    const inputs = runners.map(runner => {
        if (runner.crashed) {
            return -1;
        } else {
            allCrashed = false;
        }

        const obstacle = runner.horizon.obstacles[0];

        if (!obstacle) {
            return {
                obstacleDistance: Infinity,
                obstacleWidth: 0,
                obstacleSpeed: runner.currentSpeed
            };
        }

        return {
            obstacleDistance: Math.max(0, obstacle.xPos - runner.tRex.xPos),
            obstacleWidth: obstacle.width,
            obstacleSpeed: runner.currentSpeed
        };
    });

    if (allCrashed) {
        const highscores = runners.map(runner => {
            return runner.highestScore;
        });
        aiSocket.emit('gameover', highscores);
        clearInterval(updateIntervalId);
    } else {
        aiSocket.emit('input', inputs, onOutput);
    }
}

function onOutput(outputs) {
    runners.forEach((runner, i) => {
        const action = outputs[i];
        document.querySelector(`.dino-stats-${i}`).textContent = `Player ${i +
            1}: ${action}`;

        // player is dead, ignore output
        if (action === -1) {
            return;
        } else {
            console.log(action);
        }

        switch (action) {
            case 1:
                console.log('jump');
                if (!runner.tRex.jumping && !runner.tRex.ducking) {
                    console.log('jump');
                    runner.tRex.startJump(runner.currentSpeed);
                }
                break;
            case 2:
                if (runner.tRex.jumping) {
                    // Speed drop, activated only when jump key is not pressed.
                    runner.tRex.setSpeedDrop();
                } else if (!runner.tRex.jumping && !runner.tRex.ducking) {
                    // Duck.
                    runner.tRex.setDuck(true);
                }
                break;
            case 0:
            default:
                if (runner.tRex.jumping) {
                    runner.tRex.endJump();
                }
                if (runner.tRex.ducking) {
                    runner.tRex.speedDrop = false;
                    runner.tRex.setDuck(false);
                }
                break;
        }
    });
}

// function onDocumentLoad() {
//     const config = { genomeCount: 1, pollingRate: 100 };
//     runners = initPlayers(config);

// }
