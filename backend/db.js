// db.js - very simple file-based JSON "database".
// Good enough for a learning project; swap for MongoDB/MySQL/Postgres later.
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

function defaultData() {
  return {
    patients: [],
    doctors: [],
    appointments: [],
    nextIds: { patient: 1, doctor: 1, appointment: 1 }
  };
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    writeDB(defaultData());
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return defaultData();
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readDB, writeDB };
