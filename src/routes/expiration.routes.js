const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const {
  getExpirations,
  getExpiration,
  createExpiration,
  updateExpiration,
  deleteExpiration
} = require('../controllers/expiration.controller.js');

const { validateSchema } = require('../middlewares/validator.middleware.js');
const { createExpirationSchema } = require('../schemas/expiration.schema.js');

const router = express.Router();

router.get('/expirations', authRequired, getExpirations);
router.get('/expiration/:id', authRequired, getExpiration);
router.post('/expiration', authRequired, validateSchema(createExpirationSchema), createExpiration);
router.delete('/expiration/:id', authRequired, deleteExpiration);
router.put('/expiration/:id', authRequired, updateExpiration);
router.patch('/expiration/:id', authRequired, updateExpiration);

module.exports = router;
