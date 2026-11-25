const express = require('express');
const { authRequired } = require('../middlewares/validateToken');
const {
  createSource,
  getAllSources,
  removeSource,
  connectSource,
  disconnectSource,
  getSourceSnapshot,
  getAggregatedSnapshot,
} = require('../utils/multiAisFeed');

const router = express.Router();

// Listar todas las fuentes con su estado
router.get('/ais/sources', authRequired, (req, res) => {
  res.json(getAllSources());
});

// Crear una nueva fuente AIS (cliente TCP, servidor TCP o servidor UDP)
router.post('/ais/sources', authRequired, (req, res) => {
  const { name, mode, host, port } = req.body || {};

  if (!mode || !['tcp-client', 'tcp-server', 'udp-server'].includes(mode)) {
    return res.status(400).json({ error: 'Modo invalido. Use tcp-client, tcp-server o udp-server.' });
  }

  const sourceId = createSource({ name, mode, host, port });
  const state = getSourceSnapshot(sourceId);
  res.status(201).json(state);
});

// Obtener snapshot de una fuente especifica
router.get('/ais/sources/:sourceId', authRequired, (req, res) => {
  const { sourceId } = req.params;
  const state = getSourceSnapshot(sourceId);
  if (!state) return res.status(404).json({ error: 'Fuente no encontrada' });
  res.json(state);
});

// Conectar a una fuente especifica
router.post('/ais/sources/:sourceId/connect', authRequired, (req, res) => {
  const { sourceId } = req.params;
  const result = connectSource(sourceId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result.snapshot);
});

// Desconectar una fuente especifica
router.post('/ais/sources/:sourceId/disconnect', authRequired, (req, res) => {
  const { sourceId } = req.params;
  const result = disconnectSource(sourceId);
  res.json(result.snapshot);
});

// Eliminar una fuente
router.delete('/ais/sources/:sourceId', authRequired, (req, res) => {
  const { sourceId } = req.params;
  const removed = removeSource(sourceId);
  if (!removed) return res.status(404).json({ error: 'Fuente no encontrada' });
  res.json({ success: true });
});

// Snapshot agregado de todas las fuentes (compatibilidad con frontend actual)
router.get('/ais/live', authRequired, (req, res) => {
  res.json(getAggregatedSnapshot());
});

// Mantener rutas legacy de conectar/desconectar para la fuente principal
router.post('/ais/connect', authRequired, (req, res) => {
  const { host, port } = req.body || {};
  // Buscar o crear la fuente principal por defecto
  const existing = getAllSources().find((s) => s.mode === 'tcp-client' && s.host === (host || '190.210.40.127') && s.port == (port || 3069));
  if (existing) {
    const result = connectSource(existing.sourceId);
    res.json(result.snapshot);
  } else {
    const sourceId = createSource({ name: 'AIS principal', mode: 'tcp-client', host: host || '190.210.40.127', port: port || 3069 });
    const result = connectSource(sourceId);
    res.json(result.snapshot);
  }
});

router.post('/ais/disconnect', authRequired, (req, res) => {
  const sources = getAllSources();
  if (sources.length === 0) return res.json({ status: 'disconnected', targets: [], messages: [], totalMessages: 0 });
  // Desconectar la primera fuente encontrada (compatibilidad legacy)
  const result = disconnectSource(sources[0].sourceId);
  res.json(result.snapshot);
});

module.exports = router;
