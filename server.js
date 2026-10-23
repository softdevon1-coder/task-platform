const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos en memoria para el proyecto escolar
const db = {
  users: {
    'estudiante': { id: 'estudiante', username: 'Estudiante (Humano)', points: 100, completedTasks: [] },
    'bot_tester': { id: 'bot_tester', username: 'Bot de Pruebas (QA)', points: 50, completedTasks: [] }
  },
  tasks: [
    {
      id: 'task-1',
      title: 'Visitar Artículo de Ciberseguridad',
      category: 'Web Traffic',
      url: 'https://es.wikipedia.org/wiki/Seguridad_inform%C3%A1tica',
      durationSeconds: 5,
      rewardPoints: 20,
      createdBy: 'admin'
    },
    {
      id: 'task-2',
      title: 'Revisar Documentación de Node.js',
      category: 'Documentation',
      url: 'https://nodejs.org/docs/latest/api/',
      durationSeconds: 7,
      rewardPoints: 35,
      createdBy: 'admin'
    },
    {
      id: 'task-3',
      title: 'Ver Video: Conceptos Básicos de Redes',
      category: 'Video View',
      url: 'https://www.youtube.com',
      durationSeconds: 10,
      rewardPoints: 50,
      createdBy: 'admin'
    },
    {
      id: 'task-4',
      title: 'Explorar Blog de Inteligencia Artificial',
      category: 'Blog Visit',
      url: 'https://github.blog/',
      durationSeconds: 6,
      rewardPoints: 25,
      createdBy: 'admin'
    }
  ],
  // Almacena las tareas activas para validar el tiempo de permanencia
  // token -> { taskId, userId, startedAt, durationSeconds, rewardPoints }
  activeSessions: new Map(),
  // Registro de actividad y seguridad en tiempo real
  activityLogs: []
};

// Función auxiliar para registrar logs visibles en la web
function logActivity(type, message, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    type, // 'INFO', 'SUCCESS', 'FRAUD_DETECTED', 'RATE_LIMITED'
    message,
    details
  };
  db.activityLogs.unshift(entry);
  if (db.activityLogs.length > 50) db.activityLogs.pop();
  console.log(`[${entry.timestamp}] [${type}] ${message}`);
  return entry;
}

// 1. Obtener estado del sistema (usuario actual, tareas y logs)
app.get('/api/state', (req, res) => {
  const userId = req.query.user || 'estudiante';
  const user = db.users[userId] || db.users['estudiante'];

  const availableTasks = db.tasks.map(t => ({
    ...t,
    isCompleted: user.completedTasks.includes(t.id)
  }));

  res.json({
    user,
    allUsers: Object.values(db.users),
    tasks: availableTasks,
    logs: db.activityLogs.slice(0, 15)
  });
});

// 2. Iniciar una tarea (Genera token seguro y marca la hora en el servidor)
app.post('/api/tasks/start', (req, res) => {
  const { taskId, userId = 'estudiante' } = req.body;
  const user = db.users[userId];
  const task = db.tasks.find(t => t.id === taskId);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  if (!task) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  // Generar un token único firmado para esta sesión de visualización
  const sessionToken = crypto.randomBytes(24).toString('hex');
  const now = Date.now();

  db.activeSessions.set(sessionToken, {
    taskId: task.id,
    userId: user.id,
    startedAt: now,
    durationSeconds: task.durationSeconds,
    rewardPoints: task.rewardPoints
  });

  logActivity('INFO', `${user.username} inició la tarea "${task.title}". Tiempo requerido: ${task.durationSeconds}s.`, {
    user: user.id,
    taskId: task.id
  });

  res.json({
    sessionToken,
    taskId: task.id,
    title: task.title,
    url: task.url,
    durationSeconds: task.durationSeconds,
    rewardPoints: task.rewardPoints,
    serverStartedAt: now
  });
});

