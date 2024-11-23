// ==UserScript==
// @name         Gomoku AI
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  AI for Gomoku on papergames
// @author       You
// @match        https://papergames.io/en/gomoku*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=papergames.io
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==

var prevChronometerValue = null;
var player;

// Board state (15x15 array)
var board = Array(15).fill().map(() => Array(15).fill(' '));

// Function to display the board state
function displayBoard() {
    console.log('Current Board State:');
    let output = '';
    for (let i = 0; i < 15; i++) {
        let row = '';
        for (let j = 0; j < 15; j++) {
            row += (board[i][j] === ' ' ? '.' : board[i][j]) + ' ';
        }
        output += row + '\n';
    }
    console.log(output);
}

// Function to update board state from UI
function updateBoardState() {
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const cell = document.querySelector(`.cell-${i}-${j}`);
            if (cell) {
                const hasLight = cell.querySelector('.circle-light');
                const hasDark = cell.querySelector('.circle-dark');
                board[i][j] = hasLight ? 'O' : (hasDark ? 'X' : ' ');
            }
        }
    }
}

// Cache for evaluated positions
const evaluationCache = new Map();

// Get a unique key for board position
function getBoardKey(board) {
    return board.map(row => row.join('')).join('|');
}

// Evaluate a line of 5 positions
function evaluateLine(line) {
    const counts = {
        'X': 0,
        'O': 0,
        ' ': 0
    };
    
    for (let cell of line) {
        counts[cell]++;
    }
    
    const opponent = player === 'X' ? 'O' : 'X';
    
    // Immediate win/loss conditions (for non-immediate threat evaluation)
    if (counts[player] === 4 && counts[' '] === 1) return 1000000;   // Our winning move
    if (counts[opponent] === 4 && counts[' '] === 1) return -800000; // Opponent winning threat
    
    // Win conditions
    if (counts[player] === 5) return 500000;
    if (counts[opponent] === 5) return -500000;
    
    // Potential threats
    if (counts[' '] === 2) {
        if (counts[opponent] === 3) return -10000; // Opponent's developing threat
        if (counts[player] === 3) return 15000;    // Our developing threat (prioritize offense slightly)
    }
    
    // Development patterns
    if (counts[' '] >= 2) {
        if (counts[player] === 3) return 2000;     // Prioritize our development
        if (counts[opponent] === 3) return -1500;
        if (counts[player] === 2) return 200;
        if (counts[opponent] === 2) return -150;
    }
    
    return (counts[player] - counts[opponent]) * 10;
}

// Get all possible lines of 5 that include the given position
function getLinesAt(board, row, col) {
    const lines = [];
    const directions = [
        [1, 0],   // Vertical
        [0, 1],   // Horizontal
        [1, 1],   // Diagonal
        [1, -1]   // Anti-diagonal
    ];
    
    for (let [dx, dy] of directions) {
        for (let i = -4; i <= 0; i++) {
            const line = [];
            let valid = true;
            
            for (let j = 0; j < 5; j++) {
                const x = row + (i + j) * dx;
                const y = col + (i + j) * dy;
                
                if (x < 0 || x >= 15 || y < 0 || y >= 15) {
                    valid = false;
                    break;
                }
                line.push(board[x][y]);
            }
            
            if (valid) {
                lines.push(line);
            }
        }
    }
    
    return lines;
}

// Cache for threat detection
const threatCache = new Map();

