// DOM Elements



const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const statusFilter = document.getElementById('statusFilter');
const priorityFilter = document.getElementById('priorityFilter');
const searchInput = document.getElementById('searchInput');
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const themeToggle = document.getElementById('themeToggle');
const authForms = document.getElementById('authForms');
//const dashboard = document.getElementById('dashboard');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners(); 
  if (localStorage.getItem('token')) {
    initDarkMode();
    loadTasks();
  }
});


// ======================
// DARK MODE FUNCTIONALITY
// ======================
function initDarkMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggle(savedTheme);

  themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
  });
}

function updateThemeToggle(theme) {
  const icon = themeToggle.querySelector('i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  themeToggle.innerHTML = `<i class="${icon.className}"></i> ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
}

// ======================
// TASK MANAGEMENT
// ======================
async function loadTasks() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showAuthForms();
      return;
    }

    // Show loading state
    taskList.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>`;

    const response = await fetch('http://localhost:5000/api/tasks', {
      headers: { 'x-auth-token': token }
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      showAuthForms();
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const result = await response.json();
    renderTasks(result.data || []);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    showToast('Failed to load tasks', 'danger');
    taskList.innerHTML = `
      <div class="alert alert-danger">
        Error loading tasks. Please try again later.
      </div>`;
  }
}

function showAuthForms() {
  authForms.classList.remove('d-none');
  dashboard.classList.add('d-none');
}

function renderTasks(tasks) {
  if (!tasks.length) {
    taskList.innerHTML = `
      <div class="empty-state text-center py-5">
        <img src="images/no-tasks.svg" class="mb-3" width="200">
        <h4>Nothing to do yet!</h4>
        <button class="btn btn-primary mt-2" id="createFirstTask">
          Create Your First Task
        </button>
      </div>`;
    return;
  }

  taskList.innerHTML = tasks.map(task => `
    <div class="card task-card mb-3 ${task.priority}" data-id="${task._id}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div style="flex-grow: 1;">
            <h5 class="card-title">${task.title}</h5>
            <p class="card-text text-muted">${task.description || ''}</p>
            
            <!-- Interactive Progress Slider -->
            <div class="progress-container mt-3" style="max-width: 50%; margin: 0 auto;">
              <input 
                type="range" 
                class="form-range progress-slider" 
                min="0" max="100" 
                value="${getSliderValue(task.status)}" 
                data-task-id="${task._id}"
              >
              <div class="d-flex justify-content-between mt-1">
                <small class="text-muted">Pending</small>
                <small class="text-muted">In Progress</small>
                <small class="text-muted">Completed</small>
              </div>
              <div class="progress mt-1" style="height: 6px;">
                <div class="progress-bar ${getStatusClass(task.status)}" 
                  style="width: ${getProgressWidth(task.status)}">
                </div>
              </div>
            </div>
            
            <div class="task-meta mt-3">
              ${task.dueDate ? `
                <span class="badge bg-light text-dark">
                  <i class="far fa-calendar-alt me-1"></i>
                  ${new Date(task.dueDate).toLocaleDateString()}
                  ${task.dueTime ? `• ${task.dueTime}` : ''}
                </span>
              ` : ''}
              
              ${task.location?.address ? `
                <span class="badge bg-light text-dark ms-2">
                  <i class="fas fa-map-marker-alt me-1"></i>
                  ${task.location.address}
                </span>
              ` : ''}
            </div>
          </div>
          
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><button class="dropdown-item edit-task" data-id="${task._id}">Edit</button></li>
              <li><button class="dropdown-item delete-task" data-id="${task._id}">Delete</button></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  initProgressSliders();
  initTaskActions();
}

// ======================
// PROGRESS SLIDER LOGIC
// ======================
function initProgressSliders() {
  document.querySelectorAll('.progress-slider').forEach(slider => {
    slider.addEventListener('input', handleSliderInput);
    slider.addEventListener('change', handleSliderChange);
  });
}

