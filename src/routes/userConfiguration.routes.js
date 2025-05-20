const express = require('express');

const { authRequired } = require('../middlewares/validateToken.js');

const { createUserConfiguration, getUserConfiguration } = require ('../controllers/userConfiguration.controller.js');

//const { validateSchema } = require('../middlewares/validator.middleware.js'); //Funcion de validacion con schemas

//const { createTaskSchema } = require('../schemas/task.schema.js'); //schemas para validar

const router = express.Router();

//CRUD
//Obtener la configuración de usuario.
router.get('/userConfiguration', authRequired, getUserConfiguration);
//Obtener una tarea.
//router.get('/task/:id', authRequired, getTask); // Voy a recibir params desde el front (id).
//Crear una tarea
router.post('/userConfiguration', authRequired, createUserConfiguration); //Creamos la configuración del usuario.
//Eliminar una tarea
//router.delete('/task/:id', authRequired, deleteTask); // Voy a recibir params desde el front (id)
//Modificar una tarea
//router.put('/task/:id', authRequired, updateTask); // Voy a recibir params desde el front (id)

module.exports = router;