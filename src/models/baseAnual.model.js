/* Datos de Año a año de las baseses */

const mongoose = require('mongoose');

const a_enviarSchema = {
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  cantidad: {
    type: Number,
    default: 1,
    min: 1
  },
  preparado: {
    type: Boolean,
    default: false
  }
};

const baseAnualSchema = new mongoose.Schema({
  base_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  anio: {
    type: Number,
    required: true
  },

  necesidades_campania: {
    type: String
  },
  a_enviar: {
    type: [a_enviarSchema],
    default: []
  },
  enviado: {
    type: Boolean,
    default: false
  },
  tareas_ejecutadas: {
    type: String
  },
  tareas_pendientes: {
    type: String
  },

  elementos_entregados: {
    type: String
  },
  tareas_a_realizar: {
    type: String
  },
  elementos_proxima_campania: {
    type: String
  },
  tareas_proxima_campania: {
    type: String
  },

  nombre_contacto: {
    type: String
  },
  tel_contacto: {
    type: String
  }
}, {
  timestamps: true
});

baseAnualSchema.index(
  { base_id: 1, anio: 1 },
  { unique: true }
);

module.exports = mongoose.model('BaseAnual', baseAnualSchema);
