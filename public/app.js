// Estado del cliente
let currentUser = 'estudiante';
let currentSession = null;
let countdownInterval = null;
let currentCountdown = 0;

// Elementos del DOM
const userSelect = document.getElementById('userSelect');
const userPoints = document.getElementById('userPoints');
const tasksGrid = document.getElementById('tasksGrid');
const logsContainer = document.getElementById('logsContainer');
const btnRefresh = document.getElementById('btnRefresh');

const taskViewerCard = document.getElementById('taskViewerCard');
const viewerTitle = document.getElementById('viewerTitle');
const currentTaskTitle = document.getElementById('currentTaskTitle');
const currentTaskUrl = document.getElementById('currentTaskUrl');
const currentTaskReward = document.getElementById('currentTaskReward');
const countdownNumber = document.getElementById('countdownNumber');
const btnClaimPoints = document.getElementById('btnClaimPoints');
const btnTestCheat = document.getElementById('btnTestCheat');

const createTaskForm = document.getElementById('createTaskForm');

// 1. Cargar estado del servidor
async function fetchState() {
  try {
    const res = await fetch(`/api/state?user=${currentUser}`);
    const data = await res.json();

    // Actualizar puntos
    userPoints.textContent = data.user.points;

    // Renderizar tareas
    renderTasks(data.tasks);

    // Renderizar logs
    renderLogs(data.logs);
  } catch (err) {
    console.error('Error cargando estado:', err);
  }
}

// 2. Renderizar lista de tareas
function renderTasks(tasks) {
  tasksGrid.innerHTML = '';

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.isCompleted ? 'completed' : ''}`;

    card.innerHTML = `
      <div>
        <div class="task-category">${escapeHtml(task.category)}</div>
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span>⏱ ${task.durationSeconds}s de permanencia</span>
          <span class="task-reward">+${task.rewardPoints} PTS</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm btn-full" ${task.isCompleted ? 'disabled' : ''} onclick="startTask('${task.id}')">
        ${task.isCompleted ? '✓ Tarea Completada' : '▶ Comenzar Tarea'}
      </button>
    `;

    tasksGrid.appendChild(card);
  });
}

// 3. Iniciar una tarea
async function startTask(taskId) {
  try {
    const res = await fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId: currentUser })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo iniciar la tarea');
      return;
    }

    currentSession = data;

    // Mostrar visor de tarea
    taskViewerCard.classList.remove('hidden');
    viewerTitle.textContent = `Visitando: ${data.url}`;
    currentTaskTitle.textContent = data.title;
    currentTaskUrl.textContent = data.url;
    currentTaskReward.textContent = data.rewardPoints;

    // Iniciar temporizador
    startCountdown(data.durationSeconds);

    // Desplazar suavemente hacia el visor
    taskViewerCard.scrollIntoView({ behavior: 'smooth' });

    fetchState();
  } catch (err) {
    console.error('Error iniciando tarea:', err);
  }
}

// 4. Temporizador de visualización
function startCountdown(seconds) {
  if (countdownInterval) clearInterval(countdownInterval);

  currentCountdown = seconds;
  countdownNumber.textContent = currentCountdown;
  btnClaimPoints.disabled = true;
  btnClaimPoints.textContent = `Espera ${currentCountdown}s para reclamar...`;

  countdownInterval = setInterval(() => {
    currentCountdown--;
    if (currentCountdown > 0) {
      countdownNumber.textContent = currentCountdown;
      btnClaimPoints.textContent = `Espera ${currentCountdown}s para reclamar...`;
    } else {
      clearInterval(countdownInterval);
      countdownNumber.textContent = '✓';
      btnClaimPoints.disabled = false;
      btnClaimPoints.textContent = `🎉 Reclamar +${currentSession.rewardPoints} Puntos`;
    }
  }, 1000);
}

// 5. Reclamar puntos (Vía legítima tras finalizar temporizador)
async function claimPoints() {
  if (!currentSession) return;

  try {
    const res = await fetch('/api/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: currentSession.sessionToken })
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ ${data.message}`);
      taskViewerCard.classList.add('hidden');
      currentSession = null;
      fetchState();
    } else {
      alert(`❌ Error: ${data.error}`);
      fetchState();
    }
  } catch (err) {
    console.error('Error reclamando puntos:', err);
  }
}

// 6. Prueba de reclamo tramposo (Simula un bot haciendo trampa)
async function testCheatClaim() {
  if (!currentSession) return;

  try {
    const res = await fetch('/api/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: currentSession.sessionToken })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`🛡️ EL SISTEMA ANTI-FRAUDE DETECTÓ LA TRAMPA:\n\n${data.error}`);
      if (countdownInterval) clearInterval(countdownInterval);
      taskViewerCard.classList.add('hidden');
      currentSession = null;
      fetchState();
    } else {
      alert('Puntos acreditados');
      fetchState();
    }
  } catch (err) {
    console.error('Error en prueba anti-fraude:', err);
  }
}

// 7. Renderizar logs de seguridad
function renderLogs(logs) {
  logsContainer.innerHTML = '';
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = `log-item ${log.type}`;
    div.innerHTML = `<strong>[${log.timestamp}]</strong> ${escapeHtml(log.message)}`;
    logsContainer.appendChild(div);
  });
}

// 8. Crear nueva tarea
createTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('newTaskTitle').value;
  const url = document.getElementById('newTaskUrl').value;
  const durationSeconds = document.getElementById('newTaskDuration').value;
  const rewardPoints = document.getElementById('newTaskReward').value;

  try {
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser,
        title,
        url,
        durationSeconds,
        rewardPoints
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('✅ ¡Tarea publicada con éxito!');
      createTaskForm.reset();
      fetchState();
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch (err) {
    console.error('Error creando tarea:', err);
  }
});

// Cambiar de usuario activo
userSelect.addEventListener('change', (e) => {
  currentUser = e.target.value;
  if (currentSession) {
    if (countdownInterval) clearInterval(countdownInterval);
    taskViewerCard.classList.add('hidden');
    currentSession = null;
  }
  fetchState();
});

btnRefresh.addEventListener('click', fetchState);
btnClaimPoints.addEventListener('click', claimPoints);
btnTestCheat.addEventListener('click', testCheatClaim);

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Inicialización y actualización en vivo cada 3 segundos
fetchState();
setInterval(fetchState, 3000);
