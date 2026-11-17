

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
  title: { type: String, required: true }, // Título obligatorio
  description: { type: String, required: false },
  expirationDate: { type: String }, // No es obligatorio
  expirationTime: { type: String, default: '10:00' }, // hora local por defecto
  notified: { type: Boolean, default: false },
  notified30DaysBefore: { type: Boolean, default: false },
  notified90DaysBefore: { type: Boolean, default: false },
  notify7DaysBefore: { type: Boolean, default: true },
  notified7DaysBefore: { type: Boolean, default: false },
  notify30DaysBefore: { type: Boolean, default: false },
  notify90DaysBefore: { type: Boolean, default: false },
  assignedTo: [{
    type: String,
    required: true,
    default: function() { return this.user.username; } // Asignar el nombre del usuario automáticamente si no se pasa
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Expiration', expirationSchema);
