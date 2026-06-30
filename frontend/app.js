const API_BASE = 'http://localhost:4001/api';

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    refreshActiveTab(btn.dataset.tab);
  });
});

function refreshActiveTab(tab) {
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'patients') loadPatients();
  if (tab === 'doctors') loadDoctors();
  if (tab === 'appointments') loadAppointments();
}

function goToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === tabName));
  refreshActiveTab(tabName);
}

document.querySelectorAll('.stat-card[data-goto]').forEach((card) => {
  card.addEventListener('click', () => goToTab(card.dataset.goto));
});

document.getElementById('refreshDashboard').addEventListener('click', loadDashboard);

document.getElementById('qaAddPatient').addEventListener('click', () => {
  goToTab('patients');
  document.getElementById('openAddPatient').click();
});
document.getElementById('qaAddDoctor').addEventListener('click', () => {
  goToTab('doctors');
  document.getElementById('openAddDoctor').click();
});
document.getElementById('qaBookAppointment').addEventListener('click', () => {
  goToTab('appointments');
  document.getElementById('openAddAppointment').click();
});

// ---------- Toast ----------
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ---------- Modal ----------
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

function openModal(title, bodyHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalOverlay.classList.remove('hidden');
}
function closeModal() {
  modalOverlay.classList.add('hidden');
  modalBody.innerHTML = '';
}
document.getElementById('modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ---------- API helper ----------
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// =====================================================
// DASHBOARD
// =====================================================
function renderBarChart(containerId, entries, colorClass = '') {
  const el = document.getElementById(containerId);
  if (!entries.length) {
    el.innerHTML = `<div class="bar-empty">No data yet.</div>`;
    return;
  }
  const max = Math.max(...entries.map((e) => e.count), 1);
  el.innerHTML = entries.map((e) => `
    <div class="bar-row">
      <span class="bar-label">${e.label}</span>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${(e.count / max) * 100}%"></div></div>
      <span class="bar-count">${e.count}</span>
    </div>
  `).join('');
}

async function loadDashboard() {
  try {
    const [stats, patients, doctors, appointments] = await Promise.all([
      api('/stats'),
      api('/patients'),
      api('/doctors'),
      api('/appointments')
    ]);

    document.getElementById('statPatients').textContent = stats.totalPatients;
    document.getElementById('statDoctors').textContent = stats.totalDoctors;
    document.getElementById('statAppointments').textContent = stats.totalAppointments;
    document.getElementById('statScheduled').textContent = stats.scheduledAppointments;
    document.getElementById('statCompleted').textContent = stats.completedAppointments;

    // Appointment status breakdown
    const statusCounts = {};
    appointments.forEach((a) => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
    renderBarChart('statusChart', Object.entries(statusCounts).map(([label, count]) => ({ label, count })));

    // Patients by gender
    const genderCounts = {};
    patients.forEach((p) => { genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1; });
    renderBarChart('genderChart', Object.entries(genderCounts).map(([label, count]) => ({ label, count })));

    // Doctors by specialization
    const specCounts = {};
    doctors.forEach((d) => { specCounts[d.specialization] = (specCounts[d.specialization] || 0) + 1; });
    renderBarChart('specChart', Object.entries(specCounts).map(([label, count]) => ({ label, count })));

    // Upcoming appointments (scheduled, soonest first)
    const upcoming = appointments
      .filter((a) => a.status === 'Scheduled')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 5);

    const tbody = document.getElementById('upcomingTableBody');
    tbody.innerHTML = upcoming.length
      ? upcoming.map((a) => `
          <tr>
            <td>${a.patientName}</td>
            <td>${a.doctorName}</td>
            <td>${a.date}</td>
            <td>${a.time}</td>
            <td>${a.status}</td>
          </tr>
        `).join('')
      : `<tr class="empty-row"><td colspan="5">No upcoming appointments.</td></tr>`;
  } catch (e) {
    showToast('Could not load dashboard. Is the backend running?', true);
  }
}

// =====================================================
// PATIENTS
// =====================================================
async function loadPatients() {
  const tbody = document.getElementById('patientsTableBody');
  try {
    const patients = await api('/patients');
    if (!patients.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No patients yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = patients.map((p) => `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.age}</td>
        <td>${p.gender}</td>
        <td>${p.phone || '-'}</td>
        <td>${p.bloodGroup || '-'}</td>
        <td class="row-actions">
          <button class="btn secondary" onclick="editPatient(${p.id})">Edit</button>
          <button class="btn danger" onclick="deletePatient(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Failed to load patients.</td></tr>`;
  }
}

function patientForm(p = {}) {
  return `
    <div class="form-group"><label>Name</label><input id="f_name" value="${p.name || ''}" /></div>
    <div class="form-group"><label>Age</label><input id="f_age" type="number" value="${p.age || ''}" /></div>
    <div class="form-group"><label>Gender</label>
      <select id="f_gender">
        <option ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
    <div class="form-group"><label>Phone</label><input id="f_phone" value="${p.phone || ''}" /></div>
    <div class="form-group"><label>Blood Group</label><input id="f_bloodGroup" value="${p.bloodGroup || ''}" /></div>
    <div class="form-group"><label>Address</label><input id="f_address" value="${p.address || ''}" /></div>
    <div class="form-actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn primary" id="f_submit">Save</button>
    </div>
  `;
}

document.getElementById('openAddPatient').addEventListener('click', () => {
  openModal('Add Patient', patientForm());
  document.getElementById('f_submit').addEventListener('click', async () => {
    try {
      await api('/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('f_name').value,
          age: Number(document.getElementById('f_age').value),
          gender: document.getElementById('f_gender').value,
          phone: document.getElementById('f_phone').value,
          bloodGroup: document.getElementById('f_bloodGroup').value,
          address: document.getElementById('f_address').value
        })
      });
      closeModal();
      showToast('Patient added');
      loadPatients();
    } catch (e) { showToast(e.message, true); }
  });
});

