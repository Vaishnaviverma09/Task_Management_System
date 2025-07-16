// DOM Elements
const loginForm = document.getElementById('loginFormElement');
const registerForm = document.getElementById('registerFormElement');
const loginLink = document.getElementById('loginLink');
const registerLink = document.getElementById('registerLink');
const logoutLink = document.getElementById('logoutLink');
const loginFormContainer = document.getElementById('loginForm');
const registerFormContainer = document.getElementById('registerForm');
const authFormsContainer = document.getElementById('authForms');
const dashboard = document.getElementById('dashboard');
const userProfile = document.getElementById('userProfile');
const logoutLi = document.getElementById('logoutLi');

// Event Listeners
loginLink.addEventListener('click', showLoginForm);
registerLink.addEventListener('click', showRegisterForm);
logoutLink.addEventListener('click', logoutUser);

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (registerForm) {
  registerForm.addEventListener('submit', handleRegister);
}

// Functions
function showLoginForm(e) {
  e.preventDefault();
  loginFormContainer.classList.remove('d-none');
  registerFormContainer.classList.add('d-none');
}

function showRegisterForm(e) {
  e.preventDefault();
  registerFormContainer.classList.remove('d-none');
  loginFormContainer.classList.add('d-none');
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ msg: 'Login failed' }));
      throw new Error(errorData.msg || 'Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    await loadUserProfile();
    showDashboard();
    if (typeof loadTasks === 'function') {
      await loadTasks();
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast(err.message || 'An error occurred during login', 'danger');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ msg: 'Registration failed' }));
      const errorMessages = errorData.errors 
        ? errorData.errors.map(err => err.msg).join('\n')
        : errorData.msg;
      throw new Error(errorMessages || 'Registration failed');
    }
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    await loadUserProfile();
    showDashboard();
    if (typeof loadTasks === 'function') {
      await loadTasks();
    }
  } catch (err) {
    console.error('Registration error:', err);
    showToast(err.message || 'An error occurred during registration', 'danger');
  }
}

async function loadUserProfile() {
  const token = localStorage.getItem('token');
  
  if (!token) return;
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load user profile');
    }
    
    const data = await response.json();
    userProfile.innerHTML = `
      <p><strong>Username:</strong> ${data.username}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Member since:</strong> ${new Date(data.createdAt).toLocaleDateString()}</p>
    `;
  } catch (err) {
    console.error('Profile load error:', err);
    localStorage.removeItem('token');
  }
}

function showDashboard() {
  authFormsContainer.classList.add('d-none');
  dashboard.classList.remove('d-none');
  logoutLi.classList.remove('d-none');
  loginLink.parentElement.classList.add('d-none');
  registerLink.parentElement.classList.add('d-none');
}

function logoutUser(e) {
  e.preventDefault();
  localStorage.removeItem('token');
  authFormsContainer.classList.remove('d-none');
  dashboard.classList.add('d-none');
  logoutLi.classList.add('d-none');
  loginLink.parentElement.classList.remove('d-none');
  registerLink.parentElement.classList.remove('d-none');
  showLoginForm(e);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast show align-items-center text-white bg-${type}`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  document.getElementById('toastContainer').appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      await loadUserProfile();
      showDashboard();
      if (typeof loadTasks === 'function') {
        await loadTasks();
      }
    } catch (err) {
      console.error('Authentication check failed:', err);
      localStorage.removeItem('token');
    }
  }
});