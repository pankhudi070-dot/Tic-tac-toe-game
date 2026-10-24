import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createApp } from "./app.js";

async function withApi(run) {
  const server = createApp().listen(0);
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function request(baseUrl, path, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, data: await response.json() };
}

test("creates games and returns a complete initial state", async () => {
  await withApi(async (baseUrl) => {
    const { response, data } = await request(baseUrl, "/api/games", "POST", { mode: "two-player" });
    assert.equal(response.status, 201);
    assert.equal(data.mode, "two-player");
    assert.equal(data.board.length, 9);
    assert.equal(data.currentPlayer, "X");
    assert.deepEqual(data.scoreboard, { xWins: 0, oWins: 0, draws: 0 });
  });
});

test("computer mode returns the computer response with the human move", async () => {
  await withApi(async (baseUrl) => {
    const { data: game } = await request(baseUrl, "/api/games", "POST", { mode: "computer" });
    const { response, data } = await request(baseUrl, `/api/games/${game.id}/moves`, "POST", {
      player: "X",
      row: 1,
      column: 1,
    });
    assert.equal(response.status, 200);
    assert.equal(data.moves.length, 2);
    assert.deepEqual(data.moves.map((move) => move.player), ["X", "O"]);
    assert.equal(data.currentPlayer, "X");
  });
});

test("rejects occupied moves without changing the game", async () => {
  await withApi(async (baseUrl) => {
    const { data: game } = await request(baseUrl, "/api/games", "POST", { mode: "two-player" });
    await request(baseUrl, `/api/games/${game.id}/moves`, "POST", { player: "X", row: 1, column: 1 });
    const { response, data } = await request(baseUrl, `/api/games/${game.id}/moves`, "POST", {
      player: "O",
      row: 1,
      column: 1,
    });
    const { data: current } = await request(baseUrl, `/api/games/${game.id}`);
    assert.equal(response.status, 409);
    assert.equal(data.error.code, "CELL_OCCUPIED");
    assert.deepEqual(current.board, ["X", null, null, null, null, null, null, null, null]);
    assert.equal(current.currentPlayer, "O");
  });
});

test("records a completed game once and resets the scoreboard independently", async () => {
  await withApi(async (baseUrl) => {
    const { data: game } = await request(baseUrl, "/api/games", "POST", { mode: "two-player" });
    const moves = [
      ["X", 1, 1], ["O", 2, 1], ["X", 1, 2], ["O", 2, 2], ["X", 1, 3],
    ];
    let result;
    for (const [player, row, column] of moves) {
      result = await request(baseUrl, `/api/games/${game.id}/moves`, "POST", { player, row, column });
    }
    assert.equal(result.data.status, "Won");
    assert.deepEqual(result.data.scoreboard, { xWins: 1, oWins: 0, draws: 0 });

    const rejected = await request(baseUrl, `/api/games/${game.id}/moves`, "POST", {
      player: "O",
      row: 3,
      column: 3,
    });
    assert.equal(rejected.response.status, 409);
    const reset = await request(baseUrl, "/api/scoreboard/reset", "POST", {});
    assert.deepEqual(reset.data, { xWins: 0, oWins: 0, draws: 0 });
  });
});

test("reset preserves game identity and mode but clears game state", async () => {
  await withApi(async (baseUrl) => {
    const { data: game } = await request(baseUrl, "/api/games", "POST", { mode: "computer" });
    await request(baseUrl, `/api/games/${game.id}/moves`, "POST", { player: "X", row: 1, column: 1 });
    const { data: reset } = await request(baseUrl, `/api/games/${game.id}/reset`, "POST", {});
    assert.equal(reset.id, game.id);
    assert.equal(reset.mode, "computer");
    assert.deepEqual(reset.board, Array(9).fill(null));
    assert.deepEqual(reset.moves, []);
    assert.equal(reset.currentPlayer, "X");
  });
});