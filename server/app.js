import express from "express";
import { randomUUID } from "node:crypto";
import { createGame, GameError, playMove, resetGame, undoMove } from "./game.js";

export function createApp() {
  const app = express();
  const games = new Map();
  const scoreboard = { xWins: 0, oWins: 0, draws: 0 };

  app.use(express.json());

  app.post("/api/games", (request, response, next) => {
    try {
      const game = createGame(randomUUID(), request.body?.mode);
      games.set(game.id, game);
      response.status(201).json(serializeGame(game, scoreboard));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/games/:id", (request, response, next) => {
    try {
      response.json(serializeGame(getGame(games, request.params.id), scoreboard));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/games/:id/moves", (request, response, next) => {
    try {
      const game = getGame(games, request.params.id);
      playMove(game, request.body ?? {});
      recordOutcome(game, scoreboard);
      response.json(serializeGame(game, scoreboard));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/games/:id/undo", (request, response, next) => {
    try {
      const game = getGame(games, request.params.id);
      undoMove(game);
      response.json(serializeGame(game, scoreboard));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/games/:id/reset", (request, response, next) => {
    try {
      const game = resetGame(getGame(games, request.params.id));
      response.json(serializeGame(game, scoreboard));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/scoreboard", (request, response) => {
    response.json({ ...scoreboard });
  });

  app.post("/api/scoreboard/reset", (request, response) => {
    scoreboard.xWins = 0;
    scoreboard.oWins = 0;
    scoreboard.draws = 0;
    response.json({ ...scoreboard });
  });

  app.use((request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "The requested endpoint does not exist." } });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const status = error instanceof GameError ? error.status : error.status ?? 500;
    if (status >= 500) console.error(error);
    response.status(status).json({
      error: {
        code: error instanceof GameError ? error.code : status === 400 ? "INVALID_JSON" : "INTERNAL_ERROR",
        message: status === 500 ? "An unexpected server error occurred." : error.message,
      },
    });
  });

  return app;
}

function getGame(games, id) {
  const game = games.get(id);
  if (!game) throw new GameError("Game not found.", 404, "GAME_NOT_FOUND");
  return game;
}

function recordOutcome(game, scoreboard) {
  if (game.status === "InProgress" || game.scoreRecorded) return;
  if (game.status === "Draw") scoreboard.draws += 1;
  else if (game.winner === "X") scoreboard.xWins += 1;
  else scoreboard.oWins += 1;
  game.scoreRecorded = true;
}

function serializeGame(game, scoreboard) {
  const { scoreRecorded, ...publicGame } = game;
  return { ...publicGame, scoreboard: { ...scoreboard } };
}