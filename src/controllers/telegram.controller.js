const bot = require('../services/telegram/telegram'); // instancia del bot
const User = require('../models/user.model'); // modelo del usuario
const crypto = require('crypto');

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
  console.log("Llegamos al controller");
  console.log(req.body);

  /* PARA ENVIAR MENSAJES */

  /* Enviar POST a http://localhost:3000/api/send-telegram-message  */

  /* Para enviar a un usuario puntual agregar al body:

    {
      "userDestiny": "jmosquera",
      "message": "Prueba de mensaje"
    }
  
  */

  /* Si quiero enviar a todos los usuarios, agregar al userDstiny la palabra "all":
  
  {
    "userDestiny": "all",
    "message": "Prueba de mensaje"
  }

  */

  const { userDestiny, message } = req.body;

  try {
    if (userDestiny === 'all') {
      const users = await User.find({ telegramChatId: { $nin: [null, ''] } });

      if (!users.length) {
        return res.status(404).json({ message: 'No hay usuarios con chatId de Telegram' });
      }

      // Enviar el mensaje a cada usuario con chatId
      for (const user of users) {
        await bot.sendMessage(user.telegramChatId, `✅ 🔔 ${message} 🔔 ✅`);
      }

      return res.json({ message: `Mensaje enviado a ${users.length} usuarios por Telegram` });
    }

    // Caso normal: buscar por username
    const user = await User.findOne({ username: userDestiny });

    if (!user || !user.telegramChatId) {
      return res.status(404).json({ message: 'Usuario o chatId no encontrado' });
    }

    await bot.sendMessage(user.telegramChatId, `✅ 🔔 ${message} 🔔 ✅`);

    res.json({ message: `Mensaje enviado a ${user.username} por Telegram` });

  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ message: 'Error enviando mensaje' });
  }
};

module.exports = {
  telegramURLResponse,
  createTelegramLinkCode
};