// Check if a sequence of pieces could lead to a win
function isWinningMove(board, row, col) {
    const piece = board[row][col];
    
    // Check horizontal
    let count = 1;
    let i = col - 1;
    while (i >= 0 && board[row][i] === piece) {
        count++;
        i--;
    }
    i = col + 1;
    while (i < 15 && board[row][i] === piece) {
        count++;
        i++;
    }
    if (count >= 5) return true;
    
    // Check vertical
    count = 1;
    i = row - 1;
    while (i >= 0 && board[i][col] === piece) {
        count++;
        i--;
    }
    i = row + 1;
    while (i < 15 && board[i][col] === piece) {
        count++;
        i++;
    }
    if (count >= 5) return true;
    
    // Check diagonal (top-left to bottom-right)
    count = 1;
    i = row - 1;
    let j = col - 1;
    while (i >= 0 && j >= 0 && board[i][j] === piece) {
        count++;
        i--;
        j--;
    }
    i = row + 1;
    j = col + 1;
    while (i < 15 && j < 15 && board[i][j] === piece) {
        count++;
        i++;
        j++;
    }
    if (count >= 5) return true;
    
    // Check diagonal (top-right to bottom-left)
    count = 1;
    i = row - 1;
    j = col + 1;
    while (i >= 0 && j < 15 && board[i][j] === piece) {
        count++;
        i--;
        j++;
    }
    i = row + 1;
    j = col - 1;
    while (i < 15 && j >= 0 && board[i][j] === piece) {
        count++;
        i++;
        j--;
    }
    if (count >= 5) return true;
    
    return false;
}

// Find immediate threats that need to be blocked
function findImmediateThreats(board) {
    const opponent = player === 'X' ? 'O' : 'X';
    const threats = [];
    
    // Check every empty position
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (board[i][j] === ' ') {
                // First check if we can win
                board[i][j] = player;
                if (isWinningMove(board, i, j)) {
                    board[i][j] = ' ';
                    console.log(`Found winning move at (${i}, ${j})`);
                    return [{i, j, priority: 1000000}];
                }
                
                // Then check for opponent wins
                board[i][j] = opponent;
                if (isWinningMove(board, i, j)) {
                    board[i][j] = ' ';
                    console.log(`Found critical blocking move at (${i}, ${j})`);
                    threats.push({i, j, priority: 900000});
                    continue;
                }
                
                // Check for sequences of 4 that could lead to a win
                let maxOpponentSeq = 0;
                
                // Check horizontal
                let count = 0;
                let open = 0;
                for (let k = Math.max(0, j - 4); k <= Math.min(14, j + 4); k++) {
                    if (k === j) continue;
                    if (board[i][k] === opponent) count++;
                    else if (board[i][k] === ' ') open++;
                    else {
                        count = 0;
                        open = 0;
                    }
                    if (count === 4 && open > 0) {
                        maxOpponentSeq = 4;
                        break;
                    }
                }
                
                // Check vertical
                if (maxOpponentSeq < 4) {
                    count = 0;
                    open = 0;
                    for (let k = Math.max(0, i - 4); k <= Math.min(14, i + 4); k++) {
                        if (k === i) continue;
                        if (board[k][j] === opponent) count++;
                        else if (board[k][j] === ' ') open++;
                        else {
                            count = 0;
                            open = 0;
                        }
                        if (count === 4 && open > 0) {
                            maxOpponentSeq = 4;
                            break;
                        }
                    }
                }
                
                // Diagonals
                if (maxOpponentSeq < 4) {
                    // Top-left to bottom-right
                    count = 0;
                    open = 0;
                    for (let k = -4; k <= 4; k++) {
                        if (k === 0) continue;
                        const ni = i + k;
                        const nj = j + k;
                        if (ni >= 0 && ni < 15 && nj >= 0 && nj < 15) {
                            if (board[ni][nj] === opponent) count++;
                            else if (board[ni][nj] === ' ') open++;
                            else {
                                count = 0;
                                open = 0;
                            }
                            if (count === 4 && open > 0) {
                                maxOpponentSeq = 4;
                                break;
                            }
                        }
                    }
                }
                
                if (maxOpponentSeq < 4) {
                    // Top-right to bottom-left
                    count = 0;
                    open = 0;
                    for (let k = -4; k <= 4; k++) {
                        if (k === 0) continue;
                        const ni = i + k;
                        const nj = j - k;
                        if (ni >= 0 && ni < 15 && nj >= 0 && nj < 15) {
                            if (board[ni][nj] === opponent) count++;
                            else if (board[ni][nj] === ' ') open++;
                            else {
                                count = 0;
                                open = 0;
                            }
                            if (count === 4 && open > 0) {
                                maxOpponentSeq = 4;
                                break;
                            }
                        }
                    }
                }
                
                if (maxOpponentSeq === 4) {
                    console.log(`Found sequence of 4 at (${i}, ${j})`);
                    threats.push({i, j, priority: 850000});
                }
                
                board[i][j] = ' ';
            }
        }
    }
    
    return threats;
}

