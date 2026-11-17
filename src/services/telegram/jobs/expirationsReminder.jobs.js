// src/jobs/expirationReminder.job.js
const cron = require('node-cron');
const Expiration = require('../../../models/expiration.model');
const User = require('../../../models/user.model');

const DEFAULT_EXPIRATION_TIME = '10:00';
const TIMEZONE = process.env.TZ || 'America/Argentina/Buenos_Aires';

function dateInTimezone(dateValue, timeValue, timezone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
    return null;
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const dateCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    dateCheck.getUTCFullYear() !== year ||
    dateCheck.getUTCMonth() !== month - 1 ||
    dateCheck.getUTCDate() !== day
  ) {
    return null;
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(utcGuess));
  const localParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localTimestamp = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
    Number(localParts.second)
  );
  const offset = localTimestamp - utcGuess;
  const result = new Date(utcGuess - offset);

  return Number.isNaN(result.getTime()) ? null : result;
}

module.exports = function initializeExpirationReminder(bot) {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Verificando tareas vencidas y próximas a vencer...');
    try {
      const now = new Date();
      const expirations = await Expiration.find({
        expirationDate: { $exists: true, $ne: null }
      });

      async function notifyAssignedUsers(expiration, message) {
        const usernames = Array.isArray(expiration.assignedTo) ? expiration.assignedTo : [expiration.assignedTo];

        for (const username of usernames) {
          const user = await User.findOne({ username });
          if (user && user.telegramChatId) {
            await bot.sendMessage(user.telegramChatId, message);
          }
        }
      }

      for (const task of expirations) {
        if (!task.expirationDate) continue;

        const expirationDateTime = dateInTimezone(
          task.expirationDate,
          task.expirationTime || DEFAULT_EXPIRATION_TIME,
          TIMEZONE
        );
        if (!expirationDateTime) continue;
        const timeDiffMs = expirationDateTime - now;
        const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);
        const timeDiffDays = timeDiffHrs / 24;

        if (now >= expirationDateTime && !task.notified) {
          await notifyAssignedUsers(
            task,
            `⚠️ La tarea "${task.title}" ha vencido.\n📅 Fecha: ${task.expirationDate}\n🕒 Hora: ${task.expirationTime}\n\n👉 Revisá la plataforma para gestionar el vencimiento.`
          );
          task.notified = true;
          await task.save();
          continue;
        }

        if (task.notify30DaysBefore && !task.notified30DaysBefore && timeDiffDays <= 30 && timeDiffDays > 29) {
          await notifyAssignedUsers(
            task,
            `📆 Recordatorio: la tarea "${task.title}" vence en 30 días.\n📅 Fecha: ${task.expirationDate}\n\n👉 Revisá la plataforma para ajustar la planificación.`
          );
          task.notified30DaysBefore = true;
          await task.save();
        }

        if (task.notify90DaysBefore && !task.notified90DaysBefore && timeDiffDays <= 90 && timeDiffDays > 89) {
          await notifyAssignedUsers(
            task,
            `📆 Recordatorio: la tarea "${task.title}" vence en 90 días.\n📅 Fecha: ${task.expirationDate}\n\n👉 Es un buen momento para revisar el avance.`
          );
          task.notified90DaysBefore = true;
          await task.save();
        }

        if (task.notify7DaysBefore && timeDiffDays <= 7 && timeDiffDays > 0 && !task.notified7DaysBefore) {
          await notifyAssignedUsers(
            task,
            `🔔 Queda menos de 7 días para la tarea "${task.title}".\n📅 Fecha: ${task.expirationDate}\n\n👉 Revisá el avance y planificá la finalización.`
          );
          task.notified7DaysBefore = true;
          await task.save();
        }
      }
    } catch (error) {
      console.error('❌ Error al verificar vencimientos:', error);
    }
  }, { timezone: TIMEZONE });
};
