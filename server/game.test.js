import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseComputerMove,
  createGame,
  playMove,
  resetGame,
  undoMove,
} from "./game.js";

function playSequence(mode, moves) {
  const game = createGame("test-game", mode);
  for (const [player, row, column] of moves) {
    playMove(game, { player, row, column });
  }
  return game;
}

test("creates a fresh game with X to move", () => {
  const game = createGame("game-1", "two-player");
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.currentPlayer, "X");
  assert.equal(game.status, "InProgress");
  assert.deepEqual(game.moves, []);
});

test("valid moves alternate turns and record one-based positions", () => {
  const game = createGame("game-1", "two-player");
  playMove(game, { player: "X", row: 1, column: 2 });
  playMove(game, { player: "O", row: 3, column: 1 });
  assert.equal(game.board[1], "X");
  assert.equal(game.board[6], "O");
  assert.equal(game.currentPlayer, "X");
  assert.deepEqual(game.moves[0], { moveNumber: 1, player: "X", row: 1, column: 2 });
});

test("invalid moves leave game state unchanged", () => {
  const game = createGame("game-1", "two-player");
  playMove(game, { player: "X", row: 1, column: 1 });
  const before = structuredClone(game);
  assert.throws(() => playMove(game, { player: "X", row: 2, column: 2 }), { code: "WRONG_PLAYER" });
  assert.throws(() => playMove(game, { player: "O", row: 1, column: 1 }), { code: "CELL_OCCUPIED" });
  assert.throws(() => playMove(game, { player: "O", row: 4, column: 1 }), { code: "INVALID_POSITION" });
  assert.deepEqual(game, before);
});

test("detects wins across rows, columns, and diagonals", () => {
  const winSequences = [
    [["X", 1, 1], ["O", 2, 1], ["X", 1, 2], ["O", 2, 2], ["X", 1, 3]],
    [["X", 1, 1], ["O", 1, 2], ["X", 2, 1], ["O", 2, 2], ["X", 3, 1]],
    [["X", 1, 1], ["O", 1, 2], ["X", 2, 2], ["O", 1, 3], ["X", 3, 3]],
  ];

  for (const sequence of winSequences) {
    const game = playSequence("two-player", sequence);
    assert.equal(game.status, "Won");
    assert.equal(game.winner, "X");
    assert.equal(game.winningCells.length, 3);
    assert.equal(game.currentPlayer, null);
  }
});

test("detects a draw when all cells are filled without a winner", () => {
  const game = playSequence("two-player", [
    ["X", 1, 1], ["O", 1, 2], ["X", 1, 3],
    ["O", 2, 2], ["X", 2, 1], ["O", 3, 1],
    ["X", 2, 3], ["O", 3, 3], ["X", 3, 2],
  ]);
  assert.equal(game.status, "Draw");
  assert.equal(game.winner, null);
  assert.equal(game.board.every((cell) => cell !== null), true);
});

test("rejects moves after completion", () => {
  const game = playSequence("two-player", [
    ["X", 1, 1], ["O", 2, 1], ["X", 1, 2], ["O", 2, 2], ["X", 1, 3],
  ]);
  assert.throws(() => playMove(game, { player: "O", row: 3, column: 3 }), { code: "GAME_COMPLETE" });
});

test("undo removes one move in two-player mode and restores the turn", () => {
  const game = playSequence("two-player", [["X", 1, 1], ["O", 2, 2]]);
  undoMove(game);
  assert.equal(game.board[4], null);
  assert.equal(game.currentPlayer, "O");
  assert.equal(game.moves.length, 1);
  assert.equal(game.moves[0].moveNumber, 1);
});

test("undo removes the human and computer move together", () => {
  const game = createGame("game-1", "computer");
  playMove(game, { player: "X", row: 1, column: 1 });
  assert.equal(game.moves.length, 2);
  undoMove(game);
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.currentPlayer, "X");
  assert.deepEqual(game.moves, []);
});

test("computer takes an immediate win before blocking", () => {
  assert.equal(chooseComputerMove(["O", "O", null, "X", "X", null, null, null, null]), 2);
});

test("computer blocks X, then prefers center, corner, and first open cell", () => {
  assert.equal(chooseComputerMove(["X", "X", null, "O", null, null, null, null, null]), 2);
  assert.equal(chooseComputerMove([null, null, null, null, null, null, null, null, null]), 4);
  assert.equal(chooseComputerMove([null, null, null, null, "X", null, null, null, null]), 0);
  assert.equal(chooseComputerMove(["X", "O", "X", "X", "O", "O", "O", "X", null]), 8);
  assert.equal(chooseComputerMove(Array(9).fill("X")), null);
});

test("reset clears game state but retains game identity and mode", () => {
  const game = createGame("game-1", "two-player");
  playMove(game, { player: "X", row: 1, column: 1 });
  resetGame(game);
  assert.equal(game.id, "game-1");
  assert.equal(game.mode, "two-player");
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.currentPlayer, "X");
  assert.deepEqual(game.moves, []);
});