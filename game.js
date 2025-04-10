
// GAME SETTINGS
const DEBUG_MODE = false;
const HIGHSCORE_KEY = "minesweeper-highscore";
const SCORE_KEY = "minesweeper-score";
const DIFFICULTY_KEY = "minesweeper-difficulty";

const NUMBER_COLORS = {
    1: "#3455eb",
    2: "#0c5e0a",
    3: "#cc5510",
    4: "#ff0d00",
    5: "#7a0600"
};

const SCORE_MAP = {
    CELL_REVEAL_BASE: 1,
    WIN_BONUS: 5
}

const DIFF_MAP = {
    EASY: {
        size: 12,
        mines: 10
    },

    NORMAL: {
        size: 14,
        mines: 20
    },

    HARD: {
        size: 20,
        mines: 40
    },
}

// GAME
const GRID = document.getElementById("grid-container");
let GridSize = 12;
let TotalMines = 10;
let flaggedCells = 0;
let gameOver = false;
let revealedCells = 0;
let firstClick = true;
let scoreStartedWith = 0;
let score = 0;
let currDifficulty;

// INFO BOARD
const minesLeftLabel = document.getElementById("mines-left");
const debugPosLabel = document.getElementById("debug-pos");
const refreshButton = document.getElementById("refresh-btn");
const scoreLabel = document.getElementById("score");
const highscoreLabel = document.getElementById("highscore");
const difficultySelection = document.getElementById("difficulty");

let GameGrid = [];

// after html is loaded
function OnStart()
{
    LoadDifficulty();

    GRID.style.gridTemplateColumns = `repeat(${GridSize}, minmax(20px, 1fr))`;
    GRID.style.gridTemplateRows = `repeat(${GridSize}, minmax(20px, 1fr))`;
    LoadGrid();

    if (!DEBUG_MODE)
        debugPosLabel.style.display = "none";

    minesLeftLabel.innerHTML = TotalMines;

    let prevScore = parseInt(localStorage.getItem(SCORE_KEY));

    if (prevScore)
    {
        scoreStartedWith = prevScore;
        score = prevScore;
        scoreLabel.innerHTML = score;
    }
    else
    {
        scoreStartedWith = 0;
        score = 0;
        scoreLabel.innerHTML = "0";
    }
        

    let highscore = localStorage.getItem(HIGHSCORE_KEY);

    if (highscore)
        highscoreLabel.innerHTML = highscore;
    else
        highscoreLabel.innerHTML = "0";

    const gridCells = document.querySelectorAll('.grid-cell');
    const fontSize = 24 / GridSize;
    
    gridCells.forEach(cell => 
    {
        cell.style.fontSize = fontSize + "rem";
    });

    difficultySelection.addEventListener("change", (event) => 
    {
        const selectedDifficulty = event.target.value;
        localStorage.setItem(DIFFICULTY_KEY, selectedDifficulty);
        window.location.reload();
    });
}

function LoadDifficulty()
{
    currDifficulty = localStorage.getItem(DIFFICULTY_KEY);

    if (!currDifficulty) 
        currDifficulty = "easy";

    difficultySelection.value = currDifficulty;

    let diffMap;

    switch(currDifficulty)
    {
        case "easy":
            diffMap = DIFF_MAP.EASY;
            break;

        case "normal":
            diffMap = DIFF_MAP.NORMAL;
            break;

        case "hard":
            diffMap = DIFF_MAP.HARD;
            break;

        default:
            console.log("ERROR: difficulty of type (" + currDifficulty + ") not found.")
            diffMap = DIFF_MAP.EASY;
            break;
    }

    GridSize = diffMap.size;
    TotalMines = diffMap.mines;
}

function LoadGrid()
{
    for (let i = 0; i < GridSize * GridSize; i++)
    {
        let x = i % GridSize;
        let y = Math.floor(i / GridSize);

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
            GameGrid[x][y]["hover_event"] = cell.addEventListener("mouseenter", () => debugPosLabel.innerHTML = GetPosAsString(GameGrid[x][y]));

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

    for (let x = 0; x < GridSize; x++) 
    {
        for (let y = 0; y < GridSize; y++) 
        {
            if (x !== firstClickX && y !== firstClickY) 
            {
                allCells.push({ x, y });
            }
        }
    }

    allCells = shuffle(allCells);

    for (let i = 0; i < allCells.length && placedMines < TotalMines; i++) 
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
    return x >= 0 && x < GridSize && y >= 0 && y < GridSize;
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

    AddScore(SCORE_MAP.CELL_REVEAL_BASE);
    Log("+ " + SCORE_MAP.CELL_REVEAL_BASE + " for revealing " + GetPosAsString(cellInfo) + " (fill)");

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
    if (gameOver || cellInfo.flagged || cellInfo.revealed) return;

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

        let cellScore = SCORE_MAP.CELL_REVEAL_BASE + (CountAdjacentMines(cellInfo) * 2);
        AddScore(cellScore);
        Log("+ " + cellScore + " for revealing " + GetPosAsString(cellInfo));
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

    minesLeftLabel.innerHTML = TotalMines - flaggedCells;
}

function CheckWinCondition() 
{
    if (revealedCells === GridSize * GridSize - TotalMines)
    {
        GameOver(true);
    }
}

function GameOver(won) 
{
    gameOver = true;

    if (won)
    {
        for (let x = 0; x < GridSize; x++) 
        {
            for (let y = 0; y < GridSize; y++) 
            {
                if (GameGrid[x][y].is_mine && GameGrid[x][y].flag_img === undefined)
                {
                    GameGrid[x][y].cell.classList.add("flagged");
                    FlagImage(GameGrid[x][y]);
                }
            }
        }

        AddScore(SCORE_MAP.WIN_BONUS * TotalMines);
        Log("+ " + (SCORE_MAP.WIN_BONUS * TotalMines) + " for win");
        minesLeftLabel.innerHTML = "0";
        setTimeout(() => alert("You Win! 🎉"), 100);
    } 
    else 
    {
        GRID.classList.add("shake");
        RevealAllMines();
        score = 0;
        scoreLabel.innerHTML = "0";
        localStorage.setItem(SCORE_KEY, 0);
        Log("SCORE SET TO 0 FOR LOSING");
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
    for (let x = 0; x < GridSize; x++) 
    {
        for (let y = 0; y < GridSize; y++) 
        {
            if (GameGrid[x][y].is_mine) 
            {
                MineImage(GameGrid[x][y]);
            }
        }
    }
}

function AddScore(amount)
{
    score += amount;
    scoreLabel.innerHTML = score;
    localStorage.setItem(SCORE_KEY, score);
    UpdateHighScore();
}

function UpdateHighScore()
{
    let prevHighscore = localStorage.getItem(HIGHSCORE_KEY);

    if (score > prevHighscore)
    {
        localStorage.setItem(HIGHSCORE_KEY, score);
        highscoreLabel.innerHTML = score;
    }
}

function Log(message)
{
    if (DEBUG_MODE)
        console.log(message);
}

function GetPosAsString(cellInfo)
{
    return "(" + cellInfo.x + "," + cellInfo.y + ")";
}

function OnRefreshPage()
{
    if (!gameOver)
    {
        localStorage.setItem(SCORE_KEY, scoreStartedWith);
    }
}

// bootstrap game when html document is loaded
document.addEventListener("DOMContentLoaded", () => OnStart());
refreshButton.addEventListener("click", () => window.location.reload());
window.addEventListener('beforeunload', () => OnRefreshPage());
