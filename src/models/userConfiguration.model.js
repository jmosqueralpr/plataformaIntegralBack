/* const mongoose = require('mongoose');

const userConfigurationSchema = new mongoose.Schema({
  
  // Aquí definimos cada página como un campo booleano
  dashboard: { type: Boolean, default: true },  // Todos pueden ver el dashboard por defecto
  settings: { type: Boolean, default: false },
  profile: { type: Boolean, default: true },
  taskManager: { type: Boolean, default: false },
  bitWarden: { type: Boolean, default: true },
  comprasHidrovia: { type: Boolean, default: false },
  comprasEmepa: { type: Boolean, default: false },
  comprasDYB: { type: Boolean, default: true },
  gpsUnitsConverter: { type: Boolean, default: true },
  guiaLinternista: { type: Boolean, default: true },
  downloadGestionar: { type: Boolean, default: true },

  // Añade más páginas según sea necesario
  user: {
    type: mongoose.Schema.Types.ObjectId, //Para guardar la id del dueño de la tarea.
    ref: 'User', //Hace referencia al model User.
    required: true,
    unique: true,
  },
},
{
  timestamps: true //Para guardar cuando se creó.
});

module.exports = mongoose.model('UserConfiguration', userConfigurationSchema); */

const mongoose = require('mongoose');

const userConfigurationSchema = new mongoose.Schema({
  
  dashboard: { access: { type: Boolean, default: true }, order: { type: Number, default: 1 } },
  settings: { access: { type: Boolean, default: false }, order: { type: Number, default: 2 } },
  profile: { access: { type: Boolean, default: true }, order: { type: Number, default: 3 } },
  taskManager: { access: { type: Boolean, default: false }, order: { type: Number, default: 4 } },
  bitWarden: { access: { type: Boolean, default: true }, order: { type: Number, default: 5 } },
  comprasHidrovia: { access: { type: Boolean, default: false }, order: { type: Number, default: 6 } },
  comprasEmepa: { access: { type: Boolean, default: false }, order: { type: Number, default: 7 } },
  comprasDYB: { access: { type: Boolean, default: true }, order: { type: Number, default: 8 } },
  gpsUnitsConverter: { access: { type: Boolean, default: true }, order: { type: Number, default: 9 } },
  guiaLinternista: { access: { type: Boolean, default: true }, order: { type: Number, default: 10 } },
  downloadGestionar: { access: { type: Boolean, default: true }, order: { type: Number, default: 11 } },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('UserConfiguration', userConfigurationSchema);
