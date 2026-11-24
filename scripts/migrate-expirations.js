require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Expiration = require('../src/models/expiration.model');

const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost/merndb';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const docs = await Expiration.find({});
    console.log(`📦 Encontrados ${docs.length} vencimientos para migrar`);

    let migrated = 0;
    let skipped = 0;

    for (const doc of docs) {
      const reminderDays = [];
      const sentReminders = [];

      // Migrar reminders
      if (doc.notify7DaysBefore) reminderDays.push(7);
      if (doc.notify30DaysBefore) reminderDays.push(30);
      if (doc.notify90DaysBefore) reminderDays.push(90);
      if (!reminderDays.length) reminderDays.push(7);

      const tenDaysBefore = reminderDays.includes(7) || reminderDays.includes(10);
      const customDaysBefore = reminderDays.find(d => d !== 7 && d !== 10) || null;

      // Migrar sentReminders
      if (doc.notified) sentReminders.push({ type: 'onExpiration', sentAt: doc.updatedAt, channel: 'telegram', recipients: doc.assignedTo });
      if (doc.notified7DaysBefore) sentReminders.push({ type: 'tenDaysBefore', sentAt: doc.updatedAt, channel: 'telegram', recipients: doc.assignedTo });
      if (doc.notified30DaysBefore) sentReminders.push({ type: 'custom', sentAt: doc.updatedAt, channel: 'telegram', recipients: doc.assignedTo });
      if (doc.notified90DaysBefore) sentReminders.push({ type: 'custom', sentAt: doc.updatedAt, channel: 'telegram', recipients: doc.assignedTo });

      // Verificar si ya tiene la nueva estructura
      if (doc.reminders && doc.reminders.tenDaysBefore !== undefined) {
        skipped++;
        continue;
      }

      doc.reminders = {
        onExpiration: true,
        tenDaysBefore,
        customDaysBefore
      };
      doc.sentReminders = sentReminders;

      await doc.save();
      migrated++;
    }

    console.log(`✅ Migración completada:`);
    console.log(`   - Migrados: ${migrated}`);
    console.log(`   - Ya migrados (skip): ${skipped}`);
    console.log(`   - Total: ${docs.length}`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

migrate();