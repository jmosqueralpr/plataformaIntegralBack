const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const { blockGuest } = require('../middlewares/guest.middleware.js');
const {
  getExpirations,
  getExpiration,
  createExpiration,
  updateExpiration,
  deleteExpiration,
  getExpirationSummary,
  getNotificationPreferences,
  updateNotificationPreferences
} = require('../controllers/expiration.controller.js');

const { validateSchema } = require('../middlewares/validator.middleware.js');
const { createExpirationSchema } = require('../schemas/expiration.schema.js');

const router = express.Router();

router.get('/expirations', authRequired, getExpirations);
router.get('/expirations/resumen', authRequired, getExpirationSummary);
router.get('/expiration/:id', authRequired, getExpiration);
router.post('/expiration', authRequired, blockGuest, validateSchema(createExpirationSchema), createExpiration);
router.delete('/expiration/:id', authRequired, blockGuest, deleteExpiration);
router.put('/expiration/:id', authRequired, blockGuest, updateExpiration);
router.patch('/expiration/:id', authRequired, blockGuest, updateExpiration);

// Preferencias de notificación
router.get('/users/me/notification-preferences', authRequired, getNotificationPreferences);
router.put('/users/me/notification-preferences', authRequired, updateNotificationPreferences);

module.exports = router;
