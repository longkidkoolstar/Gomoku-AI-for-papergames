// ==UserScript==
// @name         Gomoku AI
// @namespace    http://tampermonkey.net/
// @version      0.1
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

// Function to make a random move
function makeRandomMove() {
    // Update board state first
    updateBoardState();
    displayBoard(); // Show current board state
    
    // Get all empty cells that are clickable
    let emptyCells = [];
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const cell = document.querySelector(`.cell-${i}-${j}`);
            if (cell && cell.classList.contains('clickable') && board[i][j] === ' ') {
                emptyCells.push({i, j});
            }
        }
    }
    
    console.log(`Found ${emptyCells.length} empty cells`);
    
    // If there are empty cells, make a random move
    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const move = emptyCells[randomIndex];
        
        // Find and click the cell
        const cell = document.querySelector(`.cell-${move.i}-${move.j}`);
        if (cell && cell.classList.contains('clickable')) {
            console.log(`Making move at (${move.i}, ${move.j})`);
            cell.click();
            // Update our local board state
            board[move.i][move.j] = 'X';
            displayBoard(); // Show board after move
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

        if (svgElement.classList.contains('circle-light')) {
            player = 'Blue'; // Player is playing as "Blue"
        } else if (svgElement.classList.contains('circle-dark')) {
            player = 'Red'; // Player is playing as "Red"
        } else {
            console.error("Unexpected circle class");
            return;
        }

        var currentElement = chronometer || numberElement;
        
        // Make Move When It's AI's Turn
        if (currentElement.textContent !== prevChronometerValue && profileOpener) {
            prevChronometerValue = currentElement.textContent;
            setTimeout(makeRandomMove, 1000);  // Add a small delay before making the move
        } else {
            console.log("Waiting for AI's turn...");
        }

 

        async function logBoardState() {
            console.log("Username:", username);
            console.log("Profile Opener:", profileOpener);
            console.log("Chronometer:", chronometer);
            console.log("Number Element:", numberElement);
            console.log("Profile Opener Parent:", profileOpenerParent);
            console.log("SVG Element:", svgElement);
            console.log("Player:", player);
            console.log("Current Element:", currentElement);
        }
        
        setInterval(logBoardState, 1000);
    });
}

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

// Display board state every 5 seconds
setInterval(() => {
    updateBoardState();
    displayBoard();
}, 5000);

// Update board and check for moves every 3 seconds
setInterval(updateBoard, 3000);