async function editPatient(id) {
  const p = await api(`/patients/${id}`);
  openModal('Edit Patient', patientForm(p));
  document.getElementById('f_submit').addEventListener('click', async () => {
    try {
      await api(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('f_name').value,
          age: Number(document.getElementById('f_age').value),
          gender: document.getElementById('f_gender').value,
          phone: document.getElementById('f_phone').value,
          bloodGroup: document.getElementById('f_bloodGroup').value,
          address: document.getElementById('f_address').value
        })
      });
      closeModal();
      showToast('Patient updated');
      loadPatients();
    } catch (e) { showToast(e.message, true); }
  });
}

async function deletePatient(id) {
  if (!confirm('Delete this patient? Their appointments will also be removed.')) return;
  try {
    await api(`/patients/${id}`, { method: 'DELETE' });
    showToast('Patient deleted');
    loadPatients();
  } catch (e) { showToast(e.message, true); }
}

// =====================================================
// DOCTORS
// =====================================================
async function loadDoctors() {
  const tbody = document.getElementById('doctorsTableBody');
  try {
    const doctors = await api('/doctors');
    if (!doctors.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No doctors yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = doctors.map((d) => `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.specialization}</td>
        <td>${d.phone || '-'}</td>
        <td>${(d.availableDays || []).join(', ') || '-'}</td>
        <td class="row-actions">
          <button class="btn secondary" onclick="editDoctor(${d.id})">Edit</button>
          <button class="btn danger" onclick="deleteDoctor(${d.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Failed to load doctors.</td></tr>`;
  }
}

function doctorForm(d = {}) {
  return `
    <div class="form-group"><label>Name</label><input id="f_name" value="${d.name || ''}" /></div>
    <div class="form-group"><label>Specialization</label><input id="f_spec" value="${d.specialization || ''}" /></div>
    <div class="form-group"><label>Phone</label><input id="f_phone" value="${d.phone || ''}" /></div>
    <div class="form-group"><label>Available Days (comma separated)</label>
      <input id="f_days" value="${(d.availableDays || []).join(', ')}" placeholder="Mon, Wed, Fri" />
    </div>
    <div class="form-actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn primary" id="f_submit">Save</button>
    </div>
  `;
}

document.getElementById('openAddDoctor').addEventListener('click', () => {
  openModal('Add Doctor', doctorForm());
  document.getElementById('f_submit').addEventListener('click', async () => {
    try {
      await api('/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('f_name').value,
          specialization: document.getElementById('f_spec').value,
          phone: document.getElementById('f_phone').value,
          availableDays: document.getElementById('f_days').value.split(',').map((s) => s.trim()).filter(Boolean)
        })
      });
      closeModal();
      showToast('Doctor added');
      loadDoctors();
    } catch (e) { showToast(e.message, true); }
  });
});

