// /js/camarera-dashboard.js

let allRooms = [];
let currentMode = 'mine'; // 'mine' | 'all'
let currentStatusFilter = 'ALL'; // ALL | DIRTY_OR_OCCUPIED | OCCUPIED | DISABLED

let selectedHabitacionId = null;
let selectedHabitacionNumero = null;
let incidentPhotosDataUrls = [];

let incidentModal;

// userId de la camarera logueada
const userId = Number(localStorage.getItem('userId'));

// ======== variables de cámara para incidencias ========
let incidentStream = null;
let incidentFacingMode = 'environment'; // trasera por defecto

document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('incidentModal');
  incidentModal = new bootstrap.Modal(modalElement);

  // Cuando se cierre el modal, apagamos la cámara
  modalElement.addEventListener('hidden.bs.modal', () => {
    stopIncidentCamera();
  });

  // Botones Mis Habitaciones / Todas
  document.getElementById('btnMisHabitaciones')
    .addEventListener('click', () => {
      currentMode = 'mine';
      toggleMainFilterButtons('mine');
      renderRooms();
    });

  document.getElementById('btnTodasHabitaciones')
    .addEventListener('click', () => {
      currentMode = 'all';
      toggleMainFilterButtons('all');
      renderRooms();
    });

  // Chips de estado
  document.querySelector('.status-all').addEventListener('click', () => {
    setStatusFilter('ALL');
  });
  document.querySelector('.status-dirty').addEventListener('click', () => {
    setStatusFilter('DIRTY_OR_OCCUPIED');
  });
  document.querySelector('.status-occupied').addEventListener('click', () => {
    setStatusFilter('OCCUPIED');
  });
  document.querySelector('.status-disabled').addEventListener('click', () => {
    setStatusFilter('DISABLED');
  });

  // ======== Cámara en modal de incidencia ========

  const uploadBox = document.getElementById('incidentUploadBox');
  const takePhotoBtn = document.getElementById('incidentTakePhoto');
  const switchCameraBtn = document.getElementById('incidentSwitchCamera');

  // Abrir / activar cámara al pulsar el recuadro
  uploadBox.addEventListener('click', openIncidentCamera);
  // Tomar foto
  takePhotoBtn.addEventListener('click', takeIncidentPhoto);
  // Cambiar entre frontal / trasera
  switchCameraBtn.addEventListener('click', switchIncidentCamera);

  // Enviar incidencia
  document.getElementById('btnSendIncident')
    .addEventListener('click', enviarIncidencia);

  // Cargar datos iniciales
  cargarHabitaciones();
});

// =========================
// CARGAR HABITACIONES
// =========================

async function cargarHabitaciones() {
  try {
    const resp = await authFetch('/api/habitaciones');
    allRooms = await resp.json();
    renderRooms();
  } catch (err) {
    console.error('Error cargando habitaciones', err);
  }
}

// =========================
// FILTROS
// =========================

function toggleMainFilterButtons(mode) {
  const btnMine = document.getElementById('btnMisHabitaciones');
  const btnAll = document.getElementById('btnTodasHabitaciones');

  if (mode === 'mine') {
    btnMine.classList.add('active');
    btnAll.classList.remove('active');
  } else {
    btnAll.classList.add('active');
    btnMine.classList.remove('active');
  }
}

function setStatusFilter(filter) {
  currentStatusFilter = filter;

  document.querySelectorAll('.status-chip').forEach(btn => btn.classList.remove('active'));

  if (filter === 'ALL') {
    document.querySelector('.status-all').classList.add('active');
  } else if (filter === 'DIRTY_OR_OCCUPIED') {
    document.querySelector('.status-dirty').classList.add('active');
  } else if (filter === 'OCCUPIED') {
    document.querySelector('.status-occupied').classList.add('active');
  } else if (filter === 'DISABLED') {
    document.querySelector('.status-disabled').classList.add('active');
  }

  renderRooms();
}

function getFilteredRooms() {
  let roomsBase = [];

  if (currentMode === 'mine') {
    // Mis habitaciones = aquellas donde estoy asignado como camarera
    roomsBase = allRooms.filter(h =>
      (h.camareras || []).some(c => c.id === userId)
    );
  } else {
    roomsBase = [...allRooms];
  }

  // Filtro por estado
  if (currentStatusFilter === 'DIRTY_OR_OCCUPIED') {
    roomsBase = roomsBase.filter(h => h.estado === 'SUCIA' || h.estado === 'OCUPADA');
  } else if (currentStatusFilter === 'OCCUPIED') {
    roomsBase = roomsBase.filter(h => h.estado === 'OCUPADA');
  } else if (currentStatusFilter === 'DISABLED') {
    roomsBase = roomsBase.filter(h => h.estado === 'INHABILITADA');
  }

  return roomsBase;
}

