

/* const mongoose = require('mongoose');

const expirationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  expirationDate: { type: String, required: true }, // formato esperado: YYYY-MM-DD
  notify30DaysBefore: { type: Boolean, default: false },
  notify90DaysBefore: { type: Boolean, default: false },
  assignedTo: [{
    type: String,
    required: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Expiration', expirationSchema);
 */

const mongoose = require('mongoose');

const expirationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  expirationDate: { type: String, required: true },
  expirationTime: { type: String, default: '10:00' },
  reminders: {
    onExpiration: { type: Boolean, default: true },
    tenDaysBefore: { type: Boolean, default: true },
    customDaysBefore: { type: Number, default: null, min: 1, max: 365 }
  },
  sentReminders: [{
    type: { type: String, enum: ['onExpiration', 'tenDaysBefore', 'custom'] },
    sentAt: { type: Date, default: Date.now },
    channel: { type: String, enum: ['telegram', 'email', 'both'] },
    recipients: [String]
  }],
  assignedTo: [{
    type: String,
    required: true,
    default: function() { return this.user?.username || ''; }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Expiration', expirationSchema);