// 3. Reclamar puntos (VALIDACIÓN ANTI-FRAUDE)
app.post('/api/tasks/claim', (req, res) => {
  const { sessionToken } = req.body;

  if (!sessionToken || !db.activeSessions.has(sessionToken)) {
    logActivity('FRAUD_DETECTED', `Intento de reclamo con token inválido o expirado.`);
    return res.status(400).json({
      success: false,
      error: 'Token de sesión inválido o ya utilizado.'
    });
  }

  const session = db.activeSessions.get(sessionToken);
  const now = Date.now();
  const elapsedMs = now - session.startedAt;
  const elapsedSeconds = Number((elapsedMs / 1000).toFixed(2));
  const user = db.users[session.userId];

  // Tolerancia de 0.5s por latencia de red
  const minimumRequired = session.durationSeconds - 0.5;

  // DETECCIÓN ANTI-FRAUDE: ¿El cliente envió la confirmación antes de tiempo?
  if (elapsedSeconds < minimumRequired) {
    // Eliminar la sesión tramposa
    db.activeSessions.delete(sessionToken);

    logActivity('FRAUD_DETECTED', `¡ALERTA DE BOT/FRAUDE! ${user.username} intentó reclamar en ${elapsedSeconds}s (Requerido: ${session.durationSeconds}s). Puntos denegados.`, {
      userId: user.id,
      elapsedSeconds,
      requiredSeconds: session.durationSeconds
    });

    return res.status(403).json({
      success: false,
      cheatDetected: true,
      error: `Detección anti-fraude: Reclamaste en ${elapsedSeconds}s pero se requerían ${session.durationSeconds}s. Puntos anulados.`
    });
  }

  // Si pasó la verificación de tiempo:
  db.activeSessions.delete(sessionToken);
  user.points += session.rewardPoints;
  if (!user.completedTasks.includes(session.taskId)) {
    user.completedTasks.push(session.taskId);
  }

  logActivity('SUCCESS', `¡Éxito! ${user.username} completó la tarea tras ${elapsedSeconds}s y ganó +${session.rewardPoints} puntos. Nuevo saldo: ${user.points}`, {
    userId: user.id,
    pointsAdded: session.rewardPoints,
    newBalance: user.points
  });

  res.json({
    success: true,
    message: `¡Tarea completada con éxito! Has ganado ${session.rewardPoints} puntos.`,
    pointsEarned: session.rewardPoints,
    newBalance: user.points,
    elapsedSeconds
  });
});

// 4. Crear una nueva tarea (Gastar puntos para promocionar algo)
app.post('/api/tasks/create', (req, res) => {
  const { userId = 'estudiante', title, url, durationSeconds = 5, rewardPoints = 20, category = 'Custom' } = req.body;
  const user = db.users[userId];

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const cost = Number(rewardPoints) * 3; // Crear la tarea cuesta 3 veces la recompensa
  if (user.points < cost) {
    return res.status(400).json({ error: `Puntos insuficientes. Crear esta tarea cuesta ${cost} puntos y tienes ${user.points}.` });
  }

  user.points -= cost;
  const newTask = {
    id: `task-${Date.now()}`,
    title: title || 'Nueva Tarea Promocionada',
    category,
    url: url || 'https://google.com',
    durationSeconds: Math.max(3, Number(durationSeconds)),
    rewardPoints: Math.max(5, Number(rewardPoints)),
    createdBy: user.id
  };

  db.tasks.unshift(newTask);

  logActivity('INFO', `${user.username} publicó una nueva tarea: "${newTask.title}" (Recompensa: ${newTask.rewardPoints} pts).`, {
    cost,
    taskId: newTask.id
  });

  res.json({ success: true, task: newTask, newBalance: user.points });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Plataforma Educativa de Tareas (YouLikeHits Demo)`);
  console.log(` Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`=======================================================`);
  logActivity('INFO', 'Servidor de la plataforma iniciado en http://localhost:3000');
});