// =========================
// RENDER DE HABITACIONES
// =========================

function renderRooms() {
  const container = document.getElementById('roomList');
  container.innerHTML = '';

  const rooms = getFilteredRooms();

  if (rooms.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-center text-muted mt-3';
    empty.textContent = 'No hay habitaciones para mostrar con los filtros actuales.';
    container.appendChild(empty);
    return;
  }

  rooms.forEach(h => {
    const card = document.createElement('div');
    card.className = 'card room-card mb-3';

    const badgeClass = getBadgeClass(h.estado);
    const estadoTexto = getEstadoTexto(h.estado);

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="fw-bold fs-4">${h.numero}</span>
              <span class="badge ${badgeClass}">${estadoTexto}</span>
            </div>
            <div class="text-muted small">Piso ${h.piso ?? '-'}</div>
          </div>
        </div>

        <div class="mt-3">
          <div class="row g-2">
            <div class="col-12 col-md-8">
              <button class="btn w-100 room-btn-clean" data-id="${h.id}">
                <i class="bi bi-check-circle me-2"></i>
                Marcar Limpia
              </button>
            </div>
            <div class="col-12 col-md-4">
              <button
                class="btn w-100 room-btn-report"
                data-id="${h.id}"
                data-numero="${h.numero}"
                data-bs-toggle="modal"
                data-bs-target="#incidentModal"
              >
                <i class="bi bi-exclamation-triangle me-2"></i>
                Reportar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Eventos de botones
  container.querySelectorAll('.room-btn-clean').forEach(btn => {
    const id = Number(btn.getAttribute('data-id'));
    btn.addEventListener('click', () => marcarHabitacionLimpia(id));
  });

  container.querySelectorAll('.room-btn-report').forEach(btn => {
    const id = Number(btn.getAttribute('data-id'));
    const numero = btn.getAttribute('data-numero');
    btn.addEventListener('click', () => abrirModalIncidencia(id, numero));
  });
}

function getBadgeClass(estado) {
  switch (estado) {
    case 'DISPONIBLE':
      return 'room-status-available';
    case 'OCUPADA':
      return 'room-status-occupied';
    case 'SUCIA':
      return 'room-status-dirty';
    case 'INHABILITADA':
      return 'room-status-disabled';
    default:
      return 'room-status-available';
  }
}

function getEstadoTexto(estado) {
  switch (estado) {
    case 'DISPONIBLE': return 'Disponible';
    case 'OCUPADA': return 'Ocupada';
    case 'SUCIA': return 'Sucia';
    case 'INHABILITADA': return 'Inhabilitada';
    default: return estado;
  }
}

// =========================
// MARCAR HABITACIÓN LIMPIA
// POST /api/limpiezas/marcar-limpia
// =========================

async function marcarHabitacionLimpia(habitacionId) {
  const body = {
    habitacionId,
    camareraId: userId
  };

  try {
    if (!navigator.onLine) {
      await saveOfflineAction({
        type: 'MARCAR_LIMPIA',
        payload: body,
        token: localStorage.getItem('token')
      });

      alert('Sin internet. Acción guardada.');
      return;
    }

    const resp = await authFetch('/api/limpiezas/marcar-limpia', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    await cargarHabitaciones();
  } catch (err) {
    console.error(err);
    alert('Error al marcar limpia');
  }
}


// =========================
// MODAL DE INCIDENCIA
// =========================

function abrirModalIncidencia(habitacionId, numero) {
  selectedHabitacionId = habitacionId;
  selectedHabitacionNumero = numero;

  // reset
  incidentPhotosDataUrls = [];
  document.getElementById('incidentDescription').value = '';
  document.getElementById('incidentPreviews').innerHTML = '';
  const errorBox = document.getElementById('incidentError');
  errorBox.classList.add('d-none');
  errorBox.textContent = '';

  // ocultar contenedor cámara por si estaba abierto
  stopIncidentCamera();

  const title = document.getElementById('incidentModalTitle');
  title.textContent = `Reportar Incidente - Hab. ${numero}`;
}

// =========================
// CÁMARA PARA INCIDENCIAS
// =========================

async function openIncidentCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Tu navegador no soporta acceso a la cámara.');
    return;
  }

  // Si ya hay 3 fotos, no dejar tomar más
  if (incidentPhotosDataUrls.length >= 3) {
    alert('Ya tienes 3 fotos capturadas (máximo permitido).');
    return;
  }

  // Si ya hay un stream activo, no reiniciar
  if (incidentStream) {
    document.getElementById('incidentCameraContainer').classList.remove('d-none');
    return;
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: incidentFacingMode },
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    incidentStream = await navigator.mediaDevices.getUserMedia(constraints);

    const video = document.getElementById('incidentVideo');
    video.srcObject = incidentStream;

    document.getElementById('incidentCameraContainer').classList.remove('d-none');

    console.log('Cámara de incidente abierta - modo:', incidentFacingMode);
  } catch (err) {
    console.error('Error al acceder a la cámara del incidente:', err);
    alert('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
  }
}

function stopIncidentCamera() {
  if (incidentStream) {
    incidentStream.getTracks().forEach(t => t.stop());
    incidentStream = null;
  }
  const video = document.getElementById('incidentVideo');
  if (video) {
    video.srcObject = null;
  }
  const camContainer = document.getElementById('incidentCameraContainer');
  if (camContainer) {
    camContainer.classList.add('d-none');
  }
}

async function switchIncidentCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

  // Cambiar modo
  incidentFacingMode = incidentFacingMode === 'environment' ? 'user' : 'environment';

  // Apagar stream actual
  if (incidentStream) {
    incidentStream.getTracks().forEach(t => t.stop());
    incidentStream = null;
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: incidentFacingMode },
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    incidentStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('incidentVideo');
    video.srcObject = incidentStream;

    console.log('Cámara cambiada a', incidentFacingMode);
  } catch (err) {
    console.error('Error al cambiar cámara:', err);
    alert('No se pudo cambiar la cámara en este dispositivo.');
  }
}

