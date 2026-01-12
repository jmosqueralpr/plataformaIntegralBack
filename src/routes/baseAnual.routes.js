const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const { blockGuest } = require('../middlewares/guest.middleware.js');
const { validateSchema } = require('../middlewares/validator.middleware.js');
const { createBaseAnualSchema } = require('../schemas/baseAnual.schema.js');

const {
  getBaseAnualByBase,
  createBaseAnual,
  updateBaseAnual,
  deleteBaseAnual
} = require('../controllers/baseAnual.controller.js');

const router = express.Router();

router.get('/base-anual/:baseId', authRequired, getBaseAnualByBase);
router.post('/base-anual', authRequired, blockGuest, validateSchema(createBaseAnualSchema), createBaseAnual);
router.put('/base-anual/:id', authRequired, blockGuest, updateBaseAnual);
router.patch('/base-anual/:id', authRequired, blockGuest, updateBaseAnual);
router.delete('/base-anual/:id', authRequired, blockGuest, deleteBaseAnual);

module.exports = router;


/* Prueba de la base de datos

Primero hay que loguearse:

Crear un registro anual:

post a localhost:3000/api/base-anual

{
  "base_id": "ID_DE_LA_BASE",
  "anio": 2025,
  "elementos_entregados": "- Antena VHF\n- Cable coaxial",
  "tareas_a_realizar": "- Ajustar potencia TX\n- Revisar conectores",
  "elementos_proxima_campania": "- Fuente 12V\n- Repuesto GPS",
  "tareas_proxima_campania": "- Cambio de antena secundaria",
  "nombre_contacto": "Carlos Gómez",
  "tel_contacto": "+54 9 11 3333-2222"
}

Obtener todos los registros:

get a localhost:3000/api/base-anual/ID_DE_LA_BASE

*/