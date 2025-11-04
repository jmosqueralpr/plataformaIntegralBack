const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
require('dotenv').config(); // Cargar el archivo .env

const User = require('../../models/user.model');
const Expiration = require('../../models/expiration.model');
const Solution = require('../../models/solution.model');
const Task = require('../../models/task.model');

const { getStatus } = require('../../utils/tcpMonitor');

/* HANDLERS */

/* Token Handler */

const ENV = process.env.NODE_ENV || 'development';

const token = /* Token para produccion y token para desarrollo, para que no haya conflicto entre los dos */
  ENV === 'production'
    ? process.env.BOT_TOKEN_PROD
    : process.env.BOT_TOKEN_DEV;

/* const token = '7303678646:AAGpwKxDpG9fskEEYDfB1fhDF-Afvp2i6h8';  */

const bot = new TelegramBot(token, { polling: true });

console.log("Token:");

console.log(token);

console.log(ENV);

console.log(process.env.NODE_ENV);

/* JOBS */
const initializeExpirationReminder = require('./jobs/expirationsReminder.jobs');
initializeExpirationReminder(bot);

/* SESIONES MANUALES */
const pendingUsernames = new Map();
const pendingExpirations = new Map();
const pendingTasks = new Map();
const userSessions = new Map();

/* MENÚ PRINCIPAL */
function mostrarMenu(chatId) {
  return bot.sendMessage(chatId, '¡Hola! ¿Qué te gustaría hacer?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📥 Registrar ChatId si sos nuevo usuario', callback_data: 'registrar_chatid' }],
        [{ text: '📋 Ver enlace a la plataforma web', callback_data: 'enlace_web' }],
        [{ text: '📋 Ver mis tareas', callback_data: 'ver_tareas' }],
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



