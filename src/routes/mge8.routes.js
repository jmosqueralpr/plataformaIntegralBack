const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { decodeMGE8Lines } = require('./mge8Decoder');

const maxFileSize = 25 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 },
});

const parseUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'El archivo supera el límite de 25 MB.' });
      }
      return res.status(400).json({ message: 'No se pudo leer el archivo TXT.' });
    }

    return next(error);
  });
};

router.post('/decode-mge8', parseUpload, (req, res) => {
  try {
    let lines;
    let fileName = null;

    if (req.file) {
      if (path.extname(req.file.originalname).toLowerCase() !== '.txt') {
        return res.status(400).json({ message: 'El archivo debe tener extensión .txt.' });
      }

      fileName = req.file.originalname;
      const text = req.file.buffer.toString('utf8');
      if (!text.trim()) {
        return res.status(400).json({ message: 'El archivo TXT está vacío.' });
      }
      lines = text.split(/\r?\n/);
    } else if (Array.isArray(req.body?.lines)) {
      lines = req.body.lines;
    } else {
      return res.status(400).json({ message: 'Seleccioná un archivo TXT para analizar.' });
    }

    return res.json({
      fileName,
      ...decodeMGE8Lines(lines),
    });
  } catch (error) {
    console.error('Error al procesar archivo AIS:', error);
    return res.status(500).json({ message: 'No se pudo procesar el archivo AIS.' });
  }
});

router.post('/export-mge8-mmsi', parseUpload, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Seleccioná un archivo TXT para exportar.' });
    }
    if (path.extname(req.file.originalname).toLowerCase() !== '.txt') {
      return res.status(400).json({ message: 'El archivo debe tener extensión .txt.' });
    }

    const text = req.file.buffer.toString('utf8');
    if (!text.trim()) {
      return res.status(400).json({ message: 'El archivo TXT está vacío.' });
    }

    const requestedMmsi = String(req.body?.mmsi || '').trim();
    if (!/^\d{1,9}$/.test(requestedMmsi)) {
      return res.status(400).json({ message: 'El MMSI indicado no es válido.' });
    }
    const mmsi = requestedMmsi.padStart(9, '0');

    const { stations } = decodeMGE8Lines(text.split(/\r?\n/), { includeRawMessages: true });
    const station = stations.find((item) => item.mmsi === mmsi);
    if (!station || station.rawMessages.length === 0) {
      return res.status(404).json({ message: `No se encontraron mensajes Message 8 para el MMSI ${mmsi}.` });
    }

    const receivedLines = station.rawMessages
      .flat()
      .sort((left, right) => left.sourceLine - right.sourceLine)
      .map((entry) => entry.line);

    return res.type('text/plain').send(`${receivedLines.join('\r\n')}\r\n`);
  } catch (error) {
    console.error('Error al exportar mensajes AIS por MMSI:', error);
    return res.status(500).json({ message: 'No se pudieron exportar los mensajes AIS.' });
  }
});

module.exports = router;