// Evaluate threat level of a line
function evaluateThreat(line) {
    const opponent = player === 'X' ? 'O' : 'X';
    let threatLevel = 0;
    
    // Count pieces
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;
    
    for (const cell of line) {
        if (cell === player) playerCount++;
        else if (cell === opponent) opponentCount++;
        else emptyCount++;
    }
    
    // Evaluate threat level
    if (opponentCount === 4 && emptyCount === 1) return 90000; // Must block
    if (opponentCount === 3 && emptyCount === 2) return 5000;  // Should block
    if (opponentCount === 2 && emptyCount === 3) return 1000;  // Potential threat
    
    return threatLevel;
}

// Cache for move evaluations
const moveCache = new Map();

// Find best move with caching
function findBestMove(board) {
    // Clear move cache at the start of each turn
    moveCache.clear();
    
    const moves = getValidMoves(board);
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Sort and deduplicate moves
    const uniqueMoves = new Map();
    for (const move of moves) {
        const key = `${move.i},${move.j}`;
        if (!uniqueMoves.has(key) || move.priority > uniqueMoves.get(key).priority) {
            uniqueMoves.set(key, move);
        }
    }
    
    const finalMoves = Array.from(uniqueMoves.values());
    
    // Only show priorities once at the start
    console.log('Initial Move Priorities:', 
        finalMoves.slice(0, 5).map(m => `(${m.i},${m.j}): ${m.priority}`));
    
    for (const move of finalMoves) {
        board[move.i][move.j] = player;
        const score = minimax(board, 3, -Infinity, Infinity, false);
        board[move.i][move.j] = ' ';
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    // Log only the final chosen move
    if (bestMove) {
        console.log(`Selected move (${bestMove.i},${bestMove.j}) with score ${bestScore}`);
    }
    
    return bestMove;
}

// Minimax with caching
function minimax(board, depth, alpha, beta, isMaximizing) {
    const boardKey = getBoardKey(board) + depth + isMaximizing;
    
    // Check cache first
    if (moveCache.has(boardKey)) {
        return moveCache.get(boardKey);
    }
    
    if (depth === 0) {
        const score = evaluatePosition(board);
        moveCache.set(boardKey, score);
        return score;
    }
    
    const moves = getValidMoves(board);
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            board[move.i][move.j] = player;
            const eval = minimax(board, depth - 1, alpha, beta, false);
            board[move.i][move.j] = ' ';
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        moveCache.set(boardKey, maxEval);
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            board[move.i][move.j] = player === 'X' ? 'O' : 'X';
            const eval = minimax(board, depth - 1, alpha, beta, true);
            board[move.i][move.j] = ' ';
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        moveCache.set(boardKey, minEval);
        return minEval;
    }
}

