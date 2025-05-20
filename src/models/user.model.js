const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // corregido de "require"
    trim: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['superAdmin', 'admin', 'manager', 'coordinator', 'technician', 'user', 'guest'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  telegramChatId: { /* La id del chat para recibir notificaciones */
    type: String,
    unique: true,
    trim: true,
    default: ''
  },
  telegramId: { /* Para poder hacer login y usar la base de datos */
    type: String,
    unique: true,
    sparse: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);



//SCHEMA MEJORADO:
/* 
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    priority: {
        type: String,
        enum: ['Urgente', 'Alta', 'Media', 'Baja'],
        default: 'Media'
    },
    whatsappNotification: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    dueDate: {
        type: Date,
        required: true
    },
    executionDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pendiente', 'en progreso', 'completada'],
        default: 'pendiente'
    },
    comments: {
        type: String,
        default: ''
    },
    attachments: {
        type: [String], // Array de URLs de archivos adjuntos
        default: []
    }
}, {
    timestamps: true // Para guardar cuándo se creó y se actualizó
});

module.exports = mongoose.model('Task', taskSchema); */

//EJEMPLO DE USO:

/* const Task = require('./models/Task'); // Asumiendo que tu modelo está en models/Task

// Ejemplo de crear una tarea
const newTask = new Task({
    title: "Tarea de ejemplo",
    description: "Descripción de la tarea",
    createdBy: "ObjectIdDelCreador",
    assignedTo: ["ObjectIdUsuario1", "ObjectIdUsuario2"], // Asignando a múltiples usuarios
    dueDate: new Date("2023-12-31"),
    executionDate: new Date("2023-12-01"),
    priority: "Alta",
    whatsappNotification: true
});

newTask.save()
    .then(task => {
        console.log('Tarea creada:', task);
    })
    .catch(error => {
        console.error('Error al crear la tarea:', error);
    });
 */
