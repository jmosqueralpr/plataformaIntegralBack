// src/utils/tcpMonitor.js
const net = require('net');

const INACTIVITY_TIMEOUT = 60000; // 60 segundos

// Estados por estación
const stations = new Map();

const connectToSerialServer = (stationName, ip, port) => {
  if (stations.has(stationName)) {
    return; // Ya está conectada
  }

  const state = {
    isConnected: false,
    isReceivingData: false,
    lastDataTimestamp: null,
  };

  const client = new net.Socket();

  client.connect(port, ip, () => {
    console.log(`✅ Conectado a ${stationName} (${ip}:${port})`);
    state.isConnected = true;
  });

  client.on('data', (data) => {
    state.lastDataTimestamp = Date.now();
    if (!state.isReceivingData) {
      console.log(`📡 [${stationName}] Se reanudó la recepción de datos.`);
    }
    state.isReceivingData = true;
    /* Esto es para mandar mensajes en console.log */
    /* console.log(`📥 [${stationName}] Datos:`, data.toString()); */
  });

  client.on('error', (err) => {
    console.error(`❌ [${stationName}] Error de conexión:`, err.message);
    state.isConnected = false;
    state.isReceivingData = false;
  });

  client.on('close', () => {
    console.log(`🔌 [${stationName}] Conexión cerrada`);
    state.isConnected = false;
    state.isReceivingData = false;
    stations.delete(stationName);
    setTimeout(() => connectToSerialServer(stationName, ip, port), 10000);
  });

  setInterval(() => {
    if (state.isConnected && state.lastDataTimestamp) {
      const now = Date.now();
      if (now - state.lastDataTimestamp > INACTIVITY_TIMEOUT) {
        if (state.isReceivingData) {
          console.warn(`⚠️ [${stationName}] Inactividad por más de 60 segundos`);
        }
        state.isReceivingData = false;
      }
    }
  }, 2000);

  stations.set(stationName, state );
};

const getStatus = (stationName) => {
  const entry = stations.get(stationName);
  if (!entry) {
    return { connected: false, receivingData: false, lastDataTimestamp: null };
  }
  return { connected: entry.isConnected, receivingData: entry.isReceivingData, lastDataTimestamp: entry.lastDataTimestamp };
};

module.exports = { connectToSerialServer, getStatus };
