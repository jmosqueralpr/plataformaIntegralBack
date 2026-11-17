const mongoose = require('mongoose');

const telegramSessionSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  pendingExpirations: mongoose.Schema.Types.Mixed,
  pendingTaskDrafts: mongoose.Schema.Types.Mixed,
  pendingLinkCode: { type: Boolean, default: false },
  userSession: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, expires: 0, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('TelegramSession', telegramSessionSchema);
