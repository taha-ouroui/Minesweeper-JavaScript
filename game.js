
// GAME SETTINGS
const GRID_SIZE = 12;
const DEBUG_MODE = false;
const TOTAL_MINES = 10;

// GAME
const GRID = document.getElementById("grid-container");
let flaggedCells = 0;
let gameOver = false;
let revealedCells = 0;
let firstClick = true;

// INFO BOARD
const minesLeftLabel = document.getElementById("mines-left");
const debugPosLabel = document.getElementById("debug-pos");
const refreshButton = document.getElementById("refresh-btn");

const NUMBER_COLORS = {
    1: "#3455eb",
    2: "#0c5e0a",
    3: "#cc5510",
    4: "#ff0d00",
    5: "#7a0600"
};

let GameGrid = [];

// after html is loaded
function OnStart()
{
    LoadGrid();

    if (!DEBUG_MODE)
        debugPosLabel.style.display = "none";

    minesLeftLabel.innerHTML = TOTAL_MINES;
}

function LoadGrid()
{
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++)
    {
        let x = i % GRID_SIZE;
        let y = Math.floor(i / GRID_SIZE);

        if (GameGrid[x] === undefined)
            GameGrid[x] = [];

        let cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.classList.add("prevent-select");
        cell.textContent = "";
        GRID.appendChild(cell);

        GameGrid[x][y] = 
        {
            "cell": cell,
            "x": x,
            "y": y,
            "is_mine": false,
            "revealed": false,
            "flagged": false,
            "click_event": cell.addEventListener("click", () => OnCellClick(GameGrid[x][y])),
            "flag_event": cell.addEventListener("contextmenu", (event) => 
                {
                    event.preventDefault();
                    OnCellFlag(GameGrid[x][y]);
                })
        };

        if (DEBUG_MODE)
            GameGrid[x][y]["hover_event"] = cell.addEventListener("mouseenter", () => debugPosLabel.innerHTML = "(" + x + "," + y + ")");

    }
}

function IsAdjacentToFirstClick(x, y, firstClickX, firstClickY) {
    for (let dx = -1; dx <= 1; dx++) 
    {
        for (let dy = -1; dy <= 1; dy++) 
        {
            let nx = firstClickX + dx;
            let ny = firstClickY + dy;
            if (nx === x && ny === y) return true;
        }
    }
    return false;
}

function LoadMines(firstClickX = -1, firstClickY = -1)
{
    let allCells = [];
    let placedMines = 0;

    for (let x = 0; x < GRID_SIZE; x++) 
    {
        for (let y = 0; y < GRID_SIZE; y++) 
        {
            if (x !== firstClickX && y !== firstClickY) 
            {
                allCells.push({ x, y });
            }
        }
    }

    allCells = shuffle(allCells);

    for (let i = 0; i < allCells.length && placedMines < TOTAL_MINES; i++) 
    {
        let { x, y } = allCells[i];

        if (!GameGrid[x][y].is_mine && x !== firstClickX && y !== firstClickY && !IsAdjacentToFirstClick(x, y, firstClickX, firstClickY)) 
        {
            GameGrid[x][y].is_mine = true;
            if (DEBUG_MODE) GameGrid[x][y].cell.classList.add("mine-debug");
            placedMines++;
        }
    }
}

