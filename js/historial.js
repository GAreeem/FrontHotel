// /js/historial.js

document.addEventListener('DOMContentLoaded', () => {
  cargarHistorial();
});

async function cargarHistorial() {
  try {
    const resp = await authFetch('/api/limpiezas/historial?limit=50');
    const data = await resp.json();
    renderHistorial(data);
  } catch (err) {
    console.error('Error cargando historial de limpiezas', err);
  }
}

function renderHistorial(registros) {
  const tbody = document.getElementById('historial-tbody');
  tbody.innerHTML = '';

  if (!registros || registros.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'text-center text-muted';
    td.textContent = 'No hay registros de limpieza.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  registros.forEach(reg => {
    const tr = document.createElement('tr');

    // Fecha y hora (reg.fechaHora viene en ISO string)
    const fecha = new Date(reg.fechaHora);
    const fechaTexto = fecha.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const horaTexto = fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });

    const numeroHabitacion = reg.habitacion?.numero ?? '-';
    const camareraNombre = reg.camarera?.nombre || reg.camarera?.username || '-';

    tr.innerHTML = `
      <td>
        <div class="d-flex flex-column">
          <span class="fw-semibold">${fechaTexto}</span>
          <span class="text-muted small">${horaTexto}</span>
        </div>
      </td>
      <td class="fw-bold">${numeroHabitacion}</td>
      <td>${camareraNombre}</td>
      <td>
        <span class="badge rounded-pill badge-clean-history">
          Limpiada
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}
