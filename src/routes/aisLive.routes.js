const express = require('express');
const { authRequired } = require('../middlewares/validateToken');
const {
  connectAisFeed,
  disconnectAisFeed,
  getAisLiveSnapshot,
} = require('../utils/aisLiveFeed');

const router = express.Router();

router.get('/ais/live', authRequired, (req, res) => {
  res.json(getAisLiveSnapshot());
});

router.post('/ais/connect', authRequired, (req, res) => {
  res.json(connectAisFeed());
});

router.post('/ais/disconnect', authRequired, (req, res) => {
  res.json(disconnectAisFeed());
});

module.exports = router;