// Fisher-Yates shuffle algorithm
function shuffle(array) 
{
    for (let i = array.length - 1; i > 0; i--) 
    {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function IsWithinBounds(x, y)
{
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function CountAdjacentMines(cellInfo)
{
    let mineCount = 0;
    let x = cellInfo.x;
    let y = cellInfo.y;

    for (let dx = -1; dx <= 1; dx++)
    {
        for (let dy = -1; dy <= 1; dy++) 
        {
            if (dx === 0 && dy === 0) continue; // Ignore the current cell

            let nx = x + dx;
            let ny = y + dy;

            if (IsWithinBounds(nx, ny) && GameGrid[nx][ny].is_mine) 
            {
                mineCount++;
            }
        }
    }

    return mineCount;
}

function FloodFillClear(cellInfo) 
{
    let x = cellInfo.x;
    let y = cellInfo.y;

    if (cellInfo.revealed) return;

    cellInfo.revealed = true;
    revealedCells++;
    cellInfo.cell.classList.add("revealed");
    cellInfo.cell.removeEventListener("click", cellInfo.click_event);
    cellInfo.cell.removeEventListener("contextmenu", cellInfo.flag_event);

    CheckWinCondition();

    let adjacentMines = CountAdjacentMines(cellInfo);
    
    if (adjacentMines > 0) 
    {
        cellInfo.cell.innerHTML = adjacentMines;
        cellInfo.cell.style.color = NUMBER_COLORS[adjacentMines];
        return;
    }

    for (let dx = -1; dx <= 1; dx++) 
    {
        for (let dy = -1; dy <= 1; dy++) 
        {
            if (dx === 0 && dy === 0) continue;

            let nx = x + dx;
            let ny = y + dy;

            if (IsWithinBounds(nx, ny)) 
            {
                FloodFillClear(GameGrid[nx][ny]);
            }
        }
    }
}

function OnCellClick(cellInfo)
{
    if (gameOver || cellInfo.flagged) return;

    if (firstClick) 
    {
        firstClick = false;
        LoadMines(cellInfo.x, cellInfo.y);
    }

    if (cellInfo.is_mine) 
    {
        GameOver(false);
    } 
    else 
    {
        FloodFillClear(cellInfo);
    }
}

function FlagImage(cellInfo)
{
    let img = document.createElement("img");
    img.setAttribute("src", "assets/image/flag.png");
    img.setAttribute("alt", "flag");
    img.classList.add("cell-image");
    cellInfo.cell.appendChild(img);
    cellInfo["flag_img"] = img;
}

function OnCellFlag(cellInfo)
{
    if (gameOver || cellInfo.revealed) return;
    
    if (!cellInfo.flagged)
    {
        cellInfo.flagged = true;
        cellInfo.cell.classList.add("flagged");
        flaggedCells++;
        FlagImage(cellInfo);
    }
    else
    {
        cellInfo.flagged = false;
        cellInfo.cell.classList.remove("flagged");
        flaggedCells--;
        cellInfo.cell.removeChild(cellInfo.flag_img);
        delete cellInfo.flag_img;
    }

    minesLeftLabel.innerHTML = TOTAL_MINES - flaggedCells;
}

function CheckWinCondition() 
{
    if (revealedCells === GRID_SIZE * GRID_SIZE - TOTAL_MINES)
    {
        GameOver(true);
    }
}

function GameOver(won) 
{
    gameOver = true;

    if (won) 
    {
        for (let x = 0; x < GRID_SIZE; x++) 
        {
            for (let y = 0; y < GRID_SIZE; y++) 
            {
                if (GameGrid[x][y].is_mine) 
                {
                    GameGrid[x][y].cell.classList.add("flagged");
                    FlagImage(GameGrid[x][y]);
                }
            }
        }

        minesLeftLabel.innerHTML = "0";
        setTimeout(() => alert("You Win! 🎉"), 100);
    } 
    else 
    {
        GRID.classList.add("shake");
        RevealAllMines();
        setTimeout(() => 
        {
            alert("Game Over! 💥 You hit a mine!");
            window.location.reload();
        }
        , 100);
    }
}

function MineImage(cellInfo)
{
    if (cellInfo.flag_img !== undefined)
    {
        cellInfo.cell.removeChild(cellInfo.flag_img);
        delete cellInfo.flag_img;
    }

    let img = document.createElement("img");
    img.setAttribute("src", "assets/image/explosion.png");
    img.setAttribute("alt", "mine");
    img.classList.add("cell-image");
    cellInfo.cell.classList.add("mine");
    cellInfo.cell.appendChild(img);
}

function RevealAllMines() 
{
    for (let x = 0; x < GRID_SIZE; x++) 
    {
        for (let y = 0; y < GRID_SIZE; y++) 
        {
            if (GameGrid[x][y].is_mine) 
            {
                MineImage(GameGrid[x][y]);
            }
        }
    }
}

// bootstrap game when html document is loaded
document.addEventListener("DOMContentLoaded", () => OnStart());
refreshButton.addEventListener("click", () => window.location.reload());