# ElektraServe Device Diagnostics

ElektraServe is a full-stack device diagnostics demo built with an Angular frontend, a layered Node.js/Express API, and SQLite persistence.

The application supports device CRUD, simulated health updates, persisted restart commands, guarded command transitions, dashboard counts, search and filters, API-key authentication, Swagger documentation, seed data, toast notifications, confirmation dialogs, loading states, and empty states.

## Technology stack

### Backend

- Node.js 22.5 or newer
- Express 5
- Node's built-in `node:sqlite` driver
- SQLite database stored in `backend/data/elektraserve.db`
- API-key authentication using `X-API-Key` or Bearer authentication
- Swagger UI and OpenAPI 3.0 documentation
- Node test runner, Supertest integration tests

### Frontend

- Angular 20
- TypeScript 5.9
- Angular standalone components and lazy-loaded routes
- Angular reactive forms and template forms
- RxJS
- Font Awesome icons
- Custom responsive datatables, pagination, filters, modals, toasts, and confirmation dialogs

## Project structure

```text
ElektraServe/
├── backend/
│   ├── data/                  # SQLite database is created here
│   ├── src/
│   │   ├── config/            # Environment and OpenAPI configuration
│   │   ├── controllers/       # HTTP request and response handling
│   │   ├── errors/            # Application error type
│   │   ├── middleware/        # API-key authentication and error handling
│   │   ├── repositories/      # Parameterized SQLite queries
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Validation and business rules
│   │   ├── utils/             # Shared validation helpers
│   │   ├── app.js             # Express application composition
│   │   ├── database.js        # Schema creation and seed data
│   │   └── server.js          # HTTP server entry point
│   └── test/                  # Backend integration tests
├── frontend/
│   ├── src/app/
│   │   ├── pages/dashboard/   # Dashboard summary page
│   │   ├── pages/devices/     # Device CRUD page
│   │   ├── pages/commands/    # Command processing page
│   │   ├── api.service.ts     # Backend API client
│   │   └── feedback.service.ts# Toast and confirmation state
│   └── proxy.conf.cjs         # Development API proxy
├── scripts/dev.js             # Starts backend and frontend together
└── package.json               # Workspace commands
```

## Prerequisites

Install the following before running the application:

- Node.js 22.5 or newer; an even-numbered LTS release such as Node.js 22 or 24 is recommended
- npm

Confirm the installed versions:

```bash
node --version
npm --version
```

## First-time setup

Run these commands from the repository root after cloning or extracting the project:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
cp backend/.env.example backend/.env
```

The example environment file contains a development-only API key. Replace it before using the project outside a local demo environment.

To generate a new Base64 API key:

```bash
openssl rand -base64 48
```

Copy the generated value into `backend/.env` as `API_KEY`. The Angular development proxy reads this same value directly from `backend/.env`; the API key is not included in the Angular browser bundle.

## Backend environment configuration

The backend reads `backend/.env`:

```dotenv
PORT=3000
DATABASE_PATH=./data/elektraserve.db
CORS_ORIGIN=http://localhost:4200
API_KEY=replace-with-a-long-random-secret
```

| Variable        | Required | Description                                      |
| --------------- | -------- | ------------------------------------------------ |
| `PORT`          | No       | Backend port; defaults to `3000`                 |
| `DATABASE_PATH` | No       | SQLite path; defaults to `data/elektraserve.db`  |
| `CORS_ORIGIN`   | No       | Allowed frontend origin; defaults to port `4200` |
| `API_KEY`       | Yes      | API key containing at least 16 characters        |

`backend/.env` is ignored by Git and must not be committed.

## Database creation and seed data

No separate database server or manual SQL command is required.

When the backend starts, `backend/src/database.js` automatically:

1. Creates the `backend/data` directory when needed.
2. Creates or opens `backend/data/elektraserve.db`.
3. Enables SQLite foreign-key enforcement.
4. Enables WAL journal mode.
5. Creates the `Devices` and `DeviceCommands` tables when they do not exist.
6. Creates indexes for command device IDs and statuses.
7. Inserts seed records only when the `Devices` table is empty.

The initial database contains:

- Five synthetic devices across Healthy, Warning, and Critical statuses
- Four restart commands across Pending, Completed, Failed, and Cancelled statuses

Important database rules:

- Device codes are required and unique case-insensitively.
- Commands reference an existing device using a foreign key.
- Deleting a device safely deletes its related demo commands using `ON DELETE CASCADE`.
- Health and command statuses are protected by database constraints.
- All timestamps are stored as ISO-8601 UTC strings.
- All repository queries use SQLite parameter binding.

The database persists between backend restarts and browser refreshes. Seed data is not inserted again once devices exist.

## Start the complete application

After completing the first-time setup, run this command from the repository root:

```bash
npm start
```

This starts both services:

- Angular application: `http://localhost:4200`
- Backend API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

Keep the terminal running while using the application. Press `Ctrl+C` to stop both services.

## Start backend and frontend separately

Use two terminals if separate logs are preferred.

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd frontend
npm start
```

The Angular development server proxies `/api` requests to `http://127.0.0.1:3000` and injects the `X-API-Key` value read from `backend/.env`.

For automatic backend restarts during development:

```bash
cd backend
npm run dev
```

