# TaskHits Demo - Plataforma de Intercambio & Pruebas QA

Este es un proyecto escolar interactivo que simula una plataforma de intercambio de tareas y recompensas (estilo *YouLikeHits*) con arquitectura cliente-servidor, validación anti-fraude en backend y un script de pruebas automatizadas (Bot QA).

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Iniciar el Servidor Web
Abre una terminal en esta carpeta y ejecuta:
```bash
node server.js
```
El servidor quedará corriendo en: **`http://localhost:3000`**

Abre esa URL en tu navegador (Chrome, Edge, Firefox, etc.) para ver la interfaz gráfica en vivo.

---

### 2. Ejecutar el Bot Automatizado de Pruebas (QA)
Abre una **segunda terminal** en esta misma carpeta y ejecuta:

#### Modo Normal (El bot respeta el tiempo real y gana puntos):
```bash
node bot.js
```
*Observa cómo en la página web el saldo sube y los logs de seguridad registran los éxitos en verde en tiempo real.*

#### Modo Tramposo (El bot intenta burlar el tiempo de espera):
```bash
node bot.js --cheat
```
*Observa cómo el backend detecta el intento de fraude, bloquea los puntos y dispara la alerta roja en el monitor de seguridad.*

---

## 🛠️ Aspectos Técnicos Explicados para la Escuela

1. **Tokens de Sesión con Criptografía:**
   - Cuando un usuario o bot inicia una tarea, el servidor genera un token criptográfico único (`crypto.randomBytes`) y almacena la marca de tiempo exacta del servidor (`timestamp`).
2. **Validación Anti-Fraude en Backend:**
   - La validación del tiempo de permanencia no ocurre en el cliente (JavaScript del navegador), sino que el servidor calcula:
     $$\Delta t = \text{timestamp\_reclamo} - \text{timestamp\_inicio}$$
   - Si $\Delta t$ es menor al tiempo requerido, la petición es rechazada con un código HTTP `403 Forbidden` y se anulan los puntos.
3. **Simulador de Ventana de Visualización:**
   - La interfaz gráfica cuenta con un visor interactivo que simula la ventana de interacción con cuenta regresiva.
4. **Economía de Créditos Circular:**
   - Los usuarios pueden gastar sus puntos ganados para publicar sus propios enlaces o tareas.