function handleSliderInput(e) {
  const slider = e.target;
  const progressBar = slider.nextElementSibling.nextElementSibling.querySelector('.progress-bar');
  const value = slider.value;
  
  progressBar.style.width = `${value}%`;
  progressBar.className = `progress-bar ${getStatusClassByValue(value)}`;
}

async function handleSliderChange(e) {
  const slider = e.target;
  const taskId = slider.getAttribute('data-task-id');
  const status = getStatusByValue(slider.value);
  
  try {
    await updateTaskStatus(taskId, status);
    showToast('Progress updated!', 'success');
  } catch (error) {
    console.error('Update failed:', error);
    showToast('Failed to update task', 'danger');
    loadTasks(); // Revert UI
  }
}

// ======================
// CRUD OPERATIONS
// ======================


async function handleAddTask(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');

  if (!token) {
    showAuthForms();
    return;
  }

  const formData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    priority: document.getElementById('taskPriority').value,
    status: 'pending', // Ensure status is always set
    dueDate: document.getElementById('taskDueDate').value || undefined,
    dueTime: document.getElementById('taskDueTime').value || undefined,
    location: document.getElementById('taskLocation').value 
      ? { address: document.getElementById('taskLocation').value } 
      : undefined
  };

  try {

    const response = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(formData)
    });

    const responseData = await response.json(); // Always parse the response first

    if (response.status === 401) {
      localStorage.removeItem('token');
      showAuthForms();
      return;
    }

    if (!response.ok) {
       console.error('Add Task Error:', responseData);
  const errMsg = responseData.errors?.map(e => e.msg).join(', ') || responseData.error;
  throw new Error(errMsg || 'Failed to add task');
    }

    taskForm.reset();
    await loadTasks(); // Wait for tasks to reload
    showToast('Task added successfully!', 'success');
  } catch (error) {
    console.error('Add task error:', error);
    showToast(error.message || 'Failed to add task', 'danger');
  }
}


async function updateTaskStatus(taskId, status) {
  const token = localStorage.getItem('token');
  if (!token) {
    showAuthForms();
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ status })
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      showAuthForms();
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to update task status');
    }
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

// ======================
// HELPER FUNCTIONS
// ======================
function setupEventListeners() {
  if (taskForm) {
  console.log("Task form found, attaching submit listener.");
  taskForm.addEventListener('submit', handleAddTask);
} else {
  console.warn("No task form found!");
}

  if (taskForm) taskForm.addEventListener('submit', handleAddTask);
  if (statusFilter) statusFilter.addEventListener('change', filterTasks);
  if (priorityFilter) priorityFilter.addEventListener('change', filterTasks);
  if (searchInput) searchInput.addEventListener('input', filterTasks);
  document.getElementById('saveTaskChanges')?.addEventListener('click', handleUpdateTask);
}

function initTaskActions() {
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', handleEditTask);
  });

  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', handleDeleteTask);
  });
}

function getSliderValue(status) {
  return status === 'pending' ? 33 : status === 'in-progress' ? 66 : 100;
}

function getProgressWidth(status) {
  return status === 'pending' ? '33%' : status === 'in-progress' ? '66%' : '100%';
}

function getStatusClass(status) {
  return status === 'pending' ? 'bg-secondary' : 
         status === 'in-progress' ? 'bg-warning' : 'bg-success';
}

function getStatusClassByValue(value) {
  return value <= 33 ? 'bg-secondary' : 
         value <= 66 ? 'bg-warning' : 'bg-success';
}

