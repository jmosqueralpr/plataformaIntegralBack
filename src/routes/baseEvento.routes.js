const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const { blockGuest } = require('../middlewares/guest.middleware.js');
const { validateSchema } = require('../middlewares/validator.middleware.js');
const { createEventoSchema } = require('../schemas/baseEvento.schema.js');

const {
  getEventosByBase,
  createEvento,
  updateEvento,
  deleteEvento
} = require('../controllers/baseEvento.controller.js');

const router = express.Router();

router.get('/eventos/:baseId', authRequired, getEventosByBase);
router.post('/evento', authRequired, blockGuest, validateSchema(createEventoSchema), createEvento);
router.put('/evento/:id', authRequired, blockGuest, updateEvento);
router.patch('/evento/:id', authRequired, blockGuest, updateEvento);
router.delete('/evento/:id', authRequired, blockGuest, deleteEvento);

module.exports = router;

/* 

Prueba en la creación de Eventos para una base

Post a http://localhost:55000/api/evento

ID de Base de Prueba: "69666fa2cb7124f0a0733166"

{
  "base_id": "69666fa2cb7124f0a0733166",
  "fecha_evento": "2025-01-10T14:30:00.000Z",
  "titulo_evento": "Pérdida intermitente de señal AIS",
  "descripcion_evento": "Se detectan cortes en recepción durante tormentas de nieve"
}



*/