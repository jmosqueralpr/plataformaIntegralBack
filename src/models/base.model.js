/* Model de los datos fijos de las bases de AIS */

const mongoose = require('mongoose');

const baseSchema = new mongoose.Schema({
  nombre_base: {
    type: String,
    required: true,
    trim: true
  },
  tipo_base: {
    type: String,
    required: true,
    trim: true
  },
  descripcion_base: {
    type: String
  },

  nombre_comunicante: {
    type: String
  },
  tel_comunicante: {
    type: String
  },

  descripcion_ais_rx: {
    type: String
  },
  descripcion_ais_tx: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Base', baseSchema);