## Frontend pages

### Dashboard

- Displays Total Devices, Healthy, Warning, Critical, Commands Pending, and Commands Completed.
- All values come from `GET /api/dashboard/summary` and are calculated from SQLite records.
- Use Refresh to reload the latest totals.

### Devices

- Lists devices newest-first with pagination.
- Searches automatically by device code or name while typing.
- Filters by Healthy, Warning, or Critical status.
- Supports add, view, edit, and confirmed delete actions.
- Changes health status through the backend.
- Queues a persisted Restart command through the backend.

### Commands

- Lists commands newest-first with pagination.
- Searches by command ID, device code, or device name.
- Filters by Pending, Completed, Failed, or Cancelled status.
- Allows only Pending commands to be completed, failed, or cancelled.
- Requires and stores a failure reason when failing a command.

## API authentication

`GET /api/health`, Swagger UI, and the OpenAPI JSON are public. All other `/api` endpoints require one of these headers:

```http
X-API-Key: your-api-key
```

or:

```http
Authorization: Bearer your-api-key
```

Missing credentials return `401`. Invalid credentials return `403`. API keys are compared using Node's constant-time comparison utility.

Example request:

```bash
curl -H "X-API-Key: <value-from-backend/.env>" http://localhost:3000/api/devices
```

## Swagger API documentation

Start the backend and open:

```text
http://localhost:3000/api-docs
```

To test protected endpoints:

1. Select **Authorize**.
2. Enter the `API_KEY` value from `backend/.env` in `ApiKeyAuth`.
3. Select **Authorize** and close the dialog.
4. Open an endpoint and use **Try it out**.

## API endpoints

| Method | Route                            | Purpose                              |
| ------ | -------------------------------- | ------------------------------------ |
| GET    | `/api/health`                    | Check backend availability           |
| GET    | `/api/devices`                   | Search and filter devices            |
| POST   | `/api/devices`                   | Create a device                      |
| GET    | `/api/devices/:id`               | Read one device                      |
| PUT    | `/api/devices/:id`               | Update one device                    |
| DELETE | `/api/devices/:id`               | Delete a device and demo commands    |
| POST   | `/api/devices/:id/health-status` | Persist a simulated health status    |
| GET    | `/api/commands`                  | List and filter commands             |
| POST   | `/api/commands`                  | Queue a Pending Restart command      |
| POST   | `/api/commands/:id/complete`     | Complete a Pending command           |
| POST   | `/api/commands/:id/fail`         | Fail a Pending command with a reason |
| POST   | `/api/commands/:id/cancel`       | Cancel a Pending command             |
| GET    | `/api/dashboard/summary`         | Compute persisted dashboard totals   |

## Backend request flow

Every protected action follows the same layered flow:

```text
Angular button or form
  → ApiService
  → Angular development proxy adds X-API-Key
  → Express CORS and JSON middleware
  → API-key authentication middleware
  → Route
  → Controller
  → Service validation and business rules
  → Repository parameterized SQL
  → SQLite database
  → JSON response
  → Angular refresh and toast/error state
```

Example: selecting **Queue Restart** sends `POST /api/commands`. Authentication runs first, the command controller passes the body to the command service, the service verifies the device exists and permits only `Restart`, and the repository inserts a Pending command. The API returns the persisted record and Angular shows a success toast.

## Business rules

- New devices default to Healthy.
- Device Code, Name, and Solution Type are required in the UI and API.
- Device Code is unique case-insensitively.
- Health Status accepts only Healthy, Warning, or Critical.
- Command Type accepts only Restart.
- Commands cannot reference nonexistent devices.
- Only Pending commands can transition to Completed, Failed, or Cancelled.
- Repeated or invalid transitions return HTTP `409`.
- Completing, failing, or cancelling sets `CompletedAtUtc`.
- Failing requires a reason of 500 characters or fewer.
- Successful device edits and health changes update `UpdatedAtUtc`.
- Device and command lists are ordered by descending database ID.
- Dashboard totals are always computed from persisted records.

## Validation and verification

Run backend integration tests:

```bash
npm test
```

Run the Angular production build:

```bash
npm run build
```

Check code formatting:

```bash
npm run format:check
```

Apply code formatting:

```bash
npm run format
```

The backend test suite covers authentication, Swagger availability, seed totals, newest-first ordering, device validation and uniqueness, CRUD, searching, health updates, cascade deletion, command creation, command transitions, and rejected invalid operations.

## Troubleshooting

### Frontend displays "Unable to reach the diagnostics service"

- Confirm the backend is running on port `3000`.
- Confirm the frontend is running through `npm start`, which loads `proxy.conf.cjs`.
- Confirm `backend/.env` exists and contains `API_KEY`.
- Restart the frontend after changing `backend/.env` because the proxy reads the key when it starts.

### API returns `401` or `403`

- `401` means the API key header is missing.
- `403` means the supplied key does not match `backend/.env`.
- Restart both services after changing the API key.

### SQLite database is not created

- Confirm the backend process has write access to `backend/data`.
- Confirm `DATABASE_PATH` points to a writable location.
- Check the backend terminal for configuration or database errors.

### Port is already in use

Change `PORT` in `backend/.env`. If the backend port changes, also update the target in `frontend/proxy.conf.cjs`.
