const express = require('express');
const { register, login, changeEmail, changePassword, logout, profile, findUsers } = require('../controllers/auth.controller.js');
const { authRequired } = require('../middlewares/validateToken.js');
const router = express.Router(); //Con este router puedo crear las peticines.
const { validateSchema } = require('../middlewares/validator.middleware.js'); //Funcion de validacion con schemas
const { registerSchema, loginSchema, changeEmailSchema, changePasswordSchema } = require('../schemas/auth.schema.js'); //schemas para validar


//NOTA: SI YO ENVÍO CUALQUIER PETICION, SE ENVÍA EL HEADER CON EL TOKEN, SI ES QUE ME LOGUIE ANTES.

router.post('/register', validateSchema(registerSchema), register ); //Primero valida el registro contra el schema.

router.post('/login', validateSchema(loginSchema), login ); //Valido el login contre el schema.

router.put('/change-email', authRequired, validateSchema(changeEmailSchema), changeEmail); //Cambio de password

router.put('/change-password', authRequired, validateSchema(changePasswordSchema), changePassword); //Cambio de password

router.post('/logout', logout );

router.get('/profile', authRequired, profile ); //Primero paso por el middleware validateToken.

router.get('/find-users', authRequired, findUsers); 

module.exports = router;