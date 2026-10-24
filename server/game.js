import {WINNING_LINES, CORNER_CELLS,GAME_MODES}from './constants.js'

export class GameError extends Error {
  constructor(message, status = 409, code = "GAME_CONFLICT") {
    super(message);
    this.name = "GameError";
    this.status = status;
    this.code = code;
  }
}

export function createGame(id, mode) {
  if (!GAME_MODES.has(mode)) {
    throw new GameError("Choose either two-player or computer mode.", 400, "INVALID_MODE");
  }
  return {
    id,
    mode,
    board: Array(9).fill(null),
    currentPlayer: "X",
    status: "InProgress",
    winner: null,
    winningCells: [],
    moves: [],
    scoreRecorded: false,
  };
}

export function playMove(game, { player, row, column }) {
  if (game.status !== "InProgress") {
    throw new GameError("This game is already complete.", 409, "GAME_COMPLETE");
  }
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 1 || row > 3 || column < 1 || column > 3) {
    throw new GameError("Row and column must each be between 1 and 3.", 400, "INVALID_POSITION");
  }

  const expectedPlayer = game.currentPlayer;
  if (player !== expectedPlayer || (game.mode === "computer" && player !== "X")) {
    throw new GameError("It is not this player's turn.", 409, "WRONG_PLAYER");
  }

  const cell = (row - 1) * 3 + column - 1;
  if (game.board[cell] !== null) {
    throw new GameError("That cell is already occupied.", 409, "CELL_OCCUPIED");
  }

  applyMove(game, player, cell);

  if (game.mode === "computer" && game.status === "InProgress") {
    const computerCell = chooseComputerMove(game.board);
    if (computerCell !== null) {
      applyMove(game, "O", computerCell);
    }
  }
  return game;
}

export function undoMove(game) {
  if (game.status !== "InProgress") {
    throw new GameError("Undo is unavailable after a game is complete.", 409, "GAME_COMPLETE");
  }
  if (game.moves.length === 0) {
    throw new GameError("There are no moves to undo.", 409, "NOTHING_TO_UNDO");
  }

  const lastMove = game.moves.pop();
  if (game.mode === "computer" && lastMove.player === "O" && game.moves.at(-1)?.player === "X") {
    game.moves.pop();
  }
  rebuildGameState(game);
  return game;
}

export function resetGame(game) {
  game.board = Array(9).fill(null);
  game.currentPlayer = "X";
  game.status = "InProgress";
  game.winner = null;
  game.winningCells = [];
  game.moves = [];
  game.scoreRecorded = false;
  return game;
}

export function chooseComputerMove(board) {
  const winningMove = findTacticalMove(board, "O");
  if (winningMove !== null) return winningMove;

  const blockingMove = findTacticalMove(board, "X");
  if (blockingMove !== null) return blockingMove;

  if (board[4] === null) return 4;

  const openCorner = CORNER_CELLS.find((cell) => board[cell] === null);
  if (openCorner !== undefined) return openCorner;

  const openCell = board.findIndex((cell) => cell === null);
  return openCell === -1 ? null : openCell;
}

function findTacticalMove(board, player) {
  for (const line of WINNING_LINES) {
    const playerCells = line.filter((cell) => board[cell] === player);
    const emptyCells = line.filter((cell) => board[cell] === null);
    if (playerCells.length === 2 && emptyCells.length === 1) return emptyCells[0];
  }
  return null;
}

function applyMove(game, player, cell) {
  game.board[cell] = player;
  game.moves.push({
    moveNumber: game.moves.length + 1,
    player,
    row: Math.floor(cell / 3) + 1,
    column: (cell % 3) + 1,
  });

  const winningLine = WINNING_LINES.find((line) => line.every((position) => game.board[position] === player));
  if (winningLine) {
    game.status = "Won";
    game.winner = player;
    game.winningCells = winningLine;
    game.currentPlayer = null;
    return;
  }

  if (game.board.every((value) => value !== null)) {
    game.status = "Draw";
    game.currentPlayer = null;
    return;
  }

  game.currentPlayer = player === "X" ? "O" : "X";
}

function rebuildGameState(game) {
  const remainingMoves = [...game.moves];
  game.board = Array(9).fill(null);
  game.currentPlayer = "X";
  game.status = "InProgress";
  game.winner = null;
  game.winningCells = [];
  game.scoreRecorded = false;
  game.moves = [];

  for (const move of remainingMoves) {
    const cell = (move.row - 1) * 3 + move.column - 1;
    applyMove(game, move.player, cell);
  }
}