// Get valid moves without redundant priority calculations
function getValidMoves(board) {
    // Check if this is the first move (empty board)
    let isEmpty = true;
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (board[i][j] !== ' ') {
                isEmpty = false;
                break;
            }
        }
        if (!isEmpty) break;
    }
    
    // If it's the first move, return the center position
    if (isEmpty) {
        const center = Math.floor(15 / 2);
        console.log('First move - playing center position');
        return [{i: center, j: center, priority: 1000000}];
    }

    const opponent = player === 'X' ? 'O' : 'X';
    let criticalMoves = [];
    
    // First pass: Find all critical moves (wins and must-blocks)
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (board[i][j] === ' ') {
                // Check if we can win
                board[i][j] = player;
                const isWinningForUs = isWinningMove(board, i, j);
                board[i][j] = ' ';

                // Check if opponent can win
                board[i][j] = opponent;
                const isWinningForThem = isWinningMove(board, i, j);
                board[i][j] = ' ';

                if (isWinningForUs) {
                    console.log(`Found winning move at (${i}, ${j})`);
                    criticalMoves.push({i, j, priority: 1000000});
                }
                if (isWinningForThem) {
                    console.log(`Found critical blocking move at (${i}, ${j})`);
                    criticalMoves.push({i, j, priority: 900000});
                }
            }
        }
    }

    // If we have any winning moves, take the win
    const winningMoves = criticalMoves.filter(m => m.priority === 1000000);
    if (winningMoves.length > 0) {
        console.log('Taking winning move');
        return [winningMoves[0]];
    }

    // If opponent has winning moves, we must block
    const blockingMoves = criticalMoves.filter(m => m.priority === 900000);
    if (blockingMoves.length > 0) {
        console.log('Must block opponent win');
        return [blockingMoves[0]];
    }

    // No critical moves, evaluate strategic moves
    const moves = [];
    
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (board[i][j] === ' ') {
                // Only consider moves near existing pieces
                let hasNeighbor = false;
                for (let di = -2; di <= 2; di++) {
                    for (let dj = -2; dj <= 2; dj++) {
                        if (di === 0 && dj === 0) continue;
                        const ni = i + di;
                        const nj = j + dj;
                        if (ni >= 0 && ni < 15 && nj >= 0 && nj < 15 && 
                            board[ni][nj] !== ' ') {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if (hasNeighbor) break;
                }
                
                if (hasNeighbor) {
                    let priority = 0;
                    const lines = getLinesAt(board, i, j);
                    
                    // Evaluate offensive potential
                    board[i][j] = player;
                    for (const line of lines) {
                        let playerCount = 0;
                        let emptyCount = 0;
                        let blocked = false;
                        for (const cell of line) {
                            if (cell === player) playerCount++;
                            else if (cell === ' ') emptyCount++;
                            else {
                                blocked = true;
                                break;
                            }
                        }
                        
                        if (!blocked) {
                            // Strongly prioritize creating threats
                            if (playerCount === 3 && emptyCount === 2) priority += 8000;
                            else if (playerCount === 2 && emptyCount === 3) priority += 2000;
                            priority += playerCount * 100;
                        }
                    }
                    board[i][j] = ' ';
                    
                    // Evaluate defensive needs
                    board[i][j] = opponent;
                    for (const line of lines) {
                        let opponentCount = 0;
                        let emptyCount = 0;
                        let blocked = false;
                        for (const cell of line) {
                            if (cell === opponent) opponentCount++;
                            else if (cell === ' ') emptyCount++;
                            else {
                                blocked = true;
                                break;
                            }
                        }
                        
                        if (!blocked) {
                            // Prioritize preventing opponent threats
                            if (opponentCount === 3 && emptyCount === 2) priority += 7000;
                            else if (opponentCount === 2 && emptyCount === 3) priority += 1500;
                        }
                    }
                    board[i][j] = ' ';
                    
                    // Add position-based bonus
                    const centerDist = Math.abs(i - 7) + Math.abs(j - 7);
                    priority += (14 - centerDist) * 10;
                    
                    moves.push({i, j, priority});
                }
            }
        }
    }
    
    // Sort moves by priority (highest first)
    moves.sort((a, b) => b.priority - a.priority);
    
    // Take top moves
    const topMoves = moves.slice(0, 15);
    
    if (topMoves.length > 0) {
        console.log('Top moves:', topMoves.slice(0, 5).map(m => 
            `(${m.i},${m.j}): ${m.priority}`
        ).join(', '));
    }
    
    return topMoves;
}

