import { useEffect, useState } from "react";
import { Cpu, RotateCcw, Undo2, UsersRound } from "lucide-react";

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Request failed with status ${response.status}.`);
  }
  return data;
}

function formatMode(mode) {
  return mode === "computer" ? "Against computer" : "Two player";
}

export default function App() {
  const [game, setGame] = useState(null);
  const [mode, setMode] = useState("two-player");
  const [scoreboard, setScoreboard] = useState({ xWins: 0, oWins: 0, draws: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api("/scoreboard"), api("/games", { method: "POST", body: JSON.stringify({ mode: "two-player" }) })])
      .then(([scores, newGame]) => {
        if (!active) return;
        setScoreboard(scores);
        setGame(newGame);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function acceptGame(nextGame) {
    setGame(nextGame);
    setMode(nextGame.mode);
    if (nextGame.scoreboard) setScoreboard(nextGame.scoreboard);
  }

  async function runRequest(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function startGame(nextMode) {
    return runRequest(async () => {
      const nextGame = await api("/games", {
        method: "POST",
        body: JSON.stringify({ mode: nextMode }),
      });
      acceptGame(nextGame);
    });
  }

  function makeMove(cell) {
    if (!game) return;
    const player = game.currentPlayer;
    return runRequest(async () => {
      const nextGame = await api(`/games/${game.id}/moves`, {
        method: "POST",
        body: JSON.stringify({ player, row: Math.floor(cell / 3) + 1, column: (cell % 3) + 1 }),
      });
      acceptGame(nextGame);
    });
  }

  function undo() {
    if (!game) return;
    return runRequest(async () => {
      acceptGame(await api(`/games/${game.id}/undo`, { method: "POST", body: "{}" }));
    });
  }

  function resetGame() {
    if (!game) return;
    return runRequest(async () => {
      acceptGame(await api(`/games/${game.id}/reset`, { method: "POST", body: "{}" }));
    });
  }

  function resetScoreboard() {
    return runRequest(async () => {
      setScoreboard(await api("/scoreboard/reset", { method: "POST", body: "{}" }));
    });
  }

  const finished = game?.status === "Won" || game?.status === "Draw";
  const statusText = !game
    ? "Preparing your board"
    : game.status === "Won"
      ? `${game.winner} takes the game`
      : game.status === "Draw"
        ? "A well-matched draw"
        : `${game.currentPlayer} to move`;

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Tic Tac Toe home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>FIELD / PLAY</span>
        </a>
        <div className="session-tag"><span className="live-dot" /> LOCAL MATCH</div>
      </header>

      <div className="content" id="top">
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">A SMALL GAME OF BIG DECISIONS</p>
            <h1 id="page-title">Tic Tac Toe<span className="title-period">.</span></h1>
            <p className="intro-copy">Three in a row. Your move makes the difference.</p>
          </div>
          <div className={`game-status ${finished ? "is-finished" : ""}`} aria-live="polite">
            <span className="status-label">MATCH STATUS</span>
            <strong>{statusText}</strong>
          </div>
        </section>

        {error && <div className="error-message" role="alert">{error}</div>}

        <section className="mode-bar" aria-label="Choose a game mode">
          <div className="mode-tabs" role="group" aria-label="Game mode">
            <button
              className={`mode-tab ${mode === "two-player" ? "selected" : ""}`}
              type="button"
              aria-pressed={mode === "two-player"}
              disabled={busy}
              onClick={() => startGame("two-player")}
            >
              <UsersRound size={17} strokeWidth={1.8} />
              <span>Two player</span>
            </button>
            <button
              className={`mode-tab ${mode === "computer" ? "selected" : ""}`}
              type="button"
              aria-pressed={mode === "computer"}
              disabled={busy}
              onClick={() => startGame("computer")}
            >
              <Cpu size={17} strokeWidth={1.8} />
              <span>Play computer</span>
            </button>
          </div>
          <span className="mode-caption">{game ? formatMode(game.mode) : "Starting a new game"}</span>
        </section>

        <div className="game-layout">
          <section className="board-section" aria-label="Game board and controls">
            <div className="board-heading">
              <div>
                <span className="section-kicker">CURRENT GAME</span>
                <h2>{game?.status === "Won" ? "Nicely played." : game?.status === "Draw" ? "No opening this time." : "Find your line."}</h2>
              </div>
              <span className="move-count">{game?.moves.length ?? 0}<small> / 9 MOVES</small></span>
            </div>

            <div className="board-wrap">
              <div className="board" role="group" aria-label="Tic Tac Toe board">
                {Array.from({ length: 9 }, (_, cell) => {
                  const mark = game?.board[cell] ?? null;
                  const isWinningCell = game?.winningCells.includes(cell) ?? false;
                  const row = Math.floor(cell / 3) + 1;
                  const column = (cell % 3) + 1;
                  return (
                    <button
                      key={cell}
                      className={`board-cell ${mark ? `mark-${mark.toLowerCase()}` : ""} ${isWinningCell ? "winning-cell" : ""}`}
                      type="button"
                      aria-label={`Row ${row}, column ${column}${mark ? `, ${mark}` : ", empty"}`}
                      disabled={busy || !game || game.status !== "InProgress" || mark !== null}
                      onClick={() => makeMove(cell)}
                    >
                      {mark && <span aria-hidden="true">{mark}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="board-footnote">
                <span className="turn-indicator"><i className={game?.currentPlayer === "O" ? "turn-o" : "turn-x"} />{finished ? "MATCH COMPLETE" : `${game?.currentPlayer ?? "X"} HAS THE MOVE`}</span>
                <span>3 IN A ROW WINS</span>
              </div>
            </div>

            <div className="action-row">
              <button className="action-button secondary" type="button" onClick={undo} disabled={busy || !game || game.status !== "InProgress" || game.moves.length === 0}>
                <Undo2 size={17} />
                <span>Undo move</span>
              </button>
              <button className="action-button primary" type="button" onClick={resetGame} disabled={busy || !game}>
                <RotateCcw size={16} />
                <span>Reset game</span>
              </button>
            </div>
          </section>

          <aside className="details-column" aria-label="Match details">
            <section className="score-section" aria-labelledby="score-heading">
              <div className="section-heading-row">
                <div>
                  <span className="section-kicker">THIS SESSION</span>
                  <h2 id="score-heading">Scoreboard</h2>
                </div>
                <button className="icon-button" type="button" onClick={resetScoreboard} disabled={busy} aria-label="Reset scoreboard" title="Reset scoreboard">
                  <RotateCcw size={16} />
                </button>
              </div>
              <div className="score-list">
                <div className="score-row"><span className="score-symbol symbol-x">X</span><span className="score-label">X wins</span><strong>{scoreboard.xWins}</strong></div>
                <div className="score-row"><span className="score-symbol symbol-o">O</span><span className="score-label">O wins</span><strong>{scoreboard.oWins}</strong></div>
                <div className="score-row"><span className="draw-symbol">=</span><span className="score-label">Draws</span><strong>{scoreboard.draws}</strong></div>
              </div>
            </section>

            <section className="history-section" aria-labelledby="history-heading">
              <div className="section-heading-row history-title-row">
                <div>
                  <span className="section-kicker">PLAY BY PLAY</span>
                  <h2 id="history-heading">Move history</h2>
                </div>
                <span className="history-total">{game?.moves.length ?? 0}</span>
              </div>
              {game?.moves.length ? (
                <ol className="history-list">
                  {game.moves.map((move) => (
                    <li className="history-item" key={`${move.moveNumber}-${move.player}`}>
                      <span className="history-number">{String(move.moveNumber).padStart(2, "0")}</span>
                      <span className={`history-player player-${move.player.toLowerCase()}`}>{move.player}</span>
                      <span className="history-position">Row {move.row}, column {move.column}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="history-empty">Your opening move will appear here.</p>
              )}
            </section>

            <div className="side-note"><span className="note-rule" />The board is yours. The rules are not.</div>
          </aside>
        </div>

        <footer className="page-footer">
          <span>FIELD / PLAY <b>·</b> LOCAL SESSION</span>
          <span>GAME ID <code>{game?.id?.slice(0, 8).toUpperCase() ?? "--------"}</code></span>
        </footer>
      </div>
    </main>
  );
}