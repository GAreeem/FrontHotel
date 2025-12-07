// /js/camareras.js

let camareras = [];
let modalCamarera;
let isEditMode = false; // false = crear, true = editar

document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('modalCamarera');
  modalCamarera = new bootstrap.Modal(modalElement);

  document.getElementById('btnNuevaCamarera')
    .addEventListener('click', abrirModalCrear);

  document.getElementById('btnGuardarCamarera')
    .addEventListener('click', guardarCamarera);

  cargarCamareras();
});

// =========================
// CARGAR LISTA
// =========================

async function cargarCamareras() {
  try {
    const resp = await authFetch('/api/usuarios/camareras');
    camareras = await resp.json();
    renderCamareras();
  } catch (err) {
    console.error('Error cargando camareras', err);
  }
}

// =========================
// RENDER TABLA
// =========================

function renderCamareras() {
  const tbody = document.getElementById('camareras-tbody');
  tbody.innerHTML = '';

  camareras.forEach(u => {
    const tr = document.createElement('tr');

    const estadoTexto = u.activo ? 'Activo' : 'Inactivo';
    const estadoClase = u.activo ? 'state-active' : 'text-muted';

    tr.innerHTML = `
      <td class="fw-medium">
        <div class="d-flex align-items-center gap-2">
          <div class="user-avatar rounded-circle">
            <i class="bi bi-person"></i>
          </div>
          ${u.nombre || u.username}
        </div>
      </td>
      <td>${u.username}</td>
      <td>
        <span class="badge rounded-pill role-badge-housekeeper">
          Camarera
        </span>
      </td>
      <td>
        <span class="${estadoClase}">${estadoTexto}</span>
      </td>
      <td class="text-end">
        <button class="btn btn-light btn-sm me-1 btn-editar" data-id="${u.id}">
          Editar
        </button>
        <button class="btn btn-outline-danger btn-sm btn-eliminar" data-id="${u.id}">
          Eliminar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      abrirModalEditar(id);
    });
  });

  tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      eliminarCamarera(id);
    });
  });
}

// =========================
// MODAL CREAR / EDITAR
// =========================

function limpiarFormulario() {
  document.getElementById('usuarioId').value = '';
  document.getElementById('nombreInput').value = '';
  document.getElementById('emailInput').value = '';
  document.getElementById('passwordInput').value = '';
  document.getElementById('activoCheckbox').checked = true;
  const errorBox = document.getElementById('camareraError');
  errorBox.classList.add('d-none');
  errorBox.textContent = '';
}

function abrirModalCrear() {
  isEditMode = false;
  limpiarFormulario();
  document.getElementById('modalCamareraTitle').textContent = 'Nueva Camarera';
  modalCamarera.show();
}

function abrirModalEditar(idUsuario) {
  const u = camareras.find(x => x.id === idUsuario);
  if (!u) return;

  isEditMode = true;
  limpiarFormulario();

  document.getElementById('modalCamareraTitle').textContent = 'Editar Camarera';
  document.getElementById('usuarioId').value = u.id;
  document.getElementById('nombreInput').value = u.nombre || '';
  document.getElementById('emailInput').value = u.username || '';
  document.getElementById('activoCheckbox').checked = !!u.activo;

  modalCamarera.show();
}

// =========================
// GUARDAR (CREAR / EDITAR)
// =========================

async function guardarCamarera() {
  const errorBox = document.getElementById('camareraError');
  errorBox.classList.add('d-none');
  errorBox.textContent = '';

  const id = document.getElementById('usuarioId').value;
  const nombre = document.getElementById('nombreInput').value.trim();
  const username = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  const activo = document.getElementById('activoCheckbox').checked;

  if (!nombre || !username || (!isEditMode && !password)) {
    errorBox.textContent = 'Nombre, correo y contraseña (al crear) son obligatorios.';
    errorBox.classList.remove('d-none');
    return;
  }

  try {
    if (!isEditMode) {
      // CREAR
      const body = {
        nombre,
        username,
        password,
        rol: 'LIMPIEZA',
        activo
      };

      const resp = await authFetch('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        throw new Error('Error al crear camarera');
      }

    } else {
      // EDITAR
      const idNum = Number(id);

      const body = {
        nombre,
        username,
        rol: 'LIMPIEZA',
        activo
      };

      // Si el usuario escribió password, la mandamos; si no, mandamos cadena vacía
      // y el backend la ignora (por la validación isBlank)
      body.password = password;

      const resp = await authFetch(`/api/usuarios/${idNum}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        throw new Error('Error al actualizar camarera');
      }
    }

    await cargarCamareras();
    modalCamarera.hide();

  } catch (err) {
    console.error(err);
    errorBox.textContent = 'Error al guardar la camarera.';
    errorBox.classList.remove('d-none');
  }
}

// =========================
// ELIMINAR
// =========================

async function eliminarCamarera(idUsuario) {
  const confirmar = window.confirm('¿Seguro que deseas eliminar esta camarera?');
  if (!confirmar) return;

  try {
    const resp = await authFetch(`/api/usuarios/${idUsuario}`, {
      method: 'DELETE'
    });

    if (!resp.ok && resp.status !== 204) {
      throw new Error('Error al eliminar usuario');
    }

    await cargarCamareras();
  } catch (err) {
    console.error(err);
    alert('No se pudo eliminar la camarera.');
  }
}
