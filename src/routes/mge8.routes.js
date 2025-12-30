const express = require('express');
const router = express.Router();
const AisDecode  = require ("ggencoder").AisDecode; // 🔜 se usará luego

/**
 * 🔜 FUTURO:
 * - Parsear multipart AIVDM
 * - Decodificar con AisDecode
 * - Filtrar DAC/FI MGE8
 */
function decodeMGE8Lines(lines) {
  console.log('🧠 decodeMGE8Lines() llamado con líneas:');
  console.log(lines);

  // 🚧 MOCK TEMPORAL
  // Esta función en el futuro devuelve datos reales
  return {
    "123456789": [
      {
        windDirection: 270,
        windSpeed: 12.4,
        longitude: -58.3816,
        latitude: -34.6037
      },
      {
        windDirection: 265,
        windSpeed: 11.9,
        longitude: -58.3820,
        latitude: -34.6039
      },
      {
        windDirection: 280,
        windSpeed: 13.1,
        longitude: -58.3805,
        latitude: -34.6042
      }
    ]
  };
}

router.post('/decode-mge8', async (req, res) => {
  try {
    // 1️⃣ Leer input
    const { lines } = req.body;

    console.log('📥 Request /decode-mge8');

    /* Prueba de decodificación con valor simulado */

    const aux = '!AIVDM,1,1,1,B,8>h8nkP0Glr=<hFI0D6??wvlFR06EuOwgwl?wnSwe7wvlOw?sAwwnSGmwvh0,0*17';

    const decMsg = new AisDecode (aux);
    if (decMsg.valid) console.log ('%j', decMsg);
    console.log("el mensaje decodificado");
    console.log(decMsg);

    
    /* Fin de prueba de decodificación con valor simulado */

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        error: 'Input inválido: se esperaba un array de líneas AIS'
      });
    }

    // 2️⃣ Decodificar (mock hoy, real mañana)
    const decoded = decodeMGE8Lines(lines);

    // 3️⃣ Responder
    res.json(decoded);

  } catch (err) {
    console.error('❌ ERROR EN decode-mge8:', err);
    res.status(500).json({
      error: 'Error interno en decodificación AIS'
    });
  }
});

module.exports = router;