/* MENSAJES DE TEXTO GENERALES */
bot.on('message', async (msg) => {

/* 1127001486; */

  

  console.log("Ingreso a message");

  const chatId = msg.chat.id; //Aca registro cual es el chat id de quien me escribe
  const telegramId = msg.from.username; //Aca el nombre de quien me escribe
  const text = msg.text?.trim();
  if (!text) return;

  const session = userSessions.get(chatId) || {};

   /* REGISTRO ChatId DE UN USUARIO */
   if (pendingUsernames.has(chatId)) {
    const pending = pendingUsernames.get(chatId);

    if (pending.step === 'username') {
      const username = text;
      const user = await User.findOne({ username });
      if (!user) return bot.sendMessage(chatId, `❌ No encontré un usuario con el nombre: ${username}. Intenta nuevamente.`);

      pendingUsernames.set(chatId, { step: 'password', username });
      return bot.sendMessage(chatId, '🔐 Ahora ingresá tu *contraseña*:', { parse_mode: 'Markdown' });
    }

    if (pending.step === 'password') {
      const { username } = pending;
      const user = await User.findOne({ username });
      const passwordCorrect = await bcrypt.compare(text, user.password);
      if (!passwordCorrect) return bot.sendMessage(chatId, '❌ Contraseña incorrecta. Intentá nuevamente.');

      user.telegramChatId = chatId;
      user.telegramId = telegramId;
      await user.save();

      pendingUsernames.delete(chatId);
      return bot.sendMessage(chatId, `✅ ¡Gracias ${username}! Tu chatId fue registrado correctamente.`);
    }
  }

  /* CREACIÓN DE TAREA */
  if (pendingTasks.has(chatId)) {
    const data = pendingTasks.get(chatId);

    if (!data.title) {
      data.title = text;
      pendingTasks.set(chatId, data);
      return bot.sendMessage(chatId, '📝 Ingresá la *descripción* de la tarea:', { parse_mode: 'Markdown' });
    }

    if (!data.description) {
      data.description = text;

      try {
        const user = await User.findOne({ telegramChatId: chatId });
        if (!user) return bot.sendMessage(chatId, '❌ No estás registrado. Registrá tu chatId primero.');

        const task = new Task({
          title: data.title,
          description: data.description,
          assignedTo: [user.username],
          creator: user.username,
          status: 'No iniciada',
          importance: 'Media',
          sendWhatsAppOwner: false,
          sendWhatsAppAssignedTo: false,
          notifyAssignedDate: '',
          notifyAssignedTime: ''
        });

        await task.save();

        await bot.sendMessage(chatId, `✅ Tarea creada:\n📌 *${task.title}*\n📝 ${task.description}`, { parse_mode: 'Markdown' });
        await bot.sendMessage(chatId, `ℹ️ Ingresar a la plataforma de gestion para cargar los datos restantes de la tarea` );
      } catch (err) {
        console.error(err);
        await bot.sendMessage(chatId, '❌ Error al crear la tarea.');
      }

      pendingTasks.delete(chatId);
      return;
    }
  }

  /* CREACIÓN DE VENCIMIENTO */
  if (pendingExpirations.has(chatId)) {
    const data = pendingExpirations.get(chatId);

    if (!data.title) {
      data.title = text;
      pendingExpirations.set(chatId, data);
      return bot.sendMessage(chatId, '📅 Ingresá la *fecha de vencimiento* (YYYY-MM-DD):', { parse_mode: 'Markdown' });
    }

    if (!data.expirationDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return bot.sendMessage(chatId, '❌ Formato inválido. Usá YYYY-MM-DD.');

      const inputDate = new Date(text);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (inputDate < today) return bot.sendMessage(chatId, '❌ Fecha anterior a hoy. Ingresá una fecha válida.');

      data.expirationDate = text;

      try {
        const user = await User.findOne({ telegramChatId: chatId });
        if (!user) return bot.sendMessage(chatId, '❌ No estás registrado. Registrá tu chatId primero.');

        const expiration = new Expiration({
          title: data.title,
          expirationDate: data.expirationDate,
          expirationTime: '10:00',
          description: '',
          assignedTo: [user.username]
        });

        await expiration.save();
        await bot.sendMessage(chatId, `✅ Vencimiento creado:\n📌 *${expiration.title}*\n📅 ${expiration.expirationDate}\n⏰ 10:00`, { parse_mode: 'Markdown' });
        await bot.sendMessage(chatId, `ℹ️ Si deseas cambiar los datos del vencimiento, puedes hacerlo mediante la plataforma de gestion.`, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error(err);
        await bot.sendMessage(chatId, '❌ Error al crear el vencimiento.');
      }

      pendingExpirations.delete(chatId);
      return;
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
            [field]: { $regex: word, $options: 'i' }
          }))
        }));

        try {
          const results = await Solution.find({ $and: searchCriteria }).limit(10);

          if (results.length === 0) {
            session.awaitingSearchQuery = false;
            userSessions.set(chatId, session);
            return await bot.sendMessage(chatId, '❌ No se encontraron soluciones técnicas con esos términos.');
          }

          session.searchResults = results;
          session.awaitingSearchQuery = false;
          session.awaitingSelection = true;
          userSessions.set(chatId, session);

          const buttons = results.map((s, i) => [{
            text: s.title,
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


/* CALLBACKS */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const telegramUsername = query.from.username;
  const session = userSessions.get(chatId) || {};
  

  const user = await User.findOne({ telegramChatId: chatId });
  if (!user) {
    //Consulta si tengo registrado el chatId
    bot.sendMessage(chatId, '❌ No estás registrado. Registrá tu chatId primero.');

    // Iniciar registro automáticamente
    pendingUsernames.set(chatId, { step: 'username' });
    return bot.sendMessage(chatId, '✏️ Escribí tu *usuario* para registrar el chatId:', { parse_mode: 'Markdown' });
  }

  if (data === 'mostrar_menu') return mostrarMenu(chatId);

  if (data === 'registrar_chatid') {
    pendingUsernames.set(chatId, { step: 'username' });
    return bot.sendMessage(chatId, '✏️ Escribí tu *usuario* para registrar el chatId:', { parse_mode: 'Markdown' });
  }

  if (data === 'enlace_web') {
    return bot.sendMessage(chatId, '✏️ El enlace a la web (Para navegador web en tu PC): http://190.210.40.127:55000');
  }

  if (data.startsWith('ver_tarea_')) {
    const index = parseInt(data.split('_').pop());
    const session = userSessions.get(chatId);
    const tarea = session?.tareas?.[index];
  
    if (!tarea) return bot.sendMessage(chatId, '❌ No se pudo encontrar esa tarea.');
    
    
    return bot.sendMessage(chatId,
      `📌 *${tarea.title}*\n📝 ${tarea.description || 'Sin descripción'}\n🔥 *Importancia:* ${tarea.importance}`,
      { parse_mode: 'Markdown' }
    );
  }

  if (data === 'filtrar_tareas') {
    const session = userSessions.get(chatId);
    const tareas = session?.tareas;
  
    if (!tareas?.length) return bot.sendMessage(chatId, '❌ No hay tareas para mostrar.');
  
    const mensajes = tareas.map(t =>
      `📌 *${t.title}*\n📝 ${t.description || 'Sin descripción'}\n🔥 *Importancia:* ${t.importance}`
    );
  
    return bot.sendMessage(chatId, `🗂️ *Todas tus tareas ordenadas por importancia:*\n\n${mensajes.join('\n\n')}`, {
      parse_mode: 'Markdown'
    });
  }
  

  if (data === 'crear_vencimiento') {
    pendingExpirations.set(chatId, {});
    return bot.sendMessage(chatId, '📝 Escribí el *título* del vencimiento:', { parse_mode: 'Markdown' });
  }

  if (data === 'ver_vencimientos') {
    try {
      const user = await User.findOne({ telegramChatId: chatId });
      if (!user) return bot.sendMessage(chatId, '❌ No estás registrado.');

      const expirations = await Expiration.find({ assignedTo: user.username }).sort({ expirationDate: 1 });
      if (!expirations.length) return bot.sendMessage(chatId, '📭 No tenés vencimientos asignados.');

      for (const exp of expirations) {
        const mensaje = `📌 *${exp.title}*\n📝 ${exp.description || 'Sin descripción'}\n📅 *Fecha:* ${exp.expirationDate}\n⏰ *Hora:* ${exp.expirationTime || 'No definida'}`;
        await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, '❌ Error al obtener los vencimientos.');
    }
  }

  if (data.startsWith('select_solution_') && session.awaitingSelection) {
    const index = parseInt(data.split('_').pop());
    const solution = session.searchResults?.[index];

    if (solution) {
      await bot.sendMessage(chatId, `<b>${solution.title}</b>\n\n${solution.content}</b>\nReferencia: ${solution.document_ref}`, { parse_mode: 'HTML' });
    } else {
      await bot.sendMessage(chatId, '❌ No se pudo recuperar la solución.');
    }

    session.awaitingSelection = false;
    session.searchResults = null;
    userSessions.set(chatId, session);
    return await bot.answerCallbackQuery(query.id);
  }

  if (data === 'crear_tarea') {
    pendingTasks.set(chatId, {});
    return bot.sendMessage(chatId, '📝 Escribí el *título* de la tarea:', { parse_mode: 'Markdown' });
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
      const user = await User.findOne({ telegramChatId: chatId });
      if (!user) return bot.sendMessage(chatId, '❌ No estás registrado.');
  
      const tareas = await Task.find({
        $or: [
          { assignedTo: user.username },
          { creator: user.username }
        ]
      }).sort({
        importance: 1, // menor valor = mayor importancia (urgente primero)
        createdAt: -1
      });
  
      if (!tareas.length) {
        return bot.sendMessage(chatId, '📭 No tenés tareas asignadas ni creadas.');
      }
  
      const importanciaOrden = { 'Urgente': 0, 'Alta': 1, 'Media': 2, 'Baja': 3 };
      tareas.sort((a, b) => importanciaOrden[a.importance] - importanciaOrden[b.importance]);
  
      const primerasTareas = tareas.slice(0, 10);
      const session = { tareas, mostrarDetalles: false };
      userSessions.set(chatId, session);
  
      const botones = primerasTareas.map((t, index) => [
        { text: `${t.title}`, callback_data: `ver_tarea_${index}` }
      ]);
  
      if (tareas.length > 10) {
        botones.push([{ text: '📂 Filtrar por importancia (mostrar todo)', callback_data: 'filtrar_tareas' }]);
      }
  
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
    return bot.sendMessage(chatId, `👤 Tu usuario de Telegram es: @${telegramUsername} y tu chatId es: @${chatId}`);
  }
});

/* EXPORTACIÓN */
module.exports = bot;
