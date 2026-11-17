const express = require('express');
const router = express.Router();
const { authRequired } = require('../middlewares/validateToken');
const { adminRequired } = require('../middlewares/admin.middleware');
const { blockGuest } = require('../middlewares/guest.middleware');
const {
  telegramURLResponse,
  createTelegramLinkCode,
  getTelegramMessageRecipients
} = require('../controllers/telegram.controller');

router.post('/telegram/link-code', authRequired, blockGuest, createTelegramLinkCode);
router.get('/telegram/message-recipients', authRequired, adminRequired, getTelegramMessageRecipients);
router.post('/send-telegram-message', authRequired, adminRequired, telegramURLResponse);

module.exports = router;