function takeIncidentPhoto() {
  if (!incidentStream) {
    alert('Primero abre la cámara tocando el recuadro "Usar cámara".');
    return;
  }

  if (incidentPhotosDataUrls.length >= 3) {
    alert('Máximo 3 fotos por incidente.');
    return;
  }

  const video = document.getElementById('incidentVideo');
  const canvas = document.getElementById('incidentCanvas');
  const previews = document.getElementById('incidentPreviews');

  const ctx = canvas.getContext('2d');

  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(video, 0, 0, w, h);

  // JPG base64 (más pequeño que PNG)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  incidentPhotosDataUrls.push(dataUrl);

  // Crear preview
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.width = '80px';
  img.style.height = '80px';
  img.style.objectFit = 'cover';
  img.className = 'rounded border';

  previews.appendChild(img);
}

// =========================
// ENVIAR INCIDENCIA
// POST /api/incidencias
// =========================

async function enviarIncidencia() {
  const desc = document.getElementById('incidentDescription').value.trim();
  const errorBox = document.getElementById('incidentError');

  errorBox.classList.add('d-none');
  errorBox.textContent = '';

  if (!selectedHabitacionId) {
    errorBox.textContent = 'No se ha seleccionado una habitación.';
    errorBox.classList.remove('d-none');
    return;
  }

  if (!desc) {
    errorBox.textContent = 'La descripción es obligatoria.';
    errorBox.classList.remove('d-none');
    return;
  }

  if (incidentPhotosDataUrls.length === 0) {
    errorBox.textContent = 'Debe adjuntar al menos una foto (máx. 3).';
    errorBox.classList.remove('d-none');
    return;
  }

  if (!navigator.onLine) {
    await saveOfflineAction({
      type: 'INCIDENCIA',
      payload: body,
      token: localStorage.getItem('token')
    });

    incidentModal.hide();
    alert('Sin internet. Incidencia guardada.');
    return;
  }

  try {
    // 👉 aquí convertimos SIEMPRE a base64 puro
    const fotosBase64 = incidentPhotosDataUrls
      .slice(0, 3)
      .map(extractBase64FromDataUrl);

    const body = {
      habitacionId: selectedHabitacionId,
      camareraId: userId,
      descripcion: desc,
      fotos: fotosBase64
    };

    const resp = await authFetch('/api/incidencias', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      throw new Error('Error al crear incidencia');
    }

    incidentModal.hide();
    await cargarHabitaciones(); // habitación pasa a INHABILITADA

  } catch (err) {
    console.error(err);
    errorBox.textContent = 'No se pudo enviar el reporte de incidencia.';
    errorBox.classList.remove('d-none');
  }
}


function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl) return '';
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;
}