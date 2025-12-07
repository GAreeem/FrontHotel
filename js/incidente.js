// /js/incidentes.js

let allIncidents = [];
let currentFilter = 'open'; // open | resolved | all
let selectedIncident = null;
let incidentModal = null;

// id del usuario recepción logueado
const userId = Number(localStorage.getItem('userId'));

document.addEventListener('DOMContentLoaded', () => {
  // Modal
  const modalEl = document.getElementById('incidentDetailModal');
  incidentModal = new bootstrap.Modal(modalEl);

  // Tabs de filtro
  document.querySelectorAll('.incident-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('.incident-tab-btn')
        .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter'); // open | resolved | all
      renderIncidents();
    });
  });

  // Botón resolver
  document.getElementById('btnResolveIncident')
    .addEventListener('click', handleResolveIncident);

  // Cargar datos
  cargarIncidencias();
});

// ====================
// API
// ====================

async function cargarIncidencias() {
  try {
    const resp = await authFetch('/api/incidencias');
    if (!resp.ok) {
      console.error('Error al cargar incidencias', resp.status);
      return;
    }

    allIncidents = await resp.json();
    renderIncidents();
  } catch (err) {
    console.error('Error cargando incidencias', err);
  }
}

// ====================
// RENDER LISTA
// ====================
function buildImageSrc(foto) {
  if (!foto) return '';
  // Si ya viene como data:image/... úsalo tal cual
  if (foto.startsWith('data:image')) {
    return foto;
  }
  // Si es solo Base64 puro, le agregamos el prefijo
  return `data:image/jpeg;base64,${foto}`;
}


function getFilteredIncidents() {
  if (currentFilter === 'open') {
    return allIncidents.filter(i => i.abierta === true);
  }
  if (currentFilter === 'resolved') {
    return allIncidents.filter(i => i.abierta === false);
  }
  return allIncidents;
}

function renderIncidents() {
  const list = document.getElementById('incidentList');
  const empty = document.getElementById('incidentEmptyState');

  list.innerHTML = '';

  const incidents = getFilteredIncidents();

  if (!incidents.length) {
    empty.classList.remove('d-none');
    return;
  } else {
    empty.classList.add('d-none');
  }

  incidents.forEach(inc => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';

    const fecha = formatDateTime(inc.creadaEn);
    const descripcionCorta = truncateText(inc.descripcion || '', 130);
    const nombreCamarera = inc.camarera?.nombre || 'Desconocido';

    const badgeClass = inc.abierta ? 'incident-badge-open' : 'incident-badge-resolved';
    const badgeText = inc.abierta ? 'Abierto' : 'Resuelto';

    col.innerHTML = `
      <div class="card incident-card shadow-sm h-100 cursor-pointer">
        <div class="card-header bg-white border-0 pb-2 d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-title mb-0 fw-bold">Hab. ${inc.habitacion?.numero ?? '-'}</h6>
            <p class="text-muted small mb-0">${fecha}</p>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-body pt-2">
          <p class="card-text incident-description-clamp mb-3">
            ${escapeHtml(descripcionCorta)}
          </p>
          <div class="d-flex align-items-center gap-2 text-muted small">
            <i class="bi bi-person"></i>
            <span>${escapeHtml(nombreCamarera)}</span>
          </div>
        </div>
      </div>
    `;

    // click abre modal
    col.querySelector('.incident-card').addEventListener('click', () => {
      openIncidentModal(inc);
    });

    list.appendChild(col);
  });
}

// ====================
// MODAL
// ====================

function openIncidentModal(incident) {
  selectedIncident = incident;

  const titleEl = document.getElementById('incidentModalTitle');
  const statusEl = document.getElementById('incidentModalStatus');
  const descEl = document.getElementById('incidentModalDescription');
  const photosWrapper = document.getElementById('incidentModalPhotosWrapper');
  const photosEl = document.getElementById('incidentModalPhotos');
  const reporterEl = document.getElementById('incidentModalReporter');
  const dateEl = document.getElementById('incidentModalDate');

  titleEl.textContent = `Incidente - Habitación ${incident.habitacion?.numero ?? '-'}`;

  if (incident.abierta) {
    statusEl.textContent = 'Abierto';
    statusEl.classList.remove('incident-badge-resolved');
    statusEl.classList.add('incident-badge-open');
    document.getElementById('btnResolveIncident').classList.remove('d-none');
  } else {
    statusEl.textContent = 'Resuelto';
    statusEl.classList.remove('incident-badge-open');
    statusEl.classList.add('incident-badge-resolved');
    document.getElementById('btnResolveIncident').classList.add('d-none');
  }

  descEl.textContent = incident.descripcion || '';

  // Fotos base64
  photosEl.innerHTML = '';
  const fotos = Array.isArray(incident.fotos) ? incident.fotos : [];

  if (fotos.length === 0) {
    photosWrapper.classList.add('d-none');
  } else {
    photosWrapper.classList.remove('d-none');
    fotos.forEach(b64 => {
      const url = `data:image/jpeg;base64,${b64}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'flex-shrink-0';

      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Evidencia';
      img.className = 'incident-photo-thumb';

      a.appendChild(img);
      photosEl.appendChild(a);
    });
  }

  reporterEl.textContent = incident.camarera?.nombre || 'Desconocido';
  dateEl.textContent = formatLongDateTime(incident.creadaEn);

  incidentModal.show();
}

// ====================
// RESOLVER INCIDENTE (AJUSTA LA URL SEGÚN TU BACK)
// ====================

async function handleResolveIncident() {
  if (!selectedIncident || !selectedIncident.abierta) return;

  const confirmado = confirm('¿Marcar este incidente como resuelto y habilitar la habitación?');
  if (!confirmado) return;

  try {
    const body = {
      recepcionId: userId,
      nuevoEstado: 'DISPONIBLE' // ajusta si quieres otro estado
    };

    const resp = await authFetch(`/api/incidencias/${selectedIncident.id}/cerrar`, {
  method: 'PUT',
  body: JSON.stringify({
    recepcionId: userId,
    nuevoEstado: null
  })
});


    if (!resp.ok) {
      alert('No se pudo resolver el incidente.');
      return;
    }

    incidentModal.hide();
    await cargarIncidencias();
  } catch (err) {
    console.error('Error al resolver incidente', err);
    alert('Error al resolver el incidente.');
  }
}

// ====================
// HELPERS
// ====================

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function formatLongDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function truncateText(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
