var canvas = document.getElementById('canvas'); // Get the canvas element
canvas.style.cursor = 'crosshair'; // Set the cursor to a crosshair on the canvas
var ctx = canvas.getContext('2d');  // Create a 2d drawing object

var socket;
var cellSize = 20;  // Size of each cell in the grid
var endPoint = null; // The end point of the path
var startPoint = null; // The start point of the path
var isDrawing = false; // A flag to know if the mouse is being held down
var isEasing = false; // A flag to know if the user is erasing
var isSelectingEnd = false; // A flag to know if the user is selecting the end point
var isSelectingStart = false; // A flag to know if the user is selecting the start point
var endButton = document.getElementById('endButton');
var totalCost = document.getElementById('totalCost');
var eraseButton = document.getElementById('eraseButton');
var startButton = document.getElementById('startButton');
var resetButton = document.getElementById('resetButton');
var submitButton = document.getElementById('submitButton');
var genRandomButton = document.getElementById('genRandomButton');
var changeAlgorithm = document.getElementById('changeAlgorithm');
var selectedAlgorithm = document.getElementById('selectedAlgorithm');

const myDict = { 0: 'Gainsboro', 1: 'LightSlateGray', 2: 'LimeGreen', 3: 'Crimson', 4: 'DodgerBlue', 5: 'DarkOrange', 6: 'Turquoise' };
// 0 free, 1 wall, 2 start, 3 end, 4 path, 5 visited, 6 frontier


// Create a 40x35 grid

var grid = new Array(40);
for (var i = 0; i < grid.length; i++) {
    grid[i] = new Array(35).fill(0);
}


changeAlgorithm.addEventListener('click', function () {
    changeAlgorithm.innerText = selectedAlgorithm.value == 'path.dijkstra' ? 'Selected Algorithm (A-Star A*)' : 'Selected Algorithm (Dijkstra)';
    selectedAlgorithm.value = selectedAlgorithm.value == 'path.dijkstra' ? 'path.astar' : 'path.dijkstra';
});

startButton.addEventListener('click', function () {
    isSelectingStart = true;
    isSelectingEnd = false;
});

endButton.addEventListener('click', function () {
    isSelectingEnd = true;
    isSelectingStart = false;
});

eraseButton.addEventListener('click', function () {
    eraseButton.innerText = isEasing ? 'Erase (drawing)' : 'Erase (erasing)';
    isEasing = !isEasing;
});

genRandomButton.addEventListener('click', function () {
    genRandom();
    drawGrid();
});


submitButton.addEventListener('click', function (event) {
    event.preventDefault();
    submitReset();
    
    if (socket) {
        socket.close(); // Close the socket if it's open
    }
    
    socket = new WebSocket('ws://' + window.location.host + '/ws/path/'); // Create a new WebSocket connection
    
    // When the connection is open, send the data
    socket.onopen = function (event) {
        socket.send(JSON.stringify({
            'grid': grid,
            'type': selectedAlgorithm.value,
        }));
    };
    
    // Handle incoming messages
    socket.onmessage = function (event) {
        var data = JSON.parse(event.data);
        if (data.close) { // If the server sends a close message, close the socket
            totalCost.innerText = data.cost != -1 ? 'The shortest path has a cost of ' + data.cost : 'No path found!'; // Display the cost of the path
            if (data.cost == -1) { return; }
            let path = data.path;
            for (let i = 0; i < path.length; i++) { // Draw the path
                grid[path[i][0]][path[i][1]] = 4;
                fillCell(path[i][0], path[i][1]);
            }
            socket.close();
        } else { // Else, draw the visited and frontier cells
            grid[data.x][data.y] = data.color;
            fillCell(data.x, data.y);
        }
    };
    
    // Handle any errors that occur.
    socket.onerror = function (error) {
        console.log('WebSocket Error: ' + error);
    };
    
    // Close the socket when it's done
    socket.onclose = function (event) {
        console.log('WebSocket connection closed: ' + event.code);
    };
});

// Event listeners for mouse events
canvas.addEventListener('mousedown', function (e) {
    var x = Math.floor(e.offsetX / cellSize);
    var y = Math.floor(e.offsetY / cellSize);
    if (isSelectingStart && grid[x][y] != 1 && grid[x][y] != 3) {
        if (startPoint != null) {
            grid[startPoint.x][startPoint.y] = 0;
        }
        startPoint = { x: x, y: y };
        grid[x][y] = 2;  // 2 represents green
        isSelectingStart = false;
        drawGrid();
    } else if (isSelectingEnd && grid[x][y] != 1 && grid[x][y] != 2) {
        if (endPoint != null) {
            grid[endPoint.x][endPoint.y] = 0;
        }
        endPoint = { x: x, y: y };
        grid[x][y] = 3;  // 3 represents red
        isSelectingEnd = false;
        drawGrid();
    } else if (!isSelectingStart && !isSelectingEnd) {
        isDrawing = true;
    }
});

canvas.addEventListener('mousemove', function (e) {
    var x = Math.floor(e.offsetX / cellSize);
    var y = Math.floor(e.offsetY / cellSize);

    if (isDrawing) {
        if (x >= 0 && x < grid.length && y >= 0 && y < grid[0].length) {
            if ((startPoint != null && x == startPoint.x && y == startPoint.y) ||
                (endPoint != null && x == endPoint.x && y == endPoint.y)) {
                // Do nothing if the mouse is over the start or end point
            } else {
                if (isEasing) {
                    grid[x][y] = 0; // Erase the cell
                    fillCell(x, y);
                } else {
                    grid[x][y] = 1;  // Make a wall
                    fillCell(x, y);
                }
            }
        }
    }
});

resetButton.addEventListener('click', function () {
    if (socket) {
        socket.close();
    }
    grid = new Array(40);
    for (var i = 0; i < grid.length; i++) {
        grid[i] = new Array(35).fill(0);
    }
    startPoint = null;
    endPoint = null;
    drawGrid();
});

window.addEventListener('mouseup', function () {
    isDrawing = false;
});


// Function to generate a random grid
function genRandom() {
    grid = new Array(40);
    for (var i = 0; i < grid.length; i++) {
        grid[i] = new Array(35);
        for (var j = 0; j < grid[i].length; j++) {
            // Generate a random number of 0 or 1
            grid[i][j] = Math.random() < 0.2 ? 1 : 0;
        }
    }
}

// Function to reset the grid when submiting to the server
function submitReset() {
    for (var i = 0; i < grid.length; i++) {
        for (var j = 0; j < grid[i].length; j++) {
            if (grid[i][j] == 4 || grid[i][j] == 5 || grid[i][j] == 6) { // Erase the path, visited and frontier cells 
                grid[i][j] = 0;
                fillCell(i, j);
            }
        }
    }
}

// Function to fill a cell with a color
function fillCell(x, y) {
    ctx.fillStyle = myDict[grid[x][y]];
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

// Function to draw the whole grid
function drawGrid() {
    for (var x = 0; x < grid.length; x++) {
        for (var y = 0; y < grid[x].length; y++) {
            ctx.fillStyle = myDict[grid[x][y]];
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

drawGrid();