// Evaluate the board position
function evaluatePosition(board) {
    let score = 0;
    
    // Check all possible lines on the board
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const lines = getLinesAt(board, i, j);
            for (let line of lines) {
                score += evaluateLine(line);
            }
        }
    }
    
    return score;
}

// Make the best move
function makeBestMove() {
    updateBoardState();
    displayBoard();
    console.log(`AI (${player}) is thinking...`);
    
    const move = findBestMove(board);
    
    if (move) {
        const cell = document.querySelector(`.cell-${move.i}-${move.j}`);
        if (cell && cell.classList.contains('clickable')) {
            console.log(`AI (${player}) making move at (${move.i}, ${move.j})`);
            cell.click();
            board[move.i][move.j] = player;
            displayBoard();
        }
    } else {
        console.log('No valid moves available');
    }
}

function updateBoard() {
    GM.getValue("username").then(function(username) {
        var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
        var profileOpener = null;

        profileOpeners.forEach(function(opener) {
            if (opener.textContent.trim() === username) {
                profileOpener = opener;
            }
        });

        if (!profileOpener) {
            console.error("Profile opener not found");
            return;
        }

        var chronometer = document.querySelector("app-chronometer");
        var numberElement = profileOpener.parentNode ? profileOpener.parentNode.querySelectorAll("span")[4] : null;
        var profileOpenerParent = profileOpener.parentNode ? profileOpener.parentNode.parentNode : null;

        var svgElement = profileOpenerParent.querySelector("circle[class*='circle-light'], circle[class*='circle-dark']");
        if (!svgElement) {
            console.error("SVG element not found");
            return;
        }

        // Determine which player we are and log it
        if (svgElement.classList.contains('circle-light')) {
            player = 'O';  // Light circles are O
            console.log('AI is playing as Light circles (O)');
        } else if (svgElement.classList.contains('circle-dark')) {
            player = 'X';  // Dark circles are X
            console.log('AI is playing as Dark circles (X)');
        } else {
            console.error("Unexpected circle class");
            return;
        }

        var currentElement = chronometer || numberElement;
        
        // Check if it's our turn by looking for clickable cells
        const anyClickableCell = document.querySelector('.cell-0-0.clickable, .cell-7-7.clickable');
        const isOurTurn = anyClickableCell !== null;
        
        if (currentElement.textContent !== prevChronometerValue) {
            prevChronometerValue = currentElement.textContent;
            
            if (isOurTurn) {
                console.log(`It's AI's turn - playing as ${player}`);
                setTimeout(makeBestMove, 1000);
            } else {
                console.log(`Opponent's turn - AI (${player}) waiting`);
            }
        } else {
            if (isOurTurn) {
                console.log(`Still AI's turn - ${player}`);
            } else {
                console.log(`Still waiting for turn - AI is ${player}`);
            }
        }
    });
}

// Only update board state every 5 seconds if it's our turn
setInterval(() => {
    const anyClickableCell = document.querySelector('.cell-0-0.clickable, .cell-7-7.clickable');
    if (anyClickableCell !== null) {
        updateBoardState();
        displayBoard();
    }
}, 5000);

// Only check for moves when cells are clickable (our turn)
setInterval(() => {
    const anyClickableCell = document.querySelector('.cell-0-0.clickable, .cell-7-7.clickable');
    if (anyClickableCell !== null) {
        updateBoard();
    }
}, 3000);

// Check if username is stored in GM storage
GM.getValue('username').then(function(username) {
    if (!username) {
        // Alert the user
        alert('Username is not stored in GM storage.');

        // Prompt the user to enter the username
        username = prompt('Please enter your Papergames username (case-sensitive):');

        // Save the username to GM storage
        GM.setValue('username', username);
    }
});

// Clear evaluation cache periodically to prevent memory buildup
setInterval(() => {
    evaluationCache.clear();
}, 30000); // Clear every 30 seconds