function getStatusByValue(value) {
  return value <= 33 ? 'pending' : 
         value <= 66 ? 'in-progress' : 'completed';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast show align-items-center text-white bg-${type}`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function handleUpdateTask(e) {
  const token = localStorage.getItem('token');
  if (!token) {
    showAuthForms();
    return;
  }

  const taskId = document.getElementById('editTaskId').value;

  const updatedData = {
    title: document.getElementById('editTaskTitle').value,
    description: document.getElementById('editTaskDescription').value,
    status: document.getElementById('editTaskStatus').value,
    priority: document.getElementById('editTaskPriority').value,
    dueDate: document.getElementById('editTaskDueDate').value || undefined,
    dueTime: document.getElementById('editTaskDueTime').value || undefined,
    location: document.getElementById('editTaskLocation').value
      ? { address: document.getElementById('editTaskLocation').value }
      : undefined
  };

  try {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(updatedData)
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.errors?.map(e => e.msg).join(', ') || result.error;
      throw new Error(message);
    }

    taskModal.hide();
    showToast('Task updated!', 'success');
    await loadTasks();
  } catch (err) {
    console.error('Task update failed:', err);
    showToast(err.message || 'Failed to update task', 'danger');
  }
}


function handleEditTask(e) {
  const taskId = e.target.getAttribute('data-id');
  const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (!card) return;

  const title = card.querySelector('.card-title')?.textContent.trim() || '';
  const description = card.querySelector('.card-text')?.textContent.trim() || '';
  const sliderValue = card.querySelector('.progress-slider')?.value;
  const status = getStatusByValue(sliderValue);
  const priority = card.classList.contains('high') ? 'high' :
                   card.classList.contains('low') ? 'low' : 'medium';

  const dueBadge = card.querySelector('.badge');
  const dueDateMatch = dueBadge?.textContent?.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  const dueTimeMatch = dueBadge?.textContent?.match(/\d{2}:\d{2}/);
  const dueDate = dueDateMatch ? convertDateForInput(dueDateMatch[0]) : '';
  const dueTime = dueTimeMatch ? dueTimeMatch[0] : '';

  const locationBadge = card.querySelector('.badge.ms-2');
  const location = locationBadge?.textContent.trim() || '';

  // Fill modal
  document.getElementById('editTaskId').value = taskId;
  document.getElementById('editTaskTitle').value = title;
  document.getElementById('editTaskDescription').value = description;
  document.getElementById('editTaskStatus').value = status;
  document.getElementById('editTaskPriority').value = priority;
  document.getElementById('editTaskDueDate').value = dueDate;
  document.getElementById('editTaskDueTime').value = dueTime;
  document.getElementById('editTaskLocation').value = location;

  taskModal.show();
}


async function handleDeleteTask(e) {
  const taskId = e.target.getAttribute('data-id');
  const confirmDelete = confirm("Are you sure you want to delete this task?");
  if (!confirmDelete) return;

  const token = localStorage.getItem('token');
  if (!token) {
    showAuthForms();
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'x-auth-token': token
      }
    });

    if (!response.ok) {
      const result = await response.json();
      const message = result.error || 'Failed to delete task';
      throw new Error(message);
    }

    showToast('Task deleted!', 'success');
    await loadTasks();
  } catch (error) {
    console.error('Delete task error:', error);
    showToast(error.message || 'Failed to delete task', 'danger');
  }
}



// ======================
// FILTERING FUNCTIONALITY
// ======================
function filterTasks() {
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const searchText = searchInput.value.toLowerCase();

  document.querySelectorAll('.task-card').forEach(card => {
    const cardStatus = card.querySelector('.progress-bar').className.includes('bg-success') ? 'completed' :
                      card.querySelector('.progress-bar').className.includes('bg-warning') ? 'in-progress' : 'pending';
    const cardPriority = card.classList.contains('low') ? 'low' : 
                        card.classList.contains('medium') ? 'medium' : 'high';
    const cardTitle = card.querySelector('.card-title').textContent.toLowerCase();
    const cardDescription = card.querySelector('.card-text').textContent.toLowerCase();

    const statusMatch = status === 'all' || cardStatus.includes(status);
    const priorityMatch = priority === 'all' || cardPriority === priority;
    const searchMatch = searchText === '' || 
                       cardTitle.includes(searchText) || 
                       cardDescription.includes(searchText);

    card.style.display = (statusMatch && priorityMatch && searchMatch) ? '' : 'none';
  });
}

function convertDateForInput(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const [month, day, year] = parts.map(p => p.padStart(2, '0'));
  return `${year.length === 2 ? '20' + year : year}-${month}-${day}`;
}
