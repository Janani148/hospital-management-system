Intern ID: CITS3376
# Hospital Management System (Full Stack Intern Project)

A simple full-stack CRUD application for managing patients, doctors, and appointments. Built to be easy to read, run, and extend — good as an intern-level portfolio/learning project.

## Tech Stack
- **Backend:** Node.js, Express, JSON file storage (no database setup required)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no build tools, no framework — runs directly in the browser)
- **API style:** REST (JSON over HTTP)

## Features
- Patients: add, view, edit, delete
- Doctors: add, view, edit, delete
- Appointments: book (linking a patient + doctor + date/time), mark completed, cancel
- Dashboard with live counts (total patients, doctors, appointments, scheduled)
- Data persists between restarts in `backend/db.json`

## Project Structure
```
hospital-management-system/
├── backend/
│   ├── server.js       # Express app + all REST routes
│   ├── db.js            # tiny file-based "database" helper
│   ├── db.json           # data file (auto-created/seeded)
│   └── package.json
└── frontend/
    ├── index.html        # page structure (tabs: Dashboard/Patients/Doctors/Appointments)
    ├── style.css
    └── app.js              # fetch calls to the API + DOM rendering
```

## How to Run

### 1. Start the backend
```bash
cd backend
npm install
npm start
```
This starts the API at `http://localhost:4000`. Health check: `GET http://localhost:4000/api/health`.

### 2. Open the frontend
Just open `frontend/index.html` directly in your browser (double-click it, or use a tool like VS Code's "Live Server" extension). It calls the API at `http://localhost:4000`.

> Make sure the backend is running first, otherwise the frontend will show "Could not load stats" / failed-to-load messages.

## API Reference

| Method | Endpoint                | Description                  |
|--------|--------------------------|-------------------------------|
| GET    | /api/health              | Health check                  |
| GET    | /api/patients             | List all patients             |
| GET    | /api/patients/:id          | Get one patient               |
| POST   | /api/patients              | Create patient                |
| PUT    | /api/patients/:id          | Update patient                |
| DELETE | /api/patients/:id          | Delete patient                |
| GET    | /api/doctors                | List all doctors              |
| POST   | /api/doctors                | Create doctor                 |
| PUT    | /api/doctors/:id            | Update doctor                 |
| DELETE | /api/doctors/:id            | Delete doctor                 |
| GET    | /api/appointments            | List all appointments (enriched with names) |
| POST   | /api/appointments            | Book appointment              |
| PUT    | /api/appointments/:id        | Update appointment (e.g. status) |
| DELETE | /api/appointments/:id        | Cancel/delete appointment     |
| GET    | /api/stats                    | Dashboard counts               |

### Example: create a patient
```bash
curl -X POST http://localhost:4000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","age":40,"gender":"Male","phone":"9999999999"}'
```

## Why JSON-file storage?
It keeps the project runnable with zero database setup (no MySQL/MongoDB install needed), which is ideal for a quick intern assignment or demo. The `db.js` module is intentionally isolated — swapping it for a real database (MongoDB with Mongoose, or PostgreSQL/MySQL with an ORM) later only requires changing that one file, not the route logic.

## Possible Extensions (good next steps for learning)
- Add authentication (admin login) with JWT
- Replace JSON file storage with MongoDB or PostgreSQL
- Add form validation feedback in the UI (currently relies on basic browser input + API error messages)
- Add pagination/search/filter on tables
- Convert frontend to React for component-based state management
- Add role-based views (admin vs receptionist vs doctor)
- Dockerize backend + frontend for one-command setup
