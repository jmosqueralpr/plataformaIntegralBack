const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
require('dotenv').config(); // Cargar el archivo .env

const User = require('../../models/user.model');
const Expiration = require('../../models/expiration.model');
const Solution = require('../../models/solution.model');
const Task = require('../../models/task.model');
const TelegramSession = require('../../models/telegramSession.model');

const { getStatus } = require('../../utils/tcpMonitor');

/* HANDLERS */

/* Token Handler */

const ENV = process.env.NODE_ENV || 'development';

const token = /* Token para produccion y token para desarrollo, para que no haya conflicto entre los dos */
  ENV === 'production'
    ? process.env.BOT_TOKEN_PROD
    : process.env.BOT_TOKEN_DEV;

if (!token) {
  throw new Error(`Missing Telegram bot token for ${ENV} environment.`);
}

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error.message);
});

/* JOBS */
const initializeExpirationReminder = require('./jobs/expirationsReminder.jobs');
initializeExpirationReminder(bot);

/* SESIONES MANUALES */
const pendingExpirations = new Map();
const pendingTaskDrafts = new Map();
const pendingLinkCodes = new Map();
const userSessions = new Map();
const chatStateQueues = new Map();

function withPersistentChatState(chatId, handler) {
  const key = String(chatId);
  const previous = chatStateQueues.get(key) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => processPersistentChatState(chatId, handler));
  chatStateQueues.set(key, current);
  return current.finally(() => {
    if (chatStateQueues.get(key) === current) chatStateQueues.delete(key);
  });
}

