const API_BASE_URL = 'http://34.204.177.162:8080';

// allowedRoles es un array, ej: ['RECEPCION'] o ['LIMPIEZA']
function checkAuth(allowedRoles) {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  // Si no hay token → al login
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Si el rol NO está en los permitidos para esta página
  if (!allowedRoles.includes(rol)) {
    // Redirigimos a SU página correcta
    if (rol === 'RECEPCION') {
      window.location.href = 'habitaciones.html';
    } else if (rol === 'LIMPIEZA') {
      window.location.href = 'camarera-dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
  }
}

// Fetch con token para llamar al backend
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.href = 'index.html';
  }

  return response;
}

function logout() {
  localStorage.clear();   // elimina token, rol, username, nombre, userId, etc.
  window.location.href = 'index.html';
}