async function editDoctor(id) {
  const d = await api(`/doctors/${id}`);
  openModal('Edit Doctor', doctorForm(d));
  document.getElementById('f_submit').addEventListener('click', async () => {
    try {
      await api(`/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('f_name').value,
          specialization: document.getElementById('f_spec').value,
          phone: document.getElementById('f_phone').value,
          availableDays: document.getElementById('f_days').value.split(',').map((s) => s.trim()).filter(Boolean)
        })
      });
      closeModal();
      showToast('Doctor updated');
      loadDoctors();
    } catch (e) { showToast(e.message, true); }
  });
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor? Their appointments will also be removed.')) return;
  try {
    await api(`/doctors/${id}`, { method: 'DELETE' });
    showToast('Doctor deleted');
    loadDoctors();
  } catch (e) { showToast(e.message, true); }
}

// =====================================================
// APPOINTMENTS
// =====================================================
async function loadAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  try {
    const appointments = await api('/appointments');
    if (!appointments.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No appointments yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = appointments.map((a) => `
      <tr>
        <td>${a.id}</td>
        <td>${a.patientName}</td>
        <td>${a.doctorName}</td>
        <td>${a.date}</td>
        <td>${a.time}</td>
        <td>${a.status}</td>
        <td class="row-actions">
          ${a.status === 'Scheduled' ? `<button class="btn secondary" onclick="completeAppointment(${a.id})">Complete</button>` : ''}
          <button class="btn danger" onclick="deleteAppointment(${a.id})">Cancel</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Failed to load appointments.</td></tr>`;
  }
}

async function appointmentForm() {
  const [patients, doctors] = await Promise.all([api('/patients'), api('/doctors')]);
  return `
    <div class="form-group"><label>Patient</label>
      <select id="f_patient">${patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Doctor</label>
      <select id="f_doctor">${doctors.map((d) => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Date</label><input id="f_date" type="date" /></div>
    <div class="form-group"><label>Time</label><input id="f_time" type="time" /></div>
    <div class="form-group"><label>Reason</label><input id="f_reason" placeholder="Reason for visit" /></div>
    <div class="form-actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn primary" id="f_submit">Book</button>
    </div>
  `;
}

document.getElementById('openAddAppointment').addEventListener('click', async () => {
  const patients = await api('/patients');
  const doctors = await api('/doctors');
  if (!patients.length || !doctors.length) {
    showToast('Add at least one patient and one doctor first', true);
    return;
  }
  openModal('Book Appointment', await appointmentForm());
  document.getElementById('f_submit').addEventListener('click', async () => {
    try {
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: Number(document.getElementById('f_patient').value),
          doctorId: Number(document.getElementById('f_doctor').value),
          date: document.getElementById('f_date').value,
          time: document.getElementById('f_time').value,
          reason: document.getElementById('f_reason').value
        })
      });
      closeModal();
      showToast('Appointment booked');
      loadAppointments();
    } catch (e) { showToast(e.message, true); }
  });
});

async function completeAppointment(id) {
  try {
    await api(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Completed' }) });
    showToast('Appointment marked completed');
    loadAppointments();
  } catch (e) { showToast(e.message, true); }
}

async function deleteAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await api(`/appointments/${id}`, { method: 'DELETE' });
    showToast('Appointment cancelled');
    loadAppointments();
  } catch (e) { showToast(e.message, true); }
}

// ---------- Init ----------
loadDashboard();
