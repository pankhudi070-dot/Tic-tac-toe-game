# Tic Tac Toe Application Requirements

## 1. Purpose

Build a browser-based Tic Tac Toe application with a React frontend and a Node.js backend. Users must be able to play locally in two-player mode or against a basic computer opponent. The application must track moves, support undo, and maintain a scoreboard.

The solution must be straightforward to install, run, test, review, and explain during a panel discussion.

## 2. Technology and Scope

- Frontend: React.
- Backend: Node.js.
- Communication: REST API over HTTP.
- Storage: In-memory storage is acceptable. SQLite is optional.
- Source control: GitHub.
- The backend is the source of truth for game state, move validation, move history, game outcome, and scoreboard values.
- Unless SQLite is used, game sessions and scoreboard data only need to remain available while the backend process is running. Persistence across backend restarts is not required.

## 3. Game Rules and State

### 3.1 Board and turns

- Each game has a 3-by-3 board. Empty cells are represented consistently in the API (for example, `null`).
- Coordinates are one-based: rows and columns are numbered 1 through 3. The UI and API documentation must use the same convention.
- A valid move places the current player's mark (`X` or `O`) in an empty cell. Occupied cells cannot be changed during that game.
- In two-player mode, X and O are human-controlled and turns alternate after each valid move.
- In computer mode, the human is X and the computer is O. The computer must respond automatically after a valid human move when the game remains in progress.
- The UI must show the current player while a game is in progress.

### 3.2 Move validation

The backend must reject a move if:

- The game does not exist.
- The row or column is outside the 1-to-3 range (or the supplied cell index is outside the board).
- The target cell is occupied.
- The game is already won or drawn.
- The submitted player is not the player whose turn it is, or is not permitted to submit a move in the selected mode.

A rejected move must not change the board, current player, move history, game status, or scoreboard. The API must return a useful error response that the frontend can display without losing the current game state.

### 3.3 Win and draw outcomes

- A player wins by completing any of the three rows, three columns, or two diagonals.
- A win response must identify the winner and the three winning cells. The UI must display the winner and visually highlight those cells.
- A draw occurs when all nine cells are occupied and there is no winner.
- A completed game must display its outcome and reject further moves.
- The scoreboard must be updated exactly once when a game first reaches a win or draw.

### 3.4 New and reset games

- Creating a game starts with an empty board, X to move, no winner, no winning cells, an empty move history, and `InProgress` status.
- Reset Game clears the current game's board, move history, and outcome, and sets the current player to X. It retains the game ID, selected mode, and scoreboard values.
- Reset Game must not increment or otherwise change the scoreboard.

## 4. Game Modes and Computer Opponent

The application must provide these modes:

1. **Two Player:** a human controls both X and O.
2. **Play Against Computer:** the human controls X and the computer controls O.

The computer must choose a legal empty cell using this priority order:

1. Play a move that wins for O immediately, if one exists.
2. Block an immediate winning move available to X, if one exists.
3. Take the center if it is available.
4. Take an available corner.
5. Take any available cell.

When more than one move satisfies the same priority, the implementation must choose consistently; checking available cells in row-major order is acceptable. The computer must not move after a game is complete. The move request response must include the state after the computer has responded, if a response was required.

## 5. Move History and Undo

### 5.1 Move history

The UI must show the current game's moves in order. Each entry must include its move number, player, row, and column. Move history must update only after valid moves and must reflect the board after undo or reset.

In computer mode, the computer's move must appear as a separate history entry. The human move and automatic computer response must be applied as part of the same move operation from the client's perspective.

### 5.2 Undo

- Undo Last Move must restore the board, current player, and move history to the correct prior state.
- In two-player mode, undo removes the single most recent move.
- In computer mode, undo removes the most recent human move and its corresponding computer response as a pair. If no computer response was made, undo removes the human move.
- Undo must be disabled when there are no moves to undo and after a game is won or drawn.
- Since undo is disabled after completion, undo never changes a recorded scoreboard result.

## 6. Scoreboard