async function processPersistentChatState(chatId, handler) {
  const key = String(chatId);
  try {
    const savedState = await TelegramSession.findOne({
      chatId: key,
      expiresAt: { $gt: new Date() }
    }).lean();

    pendingExpirations.delete(chatId);
    pendingTaskDrafts.delete(chatId);
    pendingLinkCodes.delete(chatId);
    userSessions.delete(chatId);
    if (savedState?.pendingExpirations) pendingExpirations.set(chatId, savedState.pendingExpirations);
    if (savedState?.pendingTaskDrafts) pendingTaskDrafts.set(chatId, savedState.pendingTaskDrafts);
    if (savedState?.pendingLinkCode) pendingLinkCodes.set(chatId, true);
    if (savedState?.userSession) userSessions.set(chatId, savedState.userSession);

    const result = await handler();
    const state = {
      pendingExpirations: pendingExpirations.get(chatId) || null,
      pendingTaskDrafts: pendingTaskDrafts.get(chatId) || null,
      pendingLinkCode: pendingLinkCodes.get(chatId) === true,
      userSession: userSessions.get(chatId) || null
    };
    const hasPendingState = Boolean(
      state.pendingExpirations ||
      state.pendingTaskDrafts ||
      state.pendingLinkCode ||
      (state.userSession && Object.keys(state.userSession).length)
    );

    if (!hasPendingState) {
      await TelegramSession.deleteOne({ chatId: key });
    } else {
      await TelegramSession.findOneAndUpdate(
        { chatId: key },
        {
          $set: {
            ...state,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return result;
  } catch (error) {
    console.error('Error en el flujo de Telegram:', error);
    try {
      await bot.sendMessage(chatId, '⚠️ No se pudo completar esa acción. Intentá nuevamente.');
    } catch (sendError) {
      console.error('No se pudo informar el error al chat de Telegram:', sendError.message);
    }
  }
}

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function isTodayOrFuture(value) {
  const date = parseLocalDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function isValidTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveAssignedUsers(value, currentUsername) {
  if (value.trim() === '-') return [currentUsername];

  const usernames = [...new Set(value.split(',').map((username) => username.trim()).filter(Boolean))];
  if (!usernames.length) return null;

  const users = await User.find({ username: { $in: usernames } }).select('username').lean();
  if (users.length !== usernames.length) return null;
  return usernames;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* MENÚ PRINCIPAL */
function mostrarMenu(chatId, customText = '¡Hola! ¿Qué te gustaría hacer?') {
  return bot.sendMessage(chatId, customText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔗 Vincular cuenta con código', callback_data: 'registrar_chatid' }],
        [{ text: '📋 Ver enlace a la plataforma web', callback_data: 'enlace_web' }],
        [{ text: '📋 Ver mis tareas', callback_data: 'ver_tareas' }],
        [{ text: '📊 Resumen rápido', callback_data: 'resumen_tareas' }],
        [{ text: '📋 Crear nueva tarea', callback_data: 'crear_tarea' }],
        [{ text: '📋 Ver vencimientos', callback_data: 'ver_vencimientos' }],
        [{ text: '📋 Agendar nuevo vencimiento', callback_data: 'crear_vencimiento' }],
        [{ text: '📋 Buscar solución técnica', callback_data: 'buscar_solución' }],
        [{ text: '📋 Verificar estaciónes AIS', callback_data: 'verificar_rs232' }],
        [{ text: 'ℹ️ Mi perfil', callback_data: 'ver_perfil' }]
      ]
    }
  });
}

function clearPendingFlows(chatId) {
  pendingExpirations.delete(chatId);
  pendingTaskDrafts.delete(chatId);
  pendingLinkCodes.delete(chatId);
  userSessions.delete(chatId);
}

async function sendTaskSummary(chatId, username) {
  const taskFilter = { $or: [{ assignedTo: username }, { creator: username }] };
  const [total, pending, inProgress, finished, tasks] = await Promise.all([
    Task.countDocuments(taskFilter),
    Task.countDocuments({ ...taskFilter, status: 'No iniciada' }),
    Task.countDocuments({ ...taskFilter, status: 'En proceso' }),
    Task.countDocuments({ ...taskFilter, status: 'Finalizada' }),
    Task.find(taskFilter).sort({ updatedAt: -1 }).limit(5)
  ]);

  const summaryText = [
    '📊 <b>Resumen rápido de tareas</b>',
    '',
    `Total: ${total}`,
    `No iniciada: ${pending}`,
    `En proceso: ${inProgress}`,
    `Finalizada: ${finished}`,
    '',
    total ? 'Últimas tareas:' : 'No hay tareas registradas.'
  ].join('\n');

  if (!total) {
    return bot.sendMessage(chatId, summaryText, { parse_mode: 'HTML' });
  }

  const taskLines = tasks
    .map(task => `• ${escapeHtml(task.title)} (${escapeHtml(task.status)})`)
    .join('\n');
  return bot.sendMessage(chatId, `${summaryText}\n\n${taskLines}`, { parse_mode: 'HTML' });
}

async function sendDailyDigest(chatId, username) {
  const tasks = await Task.find({
    $or: [{ assignedTo: username }, { creator: username }]
  }).sort({ updatedAt: -1 });

  if (!tasks.length) {
    return bot.sendMessage(chatId, '📭 No tenés tareas registradas para el resumen diario.');
  }

  const openTasks = tasks.filter(task => task.status !== 'Finalizada');
  if (!openTasks.length) {
    return bot.sendMessage(chatId, '✅ No tenés tareas pendientes. Todo está cerrado para hoy.');
  }

  const priorityOrder = { Urgente: 0, Alta: 1, Media: 2, Baja: 3 };
  const sorted = [...openTasks].sort((a, b) => {
    const byPriority = (priorityOrder[a.importance] ?? 99) - (priorityOrder[b.importance] ?? 99);
    if (byPriority !== 0) return byPriority;
    if (!a.notifyAssignedDate || !b.notifyAssignedDate) return 0;
    return new Date(a.notifyAssignedDate) - new Date(b.notifyAssignedDate);
  });

  const top = sorted.slice(0, 5);
  const lines = top.map(task => {
    const dueText = task.notifyAssignedDate ? ` • vence ${escapeHtml(task.notifyAssignedDate)}` : '';
    return `• ${escapeHtml(task.title)} [${escapeHtml(task.status)}] [${escapeHtml(task.importance)}]${dueText}`;
  }).join('\n');

  const message = [
    '📅 <b>Resumen diario</b>',
    '',
    `Tareas abiertas: ${openTasks.length}`,
    '',
    lines
  ].join('\n');

  return bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  return withPersistentChatState(chatId, async () => {
    const user = await User.findOne({ telegramChatId: String(chatId) });
    if (user) {
      return mostrarMenu(chatId, `👋 Hola ${user.username}. ¿Qué querés hacer hoy?`);
    }

    await bot.sendMessage(chatId, '👋 ¡Bienvenido! Vinculá tu cuenta desde la plataforma para usar el bot.');
    return bot.sendMessage(chatId, 'En la plataforma generá un código y luego enviá /vincular para asociar tu cuenta.', {
      reply_markup: {
        inline_keyboard: [[{ text: '🔗 Cómo vincular mi cuenta', callback_data: 'registrar_chatid' }]]
      }
    });
  });
});

bot.onText(/\/vincular/, async (msg) => {
  const chatId = msg.chat.id;
  if (msg.chat.type !== 'private') {
    return bot.sendMessage(chatId, 'Por seguridad, vinculá tu cuenta en un chat privado con el bot.');
  }
  return withPersistentChatState(chatId, async () => {
    pendingLinkCodes.set(chatId, true);
    return bot.sendMessage(chatId, 'Pegá el código de un solo uso generado desde tu perfil en la plataforma. Vence en 10 minutos.');
  });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpText = [
    '📘 Ayuda del bot DYB',
    '',
    '/start - volver al menú principal',
    '/help - ver esta ayuda',
    '/cancel - cancelar la acción actual',
    '/perfil - ver tu perfil',
    '/vincular - asociar tu cuenta con un código de la plataforma',
    '',
    'También podés usar los botones del menú para:',
    '• ver tareas',
    '• crear tareas',
    '• ver vencimientos',
    '• buscar soluciones',
    '• verificar AIS'
  ].join('\n');

  return bot.sendMessage(chatId, helpText);
});

bot.onText(/\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  return withPersistentChatState(chatId, async () => {
    clearPendingFlows(chatId);
    return mostrarMenu(chatId, '🔄 Se canceló la acción actual. ¿Qué te gustaría hacer?');
  });
});

bot.onText(/\/perfil|\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramChatId: String(chatId) });

    if (!user) {
      return bot.sendMessage(chatId, '❌ Todavía no estás registrado en el bot. Usá /start para vincularte.');
    }

    return bot.sendMessage(chatId,
      `👤 <b>Perfil</b>\n\nUsuario: ${escapeHtml(user.username)}\nRol: ${escapeHtml(user.role || 'user')}\nEmail: ${escapeHtml(user.email || 'No informado')}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Error al consultar perfil de Telegram:', error);
    return bot.sendMessage(chatId, '❌ No se pudo obtener tu perfil.');
  }
});

bot.onText(/\/mis_tareas|\/my_tasks/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramChatId: String(chatId) });

    if (!user) {
      return bot.sendMessage(chatId, '❌ Todavía no estás registrado.');
    }

    const tareas = await Task.find({
      $or: [{ assignedTo: user.username }, { creator: user.username }]
    }).sort({ createdAt: -1 }).limit(10);

    if (!tareas.length) {
      return bot.sendMessage(chatId, '📭 No tenés tareas para mostrar.');
    }

    const summary = tareas.map(task => `• ${escapeHtml(task.title)} (${escapeHtml(task.status)}) - ${escapeHtml(task.importance)}`).join('\n');
    return bot.sendMessage(chatId, `📝 <b>Tus tareas recientes</b>\n\n${summary}`, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error al consultar tareas de Telegram:', error);
    return bot.sendMessage(chatId, '❌ No se pudieron obtener tus tareas.');
  }
});

bot.onText(/\/resumen|\/summary|\/resumen_hoy|\/daily_digest/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramChatId: String(chatId) });

    if (!user) {
      return bot.sendMessage(chatId, '❌ Todavía no estás registrado.');
    }

    return await sendDailyDigest(chatId, user.username);
  } catch (error) {
    console.error('Error al generar resumen de Telegram:', error);
    return bot.sendMessage(chatId, '❌ No se pudo generar el resumen.');
  }
});

/* MENSAJES DE TEXTO GENERALES */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;
  if (text.startsWith('/')) return;

  return withPersistentChatState(chatId, async () => {
    const telegramId = msg.from?.id ? String(msg.from.id) : undefined;
    console.log('Ingreso a message');

    if (text.toLowerCase() === 'menu' || text.toLowerCase() === 'mostrar menu') {
      return mostrarMenu(chatId, '📋 Menú principal');
    }

    const session = userSessions.get(chatId) || {};

    if (pendingLinkCodes.has(chatId)) {
      if (msg.chat.type !== 'private') {
        return bot.sendMessage(chatId, 'Por seguridad, enviá el código en un chat privado con el bot.');
      }

      const codeHash = crypto.createHash('sha256').update(text.replace(/\s+/g, '').toUpperCase()).digest('hex');
      const user = await User.findOne({
        telegramLinkTokenHash: codeHash,
        telegramLinkTokenExpiresAt: { $gt: new Date() }
      }).select('+telegramLinkTokenHash +telegramLinkTokenExpiresAt');

      if (!user) {
        return bot.sendMessage(chatId, '❌ El código no es válido o venció. Generá uno nuevo desde la plataforma.');
      }

      const chatAlreadyLinked = await User.findOne({
        telegramChatId: String(chatId),
        _id: { $ne: user._id }
      });
      if (chatAlreadyLinked) {
        pendingLinkCodes.delete(chatId);
        return bot.sendMessage(chatId, '❌ Este chat ya está vinculado a otra cuenta. Contactá al administrador.');
      }
      if (telegramId) {
        const telegramAccountLinked = await User.findOne({
          telegramId,
          _id: { $ne: user._id }
        });
        if (telegramAccountLinked) {
          pendingLinkCodes.delete(chatId);
          return bot.sendMessage(chatId, '❌ Esta cuenta de Telegram ya está vinculada a otro usuario.');
        }
      }

      user.telegramChatId = String(chatId);
      if (telegramId) user.telegramId = telegramId;
      user.telegramLinkTokenHash = null;
      user.telegramLinkTokenExpiresAt = null;
      await user.save();

      pendingLinkCodes.delete(chatId);
      return bot.sendMessage(chatId, `✅ Cuenta vinculada correctamente. ¡Hola, ${escapeHtml(user.username)}!`);
    }

    if (pendingTaskDrafts.has(chatId)) {
      const draft = pendingTaskDrafts.get(chatId);
      const user = await User.findOne({ telegramChatId: String(chatId) });

      if (!user) {
        pendingTaskDrafts.delete(chatId);
        return bot.sendMessage(chatId, '❌ No estás registrado. Vinculá tu cuenta primero.');
      }

      if (draft.step === 'title') {
        draft.title = text;
        draft.step = 'description';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '📝 Ingresá la descripción de la tarea:');
      }

      if (draft.step === 'description') {
        draft.description = text;
        draft.step = 'priority';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '🔥 Elegí prioridad: Baja, Media, Alta o Urgente.');
      }

      if (draft.step === 'priority') {
        const priorities = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
        const importance = priorities[text.toLowerCase()];
        if (!importance) return bot.sendMessage(chatId, '❌ Prioridad inválida. Elegí Baja, Media, Alta o Urgente.');
        draft.importance = importance;
        draft.step = 'date';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '📅 Ingresá la fecha de vencimiento (AAAA-MM-DD):');
      }

      if (draft.step === 'date') {
        if (!isTodayOrFuture(text)) {
          return bot.sendMessage(chatId, '❌ Fecha inválida o anterior a hoy. Usá AAAA-MM-DD.');
        }
        draft.notifyAssignedDate = text;
        draft.step = 'time';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '⏰ Ingresá la hora (HH:mm), o enviá - para usar 10:00.');
      }

      if (draft.step === 'time') {
        if (text !== '-' && !isValidTime(text)) {
          return bot.sendMessage(chatId, '❌ Hora inválida. Usá HH:mm (por ejemplo 09:30) o - para 10:00.');
        }
        draft.notifyAssignedTime = text === '-' ? '10:00' : text;
        draft.step = 'assignees';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '👥 Ingresá usuarios asignados separados por coma, o - para asignártela a vos.');
      }

      if (draft.step === 'assignees') {
        const assignedTo = await resolveAssignedUsers(text, user.username);
        if (!assignedTo) {
          return bot.sendMessage(chatId, '❌ No encontré todos esos usuarios. Ingresá sus nombres exactos separados por coma, o - para asignártela a vos.');
        }
        draft.assignedTo = assignedTo;
        draft.step = 'whatsapp';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(chatId, '📲 Avisos por WhatsApp: 0 ninguno, 1 creador, 2 asignados, 3 ambos.');
      }

      if (draft.step === 'whatsapp') {
        const whatsappOptions = {
          '0': [false, false],
          '1': [true, false],
          '2': [false, true],
          '3': [true, true]
        };
        const selectedOption = whatsappOptions[text];
        if (!selectedOption) {
          return bot.sendMessage(chatId, '❌ Elegí 0, 1, 2 o 3 para configurar los avisos.');
        }
        [draft.sendWhatsAppOwner, draft.sendWhatsAppAssignedTo] = selectedOption;
        draft.step = 'confirm';
        pendingTaskDrafts.set(chatId, draft);
        return bot.sendMessage(
          chatId,
          `Confirmá la tarea:\n<b>${escapeHtml(draft.title)}</b>\nPrioridad: ${draft.importance}\nFecha: ${draft.notifyAssignedDate} ${draft.notifyAssignedTime}\nAsignados: ${escapeHtml(draft.assignedTo.join(', '))}\nAviso WhatsApp al creador: ${draft.sendWhatsAppOwner ? 'sí' : 'no'}\nAviso WhatsApp a asignados: ${draft.sendWhatsAppAssignedTo ? 'sí' : 'no'}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Crear tarea', callback_data: 'confirm_task_create' },
                { text: 'Cancelar', callback_data: 'cancel_task_create' }
              ]]
            }
          }
        );
      }
    }

    if (pendingExpirations.has(chatId)) {
      const draft = pendingExpirations.get(chatId);
      const user = await User.findOne({ telegramChatId: String(chatId) });

      if (!user) {
        pendingExpirations.delete(chatId);
        return bot.sendMessage(chatId, '❌ No estás registrado. Vinculá tu cuenta primero.');
      }

      if (draft.step === 'title') {
        draft.title = text;
        draft.step = 'description';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(chatId, '📝 Ingresá una descripción, o enviá - para omitirla.');
      }

      if (draft.step === 'description') {
        draft.description = text === '-' ? '' : text;
        draft.step = 'date';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(chatId, '📅 Ingresá la fecha de vencimiento (AAAA-MM-DD):');
      }

      if (draft.step === 'date') {
        if (!isTodayOrFuture(text)) {
          return bot.sendMessage(chatId, '❌ Fecha inválida o anterior a hoy. Usá AAAA-MM-DD.');
        }
        draft.expirationDate = text;
        draft.step = 'time';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(chatId, '⏰ Ingresá la hora (HH:mm), o enviá - para usar 10:00.');
      }

      if (draft.step === 'time') {
        if (text !== '-' && !isValidTime(text)) {
          return bot.sendMessage(chatId, '❌ Hora inválida. Usá HH:mm o - para 10:00.');
        }
        draft.expirationTime = text === '-' ? '10:00' : text;
        draft.step = 'reminders';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(chatId, '🔔 ¿Cuándo querés recordatorios? Escribí 7, 30, 90 o una combinación separada por coma; - para ninguno.');
      }

      if (draft.step === 'reminders') {
        const selectedDays = text === '-'
          ? []
          : [...new Set(text.split(',').map((day) => day.trim()))];
        if (selectedDays.some((day) => !['7', '30', '90'].includes(day))) {
          return bot.sendMessage(chatId, '❌ Usá solo 7, 30 o 90, separados por coma; - para ninguno.');
        }
        draft.notify7DaysBefore = selectedDays.includes('7');
        draft.notify30DaysBefore = selectedDays.includes('30');
        draft.notify90DaysBefore = selectedDays.includes('90');
        draft.step = 'assignees';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(chatId, '👥 Ingresá usuarios asignados separados por coma, o - para asignártelo a vos.');
      }

      if (draft.step === 'assignees') {
        const assignedTo = await resolveAssignedUsers(text, user.username);
        if (!assignedTo) {
          return bot.sendMessage(chatId, '❌ No encontré todos esos usuarios. Ingresá sus nombres exactos separados por coma, o - para asignártelo a vos.');
        }
        draft.assignedTo = assignedTo;
        draft.step = 'confirm';
        pendingExpirations.set(chatId, draft);
        return bot.sendMessage(
          chatId,
          `Confirmá el vencimiento:\n<b>${escapeHtml(draft.title)}</b>\nFecha: ${draft.expirationDate} ${draft.expirationTime}\nAsignados: ${escapeHtml(assignedTo.join(', '))}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Crear vencimiento', callback_data: 'confirm_expiration_create' },
                { text: 'Cancelar', callback_data: 'cancel_expiration_create' }
              ]]
            }
          }
        );
      }
    }



  /* BÚSQUEDA DE SOLUCIONES TÉCNICAS */
      if (session.awaitingSearchQuery) {
        const words = text
          .split(' ')
          .map(word => word.trim())
          .filter(word => word.length > 0);

        if (words.length === 0) {
          session.awaitingSearchQuery = false;
          userSessions.set(chatId, session);
          return await bot.sendMessage(chatId, '❌ Por favor, ingresá al menos una palabra válida para buscar. (La busqueda se realizará en cualquiera de los siguientes campos de la solución técnica: Titulo, Contenido, Notas y referencia');
        }

        // Lista de campos donde buscar (igual que en la web)
        const searchFields = ['title', 'content', 'document_ref', 'notes'];

        // Creamos criterios de búsqueda que exigen que todas las palabras estén en al menos uno de los campos
        const searchCriteria = words.map(word => ({
          $or: searchFields.map(field => ({
            [field]: { $regex: escapeRegex(word), $options: 'i' }
          }))
        }));

        try {
          const results = await Solution.find({ $and: searchCriteria }).limit(10);

          if (results.length === 0) {
            session.awaitingSearchQuery = false;
            userSessions.set(chatId, session);
            return await bot.sendMessage(chatId, '❌ No se encontraron soluciones técnicas con esos términos.');
          }

          session.searchResults = results.map((solution) => String(solution._id));
          session.awaitingSearchQuery = false;
          session.awaitingSelection = true;
          userSessions.set(chatId, session);

          const buttons = results.map((s, i) => [{
            text: s.title.slice(0, 64),
            callback_data: `select_solution_${i}`
          }]);

          await bot.sendMessage(chatId, '📄 Seleccioná una solución técnica:', {
            reply_markup: { inline_keyboard: buttons }
          });

        } catch (error) {
          console.error('Error en búsqueda de Telegram:', error);
          session.awaitingSearchQuery = false;
          userSessions.set(chatId, session);
          return await bot.sendMessage(chatId, '⚠️ Ocurrió un error al buscar. Intentá de nuevo.');
        }

        return;
      }


  

  /* MENÚ POR DEFECTO */
    return bot.sendMessage(chatId, '📋 ¿Querés ver las opciones disponibles?', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Mostrar menú', callback_data: 'mostrar_menu' }]]
      }
    });
  });
});


/* CALLBACKS */
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat?.id;
  if (!chatId) return;

  try {
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('No se pudo responder el botón de Telegram:', error.message);
  }

  return withPersistentChatState(chatId, async () => {
    const data = query.data || '';
    const session = userSessions.get(chatId) || {};

    if (data === 'registrar_chatid') {
      return bot.sendMessage(chatId, 'Generá un código de un solo uso desde la plataforma y enviá /vincular para asociar tu cuenta.');
    }

    const user = await User.findOne({ telegramChatId: String(chatId) });
    if (!user) {
      return bot.sendMessage(chatId, '❌ No estás registrado. Generá un código desde la plataforma y enviá /vincular para asociar tu cuenta.');
    }

  if (data === 'mostrar_menu') return mostrarMenu(chatId);

  if (data === 'enlace_web') {
    return bot.sendMessage(chatId, '✏️ El enlace a la web (Para navegador web en tu PC): http://190.210.40.127:55000');
  }

  if (data.startsWith('ver_tarea_')) {
    const index = parseInt(data.split('_').pop());
    const taskId = session?.tareas?.[index];
    const tarea = taskId
      ? await Task.findOne({
          _id: taskId,
          $or: [{ assignedTo: user.username }, { creator: user.username }]
        })
      : null;
  
    if (!tarea) return bot.sendMessage(chatId, '❌ No se pudo encontrar esa tarea.');

    const statusButtons = [
      [{ text: 'No iniciada', callback_data: `tarea_estado_${tarea._id}_No_iniciada` }],
      [{ text: 'En proceso', callback_data: `tarea_estado_${tarea._id}_En_proceso` }],
      [{ text: 'Finalizada', callback_data: `tarea_estado_${tarea._id}_Finalizada` }]
    ];

    const priorityButtons = [
      [{ text: 'Urgente', callback_data: `tarea_prioridad_${tarea._id}_Urgente` }],
      [{ text: 'Alta', callback_data: `tarea_prioridad_${tarea._id}_Alta` }],
      [{ text: 'Media', callback_data: `tarea_prioridad_${tarea._id}_Media` }],
      [{ text: 'Baja', callback_data: `tarea_prioridad_${tarea._id}_Baja` }]
    ];
    
    return bot.sendMessage(chatId,
      `📌 <b>${escapeHtml(tarea.title)}</b>\n📝 ${escapeHtml(tarea.description || 'Sin descripción')}\n🔥 <b>Importancia:</b> ${escapeHtml(tarea.importance)}\n📊 <b>Estado:</b> ${escapeHtml(tarea.status)}`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [...statusButtons, ...priorityButtons] }
      }
    );
  }

  if (data === 'filtrar_tareas') {
    const tareas = await Task.find({
      $or: [{ assignedTo: user.username }, { creator: user.username }]
    }).sort({ updatedAt: -1 });

    if (!tareas.length) return bot.sendMessage(chatId, '❌ No hay tareas para mostrar.');
  
    const mensajes = tareas.map(t =>
      `📌 <b>${escapeHtml(t.title)}</b>\n📝 ${escapeHtml(t.description || 'Sin descripción')}\n🔥 <b>Importancia:</b> ${escapeHtml(t.importance)}`
    );
  
    return bot.sendMessage(chatId, `🗂️ <b>Todas tus tareas ordenadas por importancia:</b>\n\n${mensajes.join('\n\n')}`, {
      parse_mode: 'HTML'
    });
  }
  

  if (data === 'crear_vencimiento') {
    pendingExpirations.set(chatId, { step: 'title' });
    return bot.sendMessage(chatId, '📝 Escribí el *título* del vencimiento:', { parse_mode: 'Markdown' });
  }

  if (data === 'ver_vencimientos') {
    try {
      const user = await User.findOne({ telegramChatId: String(chatId) });
      if (!user) return bot.sendMessage(chatId, '❌ No estás registrado.');

      const expirations = await Expiration.find({ assignedTo: user.username }).sort({ expirationDate: 1 });
      if (!expirations.length) return bot.sendMessage(chatId, '📭 No tenés vencimientos asignados.');

      for (const exp of expirations) {
        const mensaje = `📌 <b>${escapeHtml(exp.title)}</b>\n📝 ${escapeHtml(exp.description || 'Sin descripción')}\n📅 <b>Fecha:</b> ${escapeHtml(exp.expirationDate || 'Sin fecha')}\n⏰ <b>Hora:</b> ${escapeHtml(exp.expirationTime || '10:00')}`;
        await bot.sendMessage(chatId, mensaje, { parse_mode: 'HTML' });
      }
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, '❌ Error al obtener los vencimientos.');
    }
  }

  if (data.startsWith('select_solution_') && session.awaitingSelection) {
    const index = parseInt(data.split('_').pop());
    const solutionId = session.searchResults?.[index];
    const solution = solutionId ? await Solution.findById(solutionId) : null;

    if (solution) {
      await bot.sendMessage(chatId, `<b>${escapeHtml(solution.title)}</b>\n\n${escapeHtml(solution.content)}\n\nReferencia: ${escapeHtml(solution.document_ref)}`, { parse_mode: 'HTML' });
    } else {
      await bot.sendMessage(chatId, '❌ No se pudo recuperar la solución.');
    }

    session.awaitingSelection = false;
    session.searchResults = null;
    userSessions.set(chatId, session);
    return;
  }

  if (data === 'crear_tarea') {
    pendingTaskDrafts.set(chatId, { step: 'title' });
    return bot.sendMessage(chatId, '📝 Escribí el *título* de la tarea:', { parse_mode: 'Markdown' });
  }

  if (data === 'confirm_task_create') {
    const draft = pendingTaskDrafts.get(chatId);
    if (!draft || draft.step !== 'confirm') {
      return bot.sendMessage(chatId, '❌ La creación de la tarea venció. Iniciá el proceso nuevamente.');
    }

    const task = new Task({
      title: draft.title,
      description: draft.description,
      notifyAssignedDate: draft.notifyAssignedDate,
      notifyAssignedTime: draft.notifyAssignedTime,
      assignedTo: draft.assignedTo,
      creator: user.username,
      status: 'No iniciada',
      importance: draft.importance,
      sendWhatsAppOwner: draft.sendWhatsAppOwner,
      sendWhatsAppAssignedTo: draft.sendWhatsAppAssignedTo
    });
    await task.save();
    pendingTaskDrafts.delete(chatId);
    return bot.sendMessage(chatId, `✅ Tarea creada: <b>${escapeHtml(task.title)}</b>`, { parse_mode: 'HTML' });
  }

  if (data === 'cancel_task_create') {
    pendingTaskDrafts.delete(chatId);
    return bot.sendMessage(chatId, 'Creación de tarea cancelada.');
  }

  if (data === 'confirm_expiration_create') {
    const draft = pendingExpirations.get(chatId);
    if (!draft || draft.step !== 'confirm') {
      return bot.sendMessage(chatId, '❌ La creación del vencimiento venció. Iniciá el proceso nuevamente.');
    }

    const expiration = new Expiration({
      title: draft.title,
      description: draft.description,
      expirationDate: draft.expirationDate,
      expirationTime: draft.expirationTime || '10:00',
      notify7DaysBefore: draft.notify7DaysBefore,
      notify30DaysBefore: draft.notify30DaysBefore,
      notify90DaysBefore: draft.notify90DaysBefore,
      assignedTo: draft.assignedTo
    });
    await expiration.save();
    pendingExpirations.delete(chatId);
    return bot.sendMessage(chatId, `✅ Vencimiento creado: <b>${escapeHtml(expiration.title)}</b>`, { parse_mode: 'HTML' });
  }

  if (data === 'cancel_expiration_create') {
    pendingExpirations.delete(chatId);
    return bot.sendMessage(chatId, 'Creación de vencimiento cancelada.');
  }

  if (data === 'resumen_tareas') {
    const user = await User.findOne({ telegramChatId: String(chatId) });
    if (!user) return bot.sendMessage(chatId, '❌ No estás registrado.');
    return sendTaskSummary(chatId, user.username);
  }

  if (data.startsWith('tarea_estado_')) {
    const match = data.match(/^tarea_estado_([a-fA-F0-9]{24})_(.+)$/);
    if (!match) return bot.sendMessage(chatId, '❌ Acción no válida.');

    const [, taskId, rawStatus] = match;
    const decodedStatus = decodeURIComponent(rawStatus).replace(/_/g, ' ');
    const task = await Task.findOne({
      _id: taskId,
      $or: [{ assignedTo: user.username }, { creator: user.username }]
    });

    if (!task) return bot.sendMessage(chatId, '❌ No se pudo encontrar esa tarea.');
    if (!task.assignedTo.includes(user.username) && task.creator !== user.username) {
      return bot.sendMessage(chatId, '❌ No tenés permiso para modificar esta tarea.');
    }

    const validStatuses = ['No iniciada', 'En proceso', 'Finalizada'];
    if (!validStatuses.includes(decodedStatus)) {
      return bot.sendMessage(chatId, '❌ Estado no válido.');
    }

    task.status = decodedStatus;
    await task.save();

    return bot.sendMessage(chatId, `✅ Estado actualizado: ${task.title} → ${task.status}`);
  }

  if (data.startsWith('tarea_prioridad_')) {
    const match = data.match(/^tarea_prioridad_([a-fA-F0-9]{24})_(.+)$/);
    if (!match) return bot.sendMessage(chatId, '❌ Acción no válida.');

    const [, taskId, rawPriority] = match;
    const decodedPriority = decodeURIComponent(rawPriority).replace(/_/g, ' ');
    const task = await Task.findOne({
      _id: taskId,
      $or: [{ assignedTo: user.username }, { creator: user.username }]
    });

    if (!task) return bot.sendMessage(chatId, '❌ No se pudo encontrar esa tarea.');
    if (!task.assignedTo.includes(user.username) && task.creator !== user.username) {
      return bot.sendMessage(chatId, '❌ No tenés permiso para modificar esta tarea.');
    }

    const validPriorities = ['Urgente', 'Alta', 'Media', 'Baja'];
    if (!validPriorities.includes(decodedPriority)) {
      return bot.sendMessage(chatId, '❌ Prioridad no válida.');
    }

    task.importance = decodedPriority;
    await task.save();

    return bot.sendMessage(chatId, `✅ Prioridad actualizada: ${task.title} → ${task.importance}`);
  }
  
  if (data === 'verificar_rs232') {
    return bot.sendMessage(chatId, '📋 Seleccioná estación AIS:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Todas las estaciones', callback_data: 'AIS_All' }],
          [{ text: 'AIS Buenos Aires', callback_data: 'AIS_Bs_As' }],
          [{ text: 'AIS Rosario', callback_data: 'AIS_Rosario' }],
          [{ text: 'AIS Montevideo', callback_data: 'AIS_Montevideo' }],
          [{ text: 'AIS Paraná', callback_data: 'AIS_Parana' }],
          [{ text: 'AIS Barranqueras', callback_data: 'AIS_Barranqueras' }],
          [{ text: 'AIS Bella Vista', callback_data: 'AIS_Bella_Vista' }],
          [{ text: 'AIS Carabelitas', callback_data: 'AIS_Carabelitas' }],
          [{ text: 'AIS Diamante', callback_data: 'AIS_Diamante' }],
          [{ text: 'AIS Empedrado', callback_data: 'AIS_Empedrado' }],
          [{ text: 'AIS La Paz', callback_data: 'AIS_La_Paz' }],
          [{ text: 'AIS La Plata', callback_data: 'AIS_La_Plata' }],
          [{ text: 'AIS Punta Indio', callback_data: 'AIS_Punta_Indio' }],
          [{ text: 'AIS Ramallo', callback_data: 'AIS_Ramallo' }],
          [{ text: 'AIS San Pedro', callback_data: 'AIS_San_Pedro' }],
          [{ text: 'AIS Veractiva', callback_data: 'AIS_Veractiva' }],
          [{ text: 'AIS Marine Traffic', callback_data: 'AIS_Marine_Traffic' }]
          
        ]
      }
    });
  }

  /* ESTACOINES AIS */
  const estaciones = ['AIS_Bs_As', 'AIS_Rosario', 'AIS_Montevideo', 'AIS_Parana','AIS_Barranqueras','AIS_Bella_Vista','AIS_Carabelitas','AIS_Diamante','AIS_Empedrado','AIS_La_Paz','AIS_La_Plata', 'AIS_Punta_Indio','AIS_Ramallo','AIS_San_Pedro','AIS_Veractiva','AIS_Marine_Traffic'];

  /* Previamente se deben agregar la conexion en index */ 
  function estacionesAIS(stationName) {
    if (data === stationName) {
      const { connected, receivingData } = getStatus(stationName);
      if (!connected) return bot.sendMessage(chatId, '❌ Conexión perdida con el servidor RS232');
      if (!receivingData) return bot.sendMessage(chatId, '⚠️ Conectado, pero no se están recibiendo datos');
      return bot.sendMessage(chatId, `✅ Estación ${stationName} funcionando correctamente`);
    }
  }
  function verificarEstacion(stationName) {
    const { connected, receivingData } = getStatus(stationName);
    if (!connected) {
      return bot.sendMessage(chatId, `❌ ${stationName}: Conexión perdida con el servidor RS232`);
    }
    if (!receivingData) {
      return bot.sendMessage(chatId, `⚠️ ${stationName}: Conectado, pero no se están recibiendo datos`);
    }
    return bot.sendMessage(chatId, `✅ ${stationName}: funcionando correctamente`);
  }
  
  if (data === 'AIS_All') {
    // Ejecutamos una función async anónima para usar await dentro
    (async () => {
      await bot.sendMessage(chatId, `🛳️⚓ Verificación de estaciones AIS ⚓🛳️`);
      for (const estacion of estaciones) {
        await verificarEstacion(estacion); // Espera que termine antes de pasar a la siguiente
      }
    })();
  } else if (estaciones.includes(data)) {
    verificarEstacion(data);
  }
  
/*   estacionesAIS('AIS_Bs_As');
  estacionesAIS('AIS_Rosario');
  estacionesAIS('AIS_Montevideo');
  estacionesAIS('AIS_Parana');
   */
  
    
  

  if (data === 'ver_tareas') {
    try {
      const user = await User.findOne({ telegramChatId: String(chatId) });
      if (!user) return bot.sendMessage(chatId, '❌ No estás registrado.');
  
      const tareas = await Task.find({
        $or: [
          { assignedTo: user.username },
          { creator: user.username }
        ]
      }).sort({
        importance: 1,
        createdAt: -1
      });
  
      if (!tareas.length) {
        return bot.sendMessage(chatId, '📭 No tenés tareas asignadas ni creadas.');
      }
  
      const importanciaOrden = { 'Urgente': 0, 'Alta': 1, 'Media': 2, 'Baja': 3 };
      tareas.sort((a, b) => importanciaOrden[a.importance] - importanciaOrden[b.importance]);
  
      const primerasTareas = tareas.slice(0, 10);
      const session = { tareas: tareas.map((task) => String(task._id)), mostrarDetalles: false };
      userSessions.set(chatId, session);
  
      const botones = primerasTareas.map((t, index) => [
        { text: `${t.title}`.slice(0, 64), callback_data: `ver_tarea_${index}` }
      ]);

      const statusButtons = [
        [{ text: '📊 Resumen rápido', callback_data: 'resumen_tareas' }]
      ];
  
      if (tareas.length > 10) {
        botones.push([{ text: '📂 Filtrar por importancia (mostrar todo)', callback_data: 'filtrar_tareas' }]);
      }

      botones.push(...statusButtons);
  
      return bot.sendMessage(chatId, '📝 Tus tareas estan ordenadadas por importancia y vencimiento (máx. 10), para ver la totalidad de las tareas ingresar en la plataforma de gestion DYB:', {
        reply_markup: { inline_keyboard: botones }
      });
  
    } catch (err) {
      console.error(err);
      return bot.sendMessage(chatId, '❌ Error al obtener tus tareas.');
    }
  }
  

  if (data === 'buscar_solución'){
    userSessions.set(chatId, { awaitingSearchQuery: true });
    return bot.sendMessage(chatId, '🔍 ¿Qué solución técnica estás buscando? Escribí un término de búsqueda.');
  }

  if (data === 'ver_perfil') {
    const user = await User.findOne({ telegramChatId: String(chatId) });
    if (!user) {
      return bot.sendMessage(chatId, '❌ Todavía no estás registrado en el bot.');
    }

    return bot.sendMessage(chatId,
      `👤 <b>Perfil</b>\n\nUsuario: ${escapeHtml(user.username)}\nRol: ${escapeHtml(user.role || 'user')}\nEmail: ${escapeHtml(user.email || 'No informado')}`,
      { parse_mode: 'HTML' }
    );
  }
  });
});

/* EXPORTACIÓN */
module.exports = bot;
