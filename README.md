
## Project setup

- Node.js 20 or newer.
- npm.

## Run Locally

From the repository root:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`. The API runs at `http://localhost:3001`, and the frontend proxies `/api` requests to it.

To run either process separately:

```bash
npm run dev:api
npm run dev:web
```

Create a production frontend build with `npm run build`. Start the API alone with `npm start`.


## Tests

Run the rules and API integration tests with:

```bash
npm test
```

The tests cover move validation, turns, wins, draws, undo, resets, computer decisions, API responses, and scoreboard updates.