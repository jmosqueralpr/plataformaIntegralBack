// src/jobs/expirationReminder.job.js
const cron = require('node-cron');
const Expiration = require('../../../models/expiration.model');
const User = require('../../../models/user.model');

module.exports = function initializeExpirationReminder(bot) {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Verificando tareas vencidas y próximas a vencer...');
    try {
      const now = new Date();
      const expirations = await Expiration.find({
        expirationDate: { $ne: null },
        expirationTime: { $ne: null }
      });

      for (const task of expirations) {
        const [year, month, day] = task.expirationDate.split('-').map(Number);
        const [hour, minute] = task.expirationTime.split(':').map(Number);
        const expirationDateTime = new Date(year, month - 1, day, hour, minute);
        const timeDiffMs = expirationDateTime - now;
        const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);
        const timeDiffDays = timeDiffHrs / 24;

        if (now >= expirationDateTime && !task.notified) {
          for (const username of task.assignedTo) {
            const user = await User.findOne({ username });
            if (user && user.telegramChatId) {
              await bot.sendMessage(user.telegramChatId, `⚠️ La tarea "${task.title}" ha vencido.\n📅 Fecha: ${task.expirationDate}\n🕒 Hora: ${task.expirationTime}`);
            }
          }
          task.notified = true;
          await task.save();
          continue;
        }

        if (task.notify30DaysBefore && !task.notified30DaysBefore && timeDiffDays <= 30 && timeDiffDays > 29) {
          for (const username of task.assignedTo) {
            const user = await User.findOne({ username });
            if (user && user.telegramChatId) {
              await bot.sendMessage(user.telegramChatId, `📆 Recordatorio: La tarea "${task.title}" vence en 30 días.\n📅 Fecha: ${task.expirationDate}`);
            }
          }
          task.notified30DaysBefore = true;
          await task.save();
        }

        if (task.notify90DaysBefore && !task.notified90DaysBefore && timeDiffDays <= 90 && timeDiffDays > 89) {
          for (const username of task.assignedTo) {
            const user = await User.findOne({ username });
            if (user && user.telegramChatId) {
              await bot.sendMessage(user.telegramChatId, `📆 Recordatorio: La tarea "${task.title}" vence en 90 días.\n📅 Fecha: ${task.expirationDate}`);
            }
          }
          task.notified90DaysBefore = true;
          await task.save();
        }
      }
    } catch (error) {
      console.error('❌ Error al verificar vencimientos:', error);
    }
  });
};
