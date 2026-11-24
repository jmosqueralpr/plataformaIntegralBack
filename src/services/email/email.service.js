const nodemailer = require('nodemailer');

let transporter = null;
let isMock = false;

function initializeTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (!SMTP_PASS || SMTP_PASS === 'PENDIENTE_APP_PASSWORD') {
    isMock = true;
    console.log('[EMAIL] Modo MOCK activado - configurá SMTP_PASS en .env para envío real');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS.replace(/\s+/g, '')
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.verify((error) => {
    if (error) {
      console.error('[EMAIL] Error verificando transporter:', error.message);
      isMock = true;
    } else {
      console.log('[EMAIL] Transporter listo para envío real');
      isMock = false;
    }
  });

  return transporter;
}

function getTransporter() {
  if (!transporter && !isMock) {
    initializeTransporter();
  }
  return transporter;
}

function buildExpirationEmail(user, expiration, reminderType, daysBefore) {
  const { title, description, expirationDate, expirationTime } = expiration;
  const from = process.env.EMAIL_FROM || 'Plataforma Integral <noreply@plataformaintegral.com>';

  let subject, html, text;

  switch (reminderType) {
    case 'onExpiration':
      subject = `⚠️ VENCIDO: ${title}`;
      break;
    case 'tenDaysBefore':
      subject = `📆 Recordatorio (10 días): ${title} vence el ${expirationDate}`;
      break;
    case 'custom':
      subject = `📆 Recordatorio (${daysBefore} días): ${title} vence el ${expirationDate}`;
      break;
    default:
      subject = `📋 Alerta: ${title}`;
  }

  const dateStr = new Date(expirationDate + 'T' + (expirationTime || '10:00')).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  text = `
Hola ${user.username},

${subject}

📌 Título: ${title}
${description ? `📝 Descripción: ${description}` : ''}
📅 Fecha de vencimiento: ${dateStr}

${reminderType === 'onExpiration' ? 'Esta tarea ya ha vencido.' : `Quedan ${daysBefore} días para el vencimiento.`}

Revisá la plataforma para gestionar el vencimiento.

---
Plataforma Integral - Sistema de Alertas
  `.trim();

  html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9fafb; border-radius: 8px; padding: 24px; }
    .header { background: ${reminderType === 'onExpiration' ? '#ef4444' : '#3b82f6'}; color: white; padding: 16px; border-radius: 6px 6px 0 0; margin: -24px -24px 20px -24px; }
    .title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
    .meta { background: white; border-radius: 6px; padding: 16px; margin: 16px 0; border-left: 4px solid ${reminderType === 'onExpiration' ? '#ef4444' : '#3b82f6'}; }
    .meta-row { display: flex; margin: 8px 0; }
    .meta-label { font-weight: 600; min-width: 120px; color: #6b7280; }
    .meta-value { color: #111827; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${subject}</div>
    </div>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">📌 Título:</span><span class="meta-value">${title}</span></div>
      ${description ? `<div class="meta-row"><span class="meta-label">📝 Descripción:</span><span class="meta-value">${description}</span></div>` : ''}
      <div class="meta-row"><span class="meta-label">📅 Vencimiento:</span><span class="meta-value">${dateStr}</span></div>
      <div class="meta-row"><span class="meta-label">⏰ Tipo:</span><span class="meta-value">${reminderType === 'onExpiration' ? 'Vencido' : `${daysBefore} días antes`}</span></div>
    </div>
    <p>${reminderType === 'onExpiration' ? 'Esta tarea ya ha vencido.' : `Quedan ${daysBefore} días para el vencimiento.`}</p>
    <p style="text-align:center; margin:24px 0;"><a href="${process.env.ORIGIN_URL || 'https://plataformaintegral.netlify.app'}/expirations" class="btn">Ver en plataforma</a></p>
    <div class="footer">Plataforma Integral - Sistema de Alertas Automáticas</div>
  </div>
</body>
</html>
  `.trim();

  return { from, to: user.email, subject, text, html };
}

async function sendExpirationEmail(user, expiration, reminderType, daysBefore = 0) {
  if (!user?.email) {
    return { success: false, reason: 'no_email' };
  }

  const mailOptions = buildExpirationEmail(user, expiration, reminderType, daysBefore);

  if (isMock || !getTransporter()) {
    console.log('[EMAIL MOCK] →', mailOptions.to, '|', mailOptions.subject);
    return { success: true, mock: true, messageId: `mock-${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Enviado:', info.messageId, '→', mailOptions.to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error enviando:', error.message);
    return { success: false, error: error.message };
  }
}

async function notifyUser(user, expiration, reminderType, daysBefore, channels = ['telegram', 'email']) {
  const results = { telegram: false, email: false };

  if (channels.includes('email') && user?.notificationPreferences?.email !== false) {
    const emailResult = await sendExpirationEmail(user, expiration, reminderType, daysBefore);
    results.email = emailResult.success;
  }

  return results;
}

initializeTransporter();

module.exports = {
  sendExpirationEmail,
  notifyUser,
  initializeTransporter,
  getTransporter
};