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
