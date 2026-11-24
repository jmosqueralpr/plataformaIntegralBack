// src/jobs/expirationReminder.job.js
const cron = require('node-cron');
const Expiration = require('../../../models/expiration.model');
const User = require('../../../models/user.model');
const { notifyUser } = require('../../../services/email/email.service');

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

function checkReminders(task, now) {
  const expirationDateTime = dateInTimezone(
    task.expirationDate,
    task.expirationTime || DEFAULT_EXPIRATION_TIME,
    TIMEZONE
  );
  if (!expirationDateTime) return [];

  const timeDiffMs = expirationDateTime - now;
  const timeDiffDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));

  const reminders = task.reminders || { onExpiration: true, tenDaysBefore: true, customDaysBefore: null };
  const sentTypes = (task.sentReminders || []).map(s => s.type);
  const toSend = [];

  if (timeDiffDays <= 0 && reminders.onExpiration && !sentTypes.includes('onExpiration')) {
    toSend.push({ type: 'onExpiration', daysBefore: 0 });
  }

  if (timeDiffDays === 10 && reminders.tenDaysBefore && !sentTypes.includes('tenDaysBefore')) {
    toSend.push({ type: 'tenDaysBefore', daysBefore: 10 });
  }

  if (reminders.customDaysBefore && timeDiffDays === reminders.customDaysBefore && !sentTypes.includes('custom')) {
    toSend.push({ type: 'custom', daysBefore: reminders.customDaysBefore });
  }

  return toSend;
}

function buildTelegramMessage(task, reminderType, daysBefore) {
  const { title, description, expirationDate, expirationTime } = task;
  const dateStr = `${expirationDate} ${expirationTime || DEFAULT_EXPIRATION_TIME}`;

  switch (reminderType) {
    case 'onExpiration':
      return `⚠️ La tarea "${title}" ha vencido.\n📅 Fecha: ${dateStr}\n${description ? `📝 ${description}\n` : ''}\n👉 Revisá la plataforma para gestionar el vencimiento.`;
    case 'tenDaysBefore':
      return `📆 Recordatorio: la tarea "${title}" vence en 10 días.\n📅 Fecha: ${dateStr}\n${description ? `📝 ${description}\n` : ''}\n👉 Revisá la plataforma para ajustar la planificación.`;
    case 'custom':
      return `📆 Recordatorio: la tarea "${title}" vence en ${daysBefore} días.\n📅 Fecha: ${dateStr}\n${description ? `📝 ${description}\n` : ''}\n👉 Es un buen momento para revisar el avance.`;
    default:
      return `📋 Alerta: "${title}"\n📅 Fecha: ${dateStr}`;
  }
}

async function notifyAssignedUsers(bot, task, reminderType, daysBefore) {
  const usernames = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
  const results = { telegram: [], email: [] };

  for (const username of usernames) {
    const user = await User.findOne({ username }).lean();
    if (!user) continue;

    const channels = [];
    if (user.telegramChatId && user.notificationPreferences?.telegram !== false) {
      channels.push('telegram');
    }
    if (user.email && user.notificationPreferences?.email !== false) {
      channels.push('email');
    }
    if (!channels.length) continue;

    const message = buildTelegramMessage(task, reminderType, daysBefore);

    if (channels.includes('telegram')) {
      try {
        await bot.sendMessage(user.telegramChatId, message);
        results.telegram.push(username);
      } catch (error) {
        console.error(`[TELEGRAM] Error enviando a ${username}:`, error.message);
      }
    }

    if (channels.includes('email')) {
      const emailResult = await notifyUser(user, task, reminderType, daysBefore, ['email']);
      if (emailResult.email) results.email.push(username);
    }
  }

  return results;
}

module.exports = function initializeExpirationReminder(bot) {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Verificando vencimientos y recordatorios...');
    try {
      const now = new Date();
      const expirations = await Expiration.find({
        expirationDate: { $exists: true, $ne: null }
      });

      for (const task of expirations) {
        if (!task.expirationDate) continue;

        const remindersToSend = checkReminders(task, now);
        if (!remindersToSend.length) continue;

        for (const reminder of remindersToSend) {
          const results = await notifyAssignedUsers(bot, task, reminder.type, reminder.daysBefore);

          const allRecipients = [...new Set([...results.telegram, ...results.email])];
          if (allRecipients.length > 0) {
            task.sentReminders.push({
              type: reminder.type,
              sentAt: new Date(),
              channel: results.telegram.length && results.email.length ? 'both' : results.telegram.length ? 'telegram' : 'email',
              recipients: allRecipients
            });
            await task.save();
            console.log(`✅ Recordatorio ${reminder.type} (${reminder.daysBefore}d) enviado para "${task.title}" a:`, allRecipients.join(', '));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al verificar vencimientos:', error);
    }
  }, { timezone: TIMEZONE });
};
