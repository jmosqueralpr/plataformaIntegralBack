const express = require('express');
const router = express.Router();
const { authRequired } = require('../middlewares/validateToken');
const { telegramURLResponse } = require('../controllers/telegram.controller');

/* Esto es para mandar mensajes desde la web a tegram, no es necesario para el funcionamiento normal */
router.post('/send-telegram-message', authRequired, telegramURLResponse); 

module.exports = router;