const API_BASE_URL = 'https://likable-burt-superlaboriously.ngrok-free.dev';

// Si usamos ngrok, agregamos el header especial
const NGROK_EXTRA_HEADERS = API_BASE_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {};

// allowedRoles es un array, ej: ['RECEPCION'] o ['LIMPIEZA']
function checkAuth(allowedRoles) {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  // Si no hay token → al login
  if (!token) {
    window.location.href = '/FrontHotel/index.html';
    return;
  }

  // Si el rol NO está en los permitidos para esta página
  if (!allowedRoles.includes(rol)) {
    // Redirigimos a SU página correcta
    if (rol === 'RECEPCION') {
      window.location.href = '/FrontHotel/pages/habitaciones.html';
    } else if (rol === 'LIMPIEZA') {
      window.location.href = '/FrontHotel/pages/camarera-dashboard.html';
    } else {
      window.location.href = '/FrontHotel/index.html';
    }
  }
}

// Fetch con token para llamar al backend
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...NGROK_EXTRA_HEADERS,
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.href = '/FrontHotel/index.html';
  }

  return response;
}

function logout() {
  localStorage.clear();   // elimina token, rol, username, nombre, userId, etc.
  window.location.href = '/FrontHotel/index.html';
}

