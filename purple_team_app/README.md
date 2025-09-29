# Purple Team Tabletop Application

This project provides a foundational backend for a purple team tabletop exercise platform. It emphasises security, privacy and compliance from the ground up. The code is structured for incremental development using Test‑Driven Development (TDD) and can be extended to suit specific organisational requirements.

## Features

* User registration and authentication using JSON Web Tokens (JWT).
* Role‑based access control (admin, red, blue, observer).
* Scenario management API supporting creation and retrieval of exercises.
* Privacy by design: passwords are hashed with bcrypt, scenarios have retention policies and TTL deletion.
* Basic request logging that avoids capturing sensitive details.
* Security headers via Helmet and CORS enabled by default.

## Running the server

1. Ensure you have Node.js installed (≥18.x) and MongoDB available.
2. Copy `.env.example` to `.env` and set your `JWT_SECRET`, `MONGO_URI` and `PORT` variables.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

The API will be available on `http://localhost:PORT`.

## API Endpoints

### Authentication

| Method | Endpoint          | Description                                  |
|-------|-------------------|----------------------------------------------|
| POST  | `/api/auth/register` | Register a new user. Body: `username`, `email`, `password`, `[role]`. |
| POST  | `/api/auth/login`    | Authenticate a user. Body: `username`, `password`. Returns JWT. |

### Scenarios

All scenario endpoints require an `Authorization: Bearer <token>` header.

| Method | Endpoint            | Description                                                     |
|-------|---------------------|-----------------------------------------------------------------|
| POST  | `/api/scenarios`     | Create a new scenario. Body must include `title`; optional `description`, `steps`, `retentionDays`. |
| GET   | `/api/scenarios`     | Retrieve all scenarios owned by the authenticated user.          |
| GET   | `/api/scenarios/:id` | Retrieve a specific scenario by ID (owner or admin only).        |

## Testing

The test suite uses Jest and Supertest. Before running tests you should mock database interactions or set up a test database. To run tests:

```bash
npm test
```

## Next Steps

This skeleton provides only the core APIs. To build a full tabletop exercise engine you should:

* Implement scenario execution (inject scheduling, response capture, scoring).
* Build a front‑end interface for designing and running scenarios.
* Integrate role/permission management in the UI.
* Add compliance logging, audit trails and data export capabilities.
* Write comprehensive unit and integration tests for each module.

## Security Runtime Env
- `JWT_ISSUER` — expected token issuer (middleware enforces)
- `JWT_AUDIENCE` — expected token audience (middleware enforces)
- `CORS_ALLOW` — comma-separated allowlist of origins for production CORS

### Denylist Behavior (Redis outage)
When Redis is unavailable, an in-memory denylist engages. It is **ephemeral** and resets on restart; once Redis recovers, rehydrate as needed and restore persistent checks.
