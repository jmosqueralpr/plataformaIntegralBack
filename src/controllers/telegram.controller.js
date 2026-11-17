const bot = require('../services/telegram/telegram'); // instancia del bot
const User = require('../models/user.model'); // modelo del usuario
const crypto = require('crypto');

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const MAX_SELECTED_RECIPIENTS = 1000;
const TELEGRAM_SEND_INTERVAL_MS = 50;
let telegramBroadcastInProgress = false;

const getTelegramMessageRecipients = async (req, res) => {
  try {
    const users = await User.find({ telegramChatId: { $exists: true, $nin: [null, ''] } })
      .select('username')
      .sort({ username: 1 })
      .lean();

    return res.json(users.map((user) => ({
      id: String(user._id),
      username: user.username
    })));
  } catch (error) {
    console.error('Error al obtener destinatarios de Telegram:', error.message);
    return res.status(500).json({ message: 'No se pudieron cargar los destinatarios.' });
  }
};

const createTelegramLinkCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const code = crypto.randomBytes(10).toString('hex').toUpperCase();
    user.telegramLinkTokenHash = crypto.createHash('sha256').update(code).digest('hex');
    user.telegramLinkTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return res.json({
      code,
      expiresAt: user.telegramLinkTokenExpiresAt
    });
  } catch (error) {
    console.error('Error al generar código de vinculación de Telegram:', error);
    return res.status(500).json({ message: 'No se pudo generar el código de vinculación.' });
  }
};

const telegramURLResponse = async (req, res) => {
  const { userDestiny, message: rawMessage } = req.body || {};
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!message) {
    return res.status(400).json({ message: 'Escribí el mensaje que querés enviar.' });
  }
  if (message.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `El mensaje no puede superar ${MAX_TELEGRAM_MESSAGE_LENGTH} caracteres.` });
  }

  const sendToAll = userDestiny === 'all';
  if (Array.isArray(userDestiny) && userDestiny.some((username) => typeof username !== 'string' || !username.trim())) {
    return res.status(400).json({ message: 'La lista de destinatarios no es válida.' });
  }
  const requestedUsernames = sendToAll
    ? null
    : Array.isArray(userDestiny)
      ? [...new Set(userDestiny.filter((username) => typeof username === 'string').map((username) => username.trim()).filter(Boolean))]
      : typeof userDestiny === 'string' && userDestiny.trim()
        ? [userDestiny.trim()]
        : [];

  if (!sendToAll && requestedUsernames.length === 0) {
    return res.status(400).json({ message: 'Seleccioná al menos un destinatario.' });
  }
  if (!sendToAll && requestedUsernames.length > MAX_SELECTED_RECIPIENTS) {
    return res.status(400).json({ message: `Podés seleccionar hasta ${MAX_SELECTED_RECIPIENTS} destinatarios por envío.` });
  }

  try {
    const userQuery = { telegramChatId: { $exists: true, $nin: [null, ''] } };
    if (!sendToAll) userQuery.username = { $in: requestedUsernames };

    const users = await User.find(userQuery).select('username telegramChatId').sort({ username: 1 }).lean();
    if (!users.length) {
      return res.status(404).json({ message: 'No hay destinatarios con Telegram vinculado.' });
    }

    if (!sendToAll && users.length !== requestedUsernames.length) {
      return res.status(404).json({ message: 'Uno o más usuarios seleccionados no tienen Telegram vinculado.' });
    }

    if (telegramBroadcastInProgress) {
      return res.status(409).json({ message: 'Ya hay un envío de Telegram en curso. Intentá nuevamente en unos minutos.' });
    }

    telegramBroadcastInProgress = true;
    let sent = 0;
    const failedUsernames = [];

    try {
      for (const [index, user] of users.entries()) {
        try {
          await bot.sendMessage(user.telegramChatId, message);
          sent += 1;
        } catch (error) {
          failedUsernames.push(user.username);
          console.error(`No se pudo enviar el mensaje de Telegram a ${user.username}:`, error.message);
        }

        if (index < users.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, TELEGRAM_SEND_INTERVAL_MS));
        }
      }
    } finally {
      telegramBroadcastInProgress = false;
    }

    const failed = failedUsernames.length;
    return res.status(sent === 0 ? 502 : 200).json({
      message: failed === 0
        ? `Mensaje enviado a ${sent} usuarios.`
        : `Mensaje enviado a ${sent} de ${users.length} usuarios.`,
      total: users.length,
      sent,
      failed,
      failedUsernames: failedUsernames.slice(0, 20),
      failuresTruncated: failed > 20
    });
  } catch (error) {
    console.error('Error al procesar el envío de Telegram:', error.message);
    return res.status(500).json({ message: 'No se pudo procesar el envío de Telegram.' });
  }
};

module.exports = {
  telegramURLResponse,
  createTelegramLinkCode,
  getTelegramMessageRecipients
};
