/**
 * BOT DE PRUEBAS AUTOMATIZADAS (QA / E2E)
 * -------------------------------------------------------------
 * Este script simula un cliente automatizado que interactúa con
 * la plataforma local para probar la lógica de recompensas y
 * los mecanismos de detección anti-fraude del backend.
 * 
 * Uso:
 *   node bot.js         -> Modo normal (espera el tiempo real y gana puntos)
 *   node bot.js --cheat -> Modo tramposo (reclama sin esperar, activa el anti-bot)
 */

const SERVER_URL = 'http://localhost:3000';
const USER_ID = 'bot_tester';
const isCheatMode = process.argv.includes('--cheat');

// Función auxiliar para pausar la ejecución
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBot() {
  console.log('\n=============================================================');
  console.log('       INICIANDO BOT DE PRUEBAS AUTOMATIZADAS (QA)');
  console.log('=============================================================');
  console.log(`📡 Conectando a: ${SERVER_URL}`);
  console.log(`👤 Usuario de pruebas: ${USER_ID}`);
  console.log(`⚙️ Modo de ejecución: ${isCheatMode ? '🚨 TRAMPOSO (--cheat activo)' : '✅ NORMAL (espera requerida)'}`);
  console.log('=============================================================\n');

  try {
    // 1. Obtener estado inicial del usuario y las tareas disponibles
    const stateRes = await fetch(`${SERVER_URL}/api/state?user=${USER_ID}`);
    if (!stateRes.ok) {
      throw new Error(`No se pudo conectar al servidor. ¿Está corriendo "node server.js"?`);
    }

    const state = await stateRes.json();
    console.log(`[BOT] Saldo inicial del bot: ${state.user.points} PTS`);
    
    // Filtrar tareas que aún no estén completadas
    const pendingTasks = state.tasks.filter(t => !t.isCompleted);
    console.log(`[BOT] Tareas pendientes encontradas: ${pendingTasks.length}\n`);

    if (pendingTasks.length === 0) {
      console.log('🎉 ¡Todas las tareas ya fueron completadas para este usuario!');
      return;
    }

    let completedCount = 0;
    let fraudCount = 0;

    // 2. Procesar cada tarea pendiente
    for (const task of pendingTasks) {
      console.log(`-------------------------------------------------------------`);
      console.log(`▶ Iniciando tarea: "${task.title}"`);
      console.log(`  Categoría: ${task.category} | Recompensa: +${task.rewardPoints} PTS`);
      console.log(`  Tiempo mínimo requerido por el servidor: ${task.durationSeconds}s`);

      // 2.1 Iniciar la tarea en el servidor y obtener el token de sesión
      const startRes = await fetch(`${SERVER_URL}/api/tasks/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, userId: USER_ID })
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        console.error(`  ❌ Error al iniciar tarea: ${startData.error}`);
        continue;
      }

      const { sessionToken, durationSeconds } = startData;
      console.log(`  🔑 Token de sesión obtenido: ${sessionToken.slice(0, 12)}...`);

      // 2.2 Simular el comportamiento según el modo
      if (isCheatMode) {
        console.log(`  ⚡ [MODO CHEAT] Intentando reclamar inmediatamente sin esperar...`);
        await sleep(300); // Espera mínima casi nula (0.3s)
      } else {
        process.stdout.write(`  ⏳ Esperando ${durationSeconds} segundos requeridos: `);
        for (let i = durationSeconds; i > 0; i--) {
          process.stdout.write(`${i}s `);
          await sleep(1000);
        }
        console.log('✓');
      }

      // 2.3 Enviar reclamo de puntos al backend
      const claimRes = await fetch(`${SERVER_URL}/api/tasks/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });

      const claimData = await claimRes.json();

      if (claimRes.ok) {
        console.log(`  🎉 ¡ÉXITO! Puntos acreditados: +${claimData.pointsEarned} PTS`);
        console.log(`  💰 Nuevo saldo del bot: ${claimData.newBalance} PTS`);
        completedCount++;
      } else {
        if (claimData.cheatDetected) {
          console.log(`  🛡️ [PROTECCIÓN ANTI-FRAUDE ACTIVADA]:`);
          console.log(`     ${claimData.error}`);
          fraudCount++;
        } else {
          console.log(`  ❌ Fallo en el reclamo: ${claimData.error}`);
        }
      }

      // Pequeña pausa entre tareas
      await sleep(1000);
    }

    // 3. Resumen final
    console.log('\n=============================================================');
    console.log('                   RESUMEN DE PRUEBAS QA                     ');
    console.log('=============================================================');
    console.log(`✅ Tareas completadas con éxito: ${completedCount}`);
    console.log(`🛡️ Intentos bloqueados por anti-fraude: ${fraudCount}`);
    
    const finalStateRes = await fetch(`${SERVER_URL}/api/state?user=${USER_ID}`);
    const finalState = await finalStateRes.json();
    console.log(`💰 Saldo final de ${USER_ID}: ${finalState.user.points} PTS`);
    console.log('=============================================================\n');

  } catch (err) {
    console.error('\n❌ ERROR FATAL:', err.message);
  }
}

runBot();
