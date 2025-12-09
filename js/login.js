const API_BASE_URL = 'https://likable-burt-superlaboriously.ngrok-free.dev';

const NGROK_EXTRA_HEADERS = API_BASE_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('login-form');
  const inputUsername = document.getElementById('input-username');
  const inputPassword = document.getElementById('input-password');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = inputUsername.value.trim();
    const password = inputPassword.value.trim();
    errorBox.classList.add('d-none');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          ...NGROK_EXTRA_HEADERS },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        errorBox.textContent = 'Usuario o contraseña incorrectos.';
        errorBox.classList.remove('d-none');
        return;
      }

      const data = await response.json();

      // Guardar sesión
      localStorage.setItem('token', data.token);
      localStorage.setItem('rol', data.rol);          // "RECEPCION" o "LIMPIEZA"
      localStorage.setItem('username', data.username);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('userId', data.id);

      // 🔹 Redirecciones según rol:
     if (data.rol === 'LIMPIEZA') {
  window.location.href = 'pages/camarera-dashboard.html';
} else if (data.rol === 'RECEPCION') {
  window.location.href = 'pages/habitaciones.html';
} else {
  window.location.href = '/index.html';
}

    } catch (error) {
      console.error(error);
      errorBox.textContent = 'Error en el servidor.';
      errorBox.classList.remove('d-none');
    }
  });
});
