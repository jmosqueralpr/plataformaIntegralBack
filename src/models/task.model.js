const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },

  notifyAssignedDate: { type: String }, // formato esperado: 'YYYY-MM-DD'
  notifyAssignedTime: { type: String }, // formato esperado: 'HH:mm'

  sendWhatsAppOwner: { type: Boolean, default: false },
  sendWhatsAppAssignedTo: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['No iniciada', 'En proceso', 'Finalizada'],
    default: 'No iniciada'
  },
  importance: {
    type: String,
    enum: ['Baja', 'Media', 'Alta', 'Urgente'],
    default: 'Media'
  },

  assignedTo: [{
    type: String,
    required: true
  }],
  creator: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);




/* const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    } ,
    user: {
        type: mongoose.Schema.Types.ObjectId, //Para guardar la id del dueño de la tarea.
        ref: 'User', //Hace referencia al modelo User.
        required: true
    }

}, {
    timestamps: true //Para guardar cuando se creó
});

module.exports = mongoose.model('Task', taskSchema); //Exporto el model Task que responde al taskSchema que acabo de crear. */