const express = require('express');

const { authRequired } = require('../middlewares/validateToken.js');

const { getTasks, getTask, createTask, updateTask, deleteTask } = require ('../controllers/task.controller.js');

const { validateSchema } = require('../middlewares/validator.middleware.js'); //Funcion de validacion con schemas

const { createTaskSchema } = require('../schemas/task.schema.js'); //schemas para validar

const router = express.Router();

//CRUD
//Obtener varias tareas.
router.get('/tasks', authRequired, getTasks);
//Obtener una tarea.
router.get('/task/:id', authRequired, getTask); // Voy a recibir params desde el front (id).
//Crear una tarea
router.post('/task', authRequired, validateSchema(createTaskSchema), createTask); //Aca validamos la autenticación y tambien el schema.
//Eliminar una tarea
router.delete('/task/:id', authRequired, deleteTask); // Voy a recibir params desde el front (id)
//Modificar una tarea parcial.
router.put('/task/:id', authRequired, updateTask); // Voy a recibir params desde el front (id)
// Modificar la tarea completa.
router.patch('/task/:id', authRequired, updateTask); // Voy a recibir params desde el front (id)

module.exports = router;