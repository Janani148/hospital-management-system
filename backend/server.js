// server.js - Hospital Management System API
const express = require('express');
const cors = require('cors');
const { readDB, writeDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------
function notFound(res, what) {
  return res.status(404).json({ error: `${what} not found` });
}

function validateRequired(body, fields) {
  const missing = fields.filter((f) => !body[f] && body[f] !== 0);
  return missing;
}

// ---------- Health check ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hospital Management API running' });
});

// =====================================================
// PATIENTS
// =====================================================
app.get('/api/patients', (req, res) => {
  const db = readDB();
  res.json(db.patients);
});

app.get('/api/patients/:id', (req, res) => {
  const db = readDB();
  const patient = db.patients.find((p) => p.id === Number(req.params.id));
  if (!patient) return notFound(res, 'Patient');
  res.json(patient);
});

app.post('/api/patients', (req, res) => {
  const missing = validateRequired(req.body, ['name', 'age', 'gender']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }
  const db = readDB();
  const patient = {
    id: db.nextIds.patient++,
    name: req.body.name,
    age: req.body.age,
    gender: req.body.gender,
    phone: req.body.phone || '',
    address: req.body.address || '',
    bloodGroup: req.body.bloodGroup || '',
    createdAt: new Date().toISOString()
  };
  db.patients.push(patient);
  writeDB(db);
  res.status(201).json(patient);
});

app.put('/api/patients/:id', (req, res) => {
  const db = readDB();
  const idx = db.patients.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Patient');
  db.patients[idx] = { ...db.patients[idx], ...req.body, id: db.patients[idx].id };
  writeDB(db);
  res.json(db.patients[idx]);
});

app.delete('/api/patients/:id', (req, res) => {
  const db = readDB();
  const idx = db.patients.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Patient');
  const removed = db.patients.splice(idx, 1)[0];
  // also remove appointments tied to this patient
  db.appointments = db.appointments.filter((a) => a.patientId !== removed.id);
  writeDB(db);
  res.json({ message: 'Patient deleted', patient: removed });
});

// =====================================================
// DOCTORS
// =====================================================
app.get('/api/doctors', (req, res) => {
  const db = readDB();
  res.json(db.doctors);
});

app.get('/api/doctors/:id', (req, res) => {
  const db = readDB();
  const doctor = db.doctors.find((d) => d.id === Number(req.params.id));
  if (!doctor) return notFound(res, 'Doctor');
  res.json(doctor);
});

app.post('/api/doctors', (req, res) => {
  const missing = validateRequired(req.body, ['name', 'specialization']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }
  const db = readDB();
  const doctor = {
    id: db.nextIds.doctor++,
    name: req.body.name,
    specialization: req.body.specialization,
    phone: req.body.phone || '',
    availableDays: req.body.availableDays || [],
    createdAt: new Date().toISOString()
  };
  db.doctors.push(doctor);
  writeDB(db);
  res.status(201).json(doctor);
});

app.put('/api/doctors/:id', (req, res) => {
  const db = readDB();
  const idx = db.doctors.findIndex((d) => d.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Doctor');
  db.doctors[idx] = { ...db.doctors[idx], ...req.body, id: db.doctors[idx].id };
  writeDB(db);
  res.json(db.doctors[idx]);
});

app.delete('/api/doctors/:id', (req, res) => {
  const db = readDB();
  const idx = db.doctors.findIndex((d) => d.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Doctor');
  const removed = db.doctors.splice(idx, 1)[0];
  db.appointments = db.appointments.filter((a) => a.doctorId !== removed.id);
  writeDB(db);
  res.json({ message: 'Doctor deleted', doctor: removed });
});

// =====================================================
// APPOINTMENTS
// =====================================================
app.get('/api/appointments', (req, res) => {
  const db = readDB();
  // enrich with patient/doctor names for convenience
  const enriched = db.appointments.map((a) => {
    const patient = db.patients.find((p) => p.id === a.patientId);
    const doctor = db.doctors.find((d) => d.id === a.doctorId);
    return {
      ...a,
      patientName: patient ? patient.name : 'Unknown',
      doctorName: doctor ? doctor.name : 'Unknown'
    };
  });
  res.json(enriched);
});

app.post('/api/appointments', (req, res) => {
  const missing = validateRequired(req.body, ['patientId', 'doctorId', 'date', 'time']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }
  const db = readDB();
  const patientId = Number(req.body.patientId);
  const doctorId = Number(req.body.doctorId);

  if (!db.patients.find((p) => p.id === patientId)) return notFound(res, 'Patient');
  if (!db.doctors.find((d) => d.id === doctorId)) return notFound(res, 'Doctor');

  const appointment = {
    id: db.nextIds.appointment++,
    patientId,
    doctorId,
    date: req.body.date,
    time: req.body.time,
    reason: req.body.reason || '',
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  };
  db.appointments.push(appointment);
  writeDB(db);
  res.status(201).json(appointment);
});

app.put('/api/appointments/:id', (req, res) => {
  const db = readDB();
  const idx = db.appointments.findIndex((a) => a.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Appointment');
  db.appointments[idx] = { ...db.appointments[idx], ...req.body, id: db.appointments[idx].id };
  writeDB(db);
  res.json(db.appointments[idx]);
});

app.delete('/api/appointments/:id', (req, res) => {
  const db = readDB();
  const idx = db.appointments.findIndex((a) => a.id === Number(req.params.id));
  if (idx === -1) return notFound(res, 'Appointment');
  const removed = db.appointments.splice(idx, 1)[0];
  writeDB(db);
  res.json({ message: 'Appointment deleted', appointment: removed });
});

// =====================================================
// DASHBOARD STATS
// =====================================================
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    totalPatients: db.patients.length,
    totalDoctors: db.doctors.length,
    totalAppointments: db.appointments.length,
    scheduledAppointments: db.appointments.filter((a) => a.status === 'Scheduled').length,
    completedAppointments: db.appointments.filter((a) => a.status === 'Completed').length
  });
});

app.listen(PORT, () => {
  console.log(`Hospital Management API running on http://localhost:${PORT}`);
});
