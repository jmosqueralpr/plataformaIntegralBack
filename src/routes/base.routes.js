const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const { blockGuest } = require('../middlewares/guest.middleware.js');
const { validateSchema } = require('../middlewares/validator.middleware.js');
const { createBaseSchema } = require('../schemas/base.schema.js');

const {
  getBases,
  getBase,
  createBase,
  updateBase,
  deleteBase
} = require('../controllers/base.controller.js');

const router = express.Router();

// CRUD Bases
router.get('/bases', authRequired, getBases);
router.get('/base/:id', authRequired, getBase);
router.post('/base', authRequired, blockGuest, validateSchema(createBaseSchema), createBase);
router.put('/base/:id', authRequired, blockGuest, updateBase);
router.patch('/base/:id', authRequired, blockGuest, updateBase);
router.delete('/base/:id', authRequired, blockGuest, deleteBase);

module.exports = router;


/* pruebas de la base de datos:

Primero hay que loguearse!

CREAR NUEVA BASE:

post a: localhost:3000/api/base

json: 

{
  "nombre_base": "Base Prueba",
  "tipo_base": "Permanente",
  "descripcion_base": "Base antártica con operación todo el año",
  "nombre_comunicante": "Juan Pérez",
  "tel_comunicante": "+54 11 5555-1234",
  "descripcion_ais_rx": "Receptor AIS VHF con antena omnidireccional",
  "descripcion_ais_tx": "Transmisor AIS Clase A"
}

VER LAS BASES:

get a localhost:3000/api/bases

ELIMINAR UNA BASE

delete a localhost:3000/api/base/ID_de_la_Base

*/