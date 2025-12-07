// /js/habitaciones.js

let habitaciones = [];
let camareras = [];
let modalHabitacion;
let isEditMode = false; // false = crear, true = editar

document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('modalHabitacion');
  modalHabitacion = new bootstrap.Modal(modalElement);

  document.getElementById('btnNuevaHabitacion')
    .addEventListener('click', abrirModalCrear);

  document.getElementById('btnGuardarHabitacion')
    .addEventListener('click', guardarHabitacion);

  cargarCamareras();
  cargarHabitaciones();
});

// =========================
// CARGAS INICIALES
// =========================

async function cargarHabitaciones() {
  try {
    const resp = await authFetch('/api/habitaciones');
    const data = await resp.json();
    habitaciones = data;
    renderHabitaciones();
  } catch (err) {
    console.error('Error cargando habitaciones', err);
  }
}

async function cargarCamareras() {
  try {
    const resp = await authFetch('/api/usuarios/camareras');
    camareras = await resp.json();
    renderCamarerasCheckboxes();
  } catch (err) {
    console.error('Error cargando camareras', err);
  }
}

// =========================
// RENDER DE TABLA Y CHECKBOXES
// =========================

function renderHabitaciones() {
  const tbody = document.getElementById('habitaciones-tbody');
  tbody.innerHTML = '';

  habitaciones.forEach(h => {
    const tr = document.createElement('tr');

    const camarerasNombres = (h.camareras || [])
      .map(c => c.nombre || c.username)
      .join(', ');

    const limpiaHoyTexto = h.limpiaHoy ? 'Sí' : '-';

    tr.innerHTML = `
      <td>${h.numero}</td>
      <td>${h.piso ?? ''}</td>
      <td>${h.estado}</td>
      <td>${limpiaHoyTexto}</td>
      <td>${camarerasNombres}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-id="${h.id}">
          Editar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Delegar eventos de los botones editar
  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      abrirModalEditar(id);
    });
  });
}

function renderCamarerasCheckboxes() {
  const cont = document.getElementById('camarerasContainer');
  cont.innerHTML = '';

  camareras.forEach(c => {
    const div = document.createElement('div');
    div.classList.add('form-check');

    const labelTexto = `${c.nombre || ''} (${c.username})`;

    div.innerHTML = `
      <input class="form-check-input camarera-checkbox"
             type="checkbox"
             value="${c.id}"
             id="cam-${c.id}">
      <label class="form-check-label" for="cam-${c.id}">
        ${labelTexto}
      </label>
    `;

    cont.appendChild(div);
  });
}

// =========================
// MODAL CREAR / EDITAR
// =========================

function limpiarFormulario() {
  document.getElementById('habitacionId').value = '';
  document.getElementById('numeroInput').value = '';
  document.getElementById('pisoInput').value = '';
  document.getElementById('estadoSelect').value = 'DISPONIBLE';
  document.getElementById('notasInput').value = '';
  document.getElementById('habitacionError').classList.add('d-none');

  document.querySelectorAll('.camarera-checkbox').forEach(chk => {
    chk.checked = false;
  });
}

function abrirModalCrear() {
  isEditMode = false;
  limpiarFormulario();
  document.getElementById('modalHabitacionTitle').textContent = 'Nueva Habitación';
  modalHabitacion.show();
}

function abrirModalEditar(idHabitacion) {
  const hab = habitaciones.find(h => h.id === idHabitacion);
  if (!hab) return;

  isEditMode = true;
  limpiarFormulario();

  document.getElementById('modalHabitacionTitle').textContent = 'Editar Habitación';
  document.getElementById('habitacionId').value = hab.id;
  document.getElementById('numeroInput').value = hab.numero || '';
  document.getElementById('pisoInput').value = hab.piso ?? '';
  document.getElementById('estadoSelect').value = hab.estado || 'DISPONIBLE';
  document.getElementById('notasInput').value = hab.notas || '';

  const idsAsignadas = (hab.camareras || []).map(c => c.id);

  document.querySelectorAll('.camarera-checkbox').forEach(chk => {
    chk.checked = idsAsignadas.includes(Number(chk.value));
  });

  modalHabitacion.show();
}

// =========================
// GUARDAR (CREAR / EDITAR)
// =========================

async function guardarHabitacion() {
  const errorBox = document.getElementById('habitacionError');
  errorBox.classList.add('d-none');
  errorBox.textContent = '';

  const id = document.getElementById('habitacionId').value;
  const numero = document.getElementById('numeroInput').value.trim();
  const piso = Number(document.getElementById('pisoInput').value);
  const estado = document.getElementById('estadoSelect').value;
  const notas = document.getElementById('notasInput').value.trim();

  const seleccionados = Array.from(document.querySelectorAll('.camarera-checkbox'))
    .filter(chk => chk.checked)
    .map(chk => Number(chk.value));

  if (!numero || !piso) {
    errorBox.textContent = 'Número y piso son obligatorios.';
    errorBox.classList.remove('d-none');
    return;
  }

  try {
    if (!isEditMode) {
      // =========================
      // CREAR HABITACIÓN
      // =========================
      const body = {
        numero,
        piso,
        estado,          // el backend también lo tiene en el entity
        limpiaHoy: false,
        notas
      };

      const resp = await authFetch('/api/habitaciones', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        throw new Error('Error al crear habitación');
      }

      const nuevaHab = await resp.json();
      const idNueva = nuevaHab.id;

      // Asignar camareras seleccionadas
      for (const camId of seleccionados) {
        await authFetch(`/api/habitaciones/${idNueva}/asignar-camarera/${camId}`, {
          method: 'PUT'
        });
      }

    } else {
      // =========================
      // EDITAR HABITACIÓN
      // =========================
      const idNum = Number(id);
      const habOriginal = habitaciones.find(h => h.id === idNum);

      const bodyUpdate = {
        numero,
        piso,
        notas
      };

      // 1) Actualizar datos básicos
      const respUpdate = await authFetch(`/api/habitaciones/${idNum}`, {
        method: 'PUT',
        body: JSON.stringify(bodyUpdate)
      });
      if (!respUpdate.ok) {
        throw new Error('Error al actualizar habitación');
      }

      // 2) Cambiar estado con la API /estado?estado=...
      await authFetch(`/api/habitaciones/${idNum}/estado?estado=${encodeURIComponent(estado)}`, {
        method: 'PUT'
      });

      // 3) Actualizar asignación de camareras
      const idsAntes = (habOriginal.camareras || []).map(c => c.id);

      // camareras a quitar
      const aQuitar = idsAntes.filter(idAnt => !seleccionados.includes(idAnt));
      // camareras a agregar
      const aAgregar = seleccionados.filter(idNuevo => !idsAntes.includes(idNuevo));

      for (const camId of aQuitar) {
        await authFetch(`/api/habitaciones/${idNum}/quitar-camarera/${camId}`, {
          method: 'PUT'
        });
      }

      for (const camId of aAgregar) {
        await authFetch(`/api/habitaciones/${idNum}/asignar-camarera/${camId}`, {
          method: 'PUT'
        });
      }
    }

    // Recargar lista y cerrar modal
    await cargarHabitaciones();
    modalHabitacion.hide();

  } catch (err) {
    console.error(err);
    errorBox.textContent = 'Error al guardar la habitación.';
    errorBox.classList.remove('d-none');
  }
}