- The scoreboard must track X wins, O wins, and draws for the current backend session.
- A completed game increments exactly one counter: the winner's counter or the draw counter.
- Reset Game leaves the scoreboard unchanged.
- Reset Scoreboard sets all three counters to zero without changing the current game.
- The backend must provide the scoreboard through the API. In computer mode, an O win is recorded as an O win.

## 7. REST API

The backend must expose REST endpoints for creating and retrieving games, submitting moves, undoing, resetting a game, retrieving the scoreboard, and resetting the scoreboard. The following paths are suggested; equivalent paths are acceptable if they are documented clearly in the README.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/games` | Create a game with the requested mode |
| `GET` | `/api/games/{id}` | Retrieve the current game state |
| `POST` | `/api/games/{id}/moves` | Submit a move; in computer mode, also return the computer response when applicable |
| `POST` | `/api/games/{id}/undo` | Undo the latest move or move pair, as defined above |
| `POST` | `/api/games/{id}/reset` | Reset the game while retaining its ID and mode |
| `GET` | `/api/scoreboard` | Retrieve scoreboard values |
| `POST` | `/api/scoreboard/reset` | Reset all scoreboard values |

The API contract must document request fields, response fields, validation errors, and status codes. A move request must identify the player and target row and column, or an equivalent cell index. The backend must validate the request against the current server-side state.

### 7.1 Game state response

A game state response must include:

- Game ID and selected mode.
- Board state.
- Current player when the game is in progress.
- Game status: `InProgress`, `Won`, or `Draw`.
- Winner and winning cells when applicable.
- Ordered move history.
- Scoreboard values, or a documented way to retrieve them.

The response must provide enough information for the frontend to render the complete current game without reimplementing game rules.

## 8. Frontend Requirements

The React application must:

- Allow the user to select a game mode and start a game.
- Display the board, current player, selected mode, outcome, and winning-cell highlight when applicable.
- Display the current game's move history and scoreboard.
- Provide Reset Game, Undo Last Move, and Reset Scoreboard controls, with unavailable actions visibly disabled.
- Send game actions to the backend and render the latest state returned by the API.
- Show useful feedback for rejected requests or communication errors while preserving the last known game state.
- Be comfortable to use in a laptop browser and remain usable at narrower browser widths.

## 9. Testing Requirements

Include automated tests for the core game logic and backend state transitions. At minimum, test:

- Valid and invalid moves, including out-of-range, occupied-cell, wrong-player, and post-completion moves.
- Turn switching.
- Row, column, and diagonal wins.
- Draw detection.
- Game reset and scoreboard reset.
- Undo in two-player mode and computer mode, including move history and turn restoration.
- Scoreboard updates exactly once for wins and draws.
- Computer move priority, legal move selection, and no move after completion.
- Game creation and the documented API response/error behavior.

Frontend tests for rendering and API integration are recommended. The README must state how to run all included tests.

## 10. README and Submission

The GitHub repository must contain the frontend, backend, and a README with:

1. Project overview and implemented features.
2. Technology stack.
3. Prerequisites and local setup instructions.
4. Separate instructions to run the backend and frontend.
5. API endpoint and contract summary.
6. Instructions to run tests.
7. Design decisions, assumptions, and known limitations.
8. A concise summary of AI tools and prompts used, what was generated or changed, and what was reviewed manually.
9. Future improvements, if any.

The submission must include all instructions and documentation needed for a reviewer to run and evaluate the application locally.

## 11. Acceptance Criteria

The application is complete when:

- The backend and frontend can be started locally using the README instructions.
- The frontend communicates with the backend through the documented REST API.
- A user can create and play a game in both modes.
- Turn handling, move validation, win detection, draw detection, and winning-cell highlighting work correctly.
- Move history and both undo behaviors work as specified.
- Game reset and scoreboard reset work independently and correctly.
- The scoreboard records each completed game exactly once.
- The computer follows the specified move priority and never makes an invalid move.
- Automated tests cover the required behaviors and pass.
- A reviewer can understand the implementation, assumptions, and AI-assisted development choices from the repository documentation.