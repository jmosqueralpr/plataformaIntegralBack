/* Model de Eventos que ocurrieron en las bases */

const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  base_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },

  fecha_evento: {
    type: Date,
    required: true
  },
  fecha_resolucion: {
    type: Date
  },

  titulo_evento: {
    type: String,
    required: true
  },
  descripcion_evento: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Evento', eventoSchema);
