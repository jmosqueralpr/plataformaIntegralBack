const net = require('net');
const { AisDecode } = require('ggencoder');

const MAX_EVENTS = 200;
const MAX_TARGETS = 3000;
const RECONNECT_DELAY = 5000;
const AIS_POSITION_TYPES = new Set([1, 2, 3, 18, 19]);

const finite = (value) => (Number.isFinite(value) ? value : null);
const validPosition = (latitude, longitude) => (
  Number.isFinite(latitude)
  && Number.isFinite(longitude)
  && latitude >= -90
  && latitude <= 90
  && longitude >= -180
  && longitude <= 180
);

const hasValidChecksum = (line) => {
  const checksumIndex = line.lastIndexOf('*');
  if (checksumIndex < 0 || !/^[\da-f]{2}$/i.test(line.slice(checksumIndex + 1))) return false;
  let checksum = 0;
  for (let index = 1; index < checksumIndex; index += 1) checksum ^= line.charCodeAt(index);
  return checksum.toString(16).padStart(2, '0').toUpperCase() === line.slice(checksumIndex + 1).toUpperCase();
};

const setSequenceId = (line, sequenceId) => {
  if (!hasValidChecksum(line)) return null;
  const fields = line.slice(0, line.lastIndexOf('*')).split(',');
  fields[3] = sequenceId;
  const body = fields.join(',');
  let checksum = 0;
  for (let index = 1; index < body.length; index += 1) checksum ^= body.charCodeAt(index);
  return `${body}*${checksum.toString(16).padStart(2, '0').toUpperCase()}`;
};

const decodeFi31 = (decoded, offset = 0) => {
  const get = (start, length, signed = false) => decoded.GetInt(start + offset, length, signed);
  const wind = get(122, 7);
  const gust = get(129, 7);
  const direction = get(136, 9);
  const gustDirection = get(145, 9);
  const temperature = get(154, 11, true);
  const humidity = get(165, 7);
  const dewPoint = get(172, 10, true);
  const pressure = get(182, 9);
  const visibility = get(194, 7);
  const waterLevel = get(201, 12);
  const currentSpeed = get(215, 8);
  const currentDirection = get(223, 9);
  const waveHeight = get(276, 8);
  const wavePeriod = get(284, 6);
  const waveDirection = get(290, 9);
  const swellHeight = get(299, 8);
  const swellPeriod = get(307, 6);
  const swellDirection = get(313, 9);
  const seaState = get(322, 4);
  const waterTemperature = get(326, 10, true);
  const precipitation = get(336, 3);
  const salinity = get(339, 9);
  const ice = get(348, 2);

  return {
    latitude: get(81, 24, true) / 60000,
    longitude: get(56, 25, true) / 60000,
    day: get(106, 5),
    hour: get(111, 5),
    minute: get(116, 6),
    averageWindSpeed: wind < 127 ? wind : null,
    windGust: gust < 127 ? gust : null,
    windDirection: direction < 360 ? direction : null,
    gustDirection: gustDirection < 360 ? gustDirection : null,
    airTemperature: temperature > -601 && temperature < 601 ? temperature / 10 : null,
    relativeHumidity: humidity < 101 ? humidity : null,
    dewPoint: dewPoint > -201 && dewPoint < 501 ? dewPoint / 10 : null,
    airPressure: pressure < 401 ? pressure + 799 : null,
    pressureTrend: get(191, 2) < 3 ? get(191, 2) : null,
    visibility: visibility < 127 ? visibility / 10 : null,
    waterLevel: waterLevel < 4001 ? (waterLevel - 1000) / 100 : null,
    surfaceCurrentSpeed: currentSpeed < 252 ? currentSpeed / 10 : null,
    surfaceCurrentDirection: currentDirection < 360 ? currentDirection : null,
    significantWaveHeight: waveHeight < 252 ? waveHeight / 10 : null,
    wavePeriod: wavePeriod < 61 ? wavePeriod : null,
    waveDirection: waveDirection < 360 ? waveDirection : null,
    swellHeight: swellHeight < 252 ? swellHeight / 10 : null,
    swellPeriod: swellPeriod < 61 ? swellPeriod : null,
    swellDirection: swellDirection < 360 ? swellDirection : null,
    seaState: seaState < 13 ? seaState : null,
    waterTemperature: waterTemperature > -101 && waterTemperature < 501 ? waterTemperature / 10 : null,
    precipitation: precipitation < 7 ? precipitation : null,
    salinity: salinity < 502 ? salinity / 10 : null,
    ice: ice < 2 ? ice : null,
  };
};

const createFeedProcessor = (sourceName) => {
  const targets = new Map();
  const messages = [];
  const sessions = new Map();
  const unsequencedByChannel = new Map();
  let anonymousSequence = 0;
  let totalMessages = 0;
  let lastReceivedAt = null;

  const recordTarget = (decoded, kind) => {
    const latitude = finite(decoded.lat);
    const longitude = finite(decoded.lon);
    const mmsi = String(decoded.mmsi || '');
    if (!mmsi || (!validPosition(latitude, longitude) && !targets.has(`${kind}:${mmsi}`))) return;

    const key = `${kind}:${mmsi}`;
    const target = targets.get(key) || { kind, mmsi };
    if (validPosition(latitude, longitude)) {
      target.latitude = latitude;
      target.longitude = longitude;
    }
    if (decoded.shipname) target.name = String(decoded.shipname).trim();
    if (kind === 'aton' && Number.isFinite(decoded.aidtype)) target.aidType = decoded.aidtype;
    target.updatedAt = lastReceivedAt;
    targets.delete(key);
    targets.set(key, target);
    if (targets.size > MAX_TARGETS) targets.delete(targets.keys().next().value);
  };

  const recordMessage = (decoded, rawSentences) => {
    const type = decoded.aistype;
    const message = {
      id: `${Date.now()}-${totalMessages}`,
      type,
      mmsi: String(decoded.mmsi || ''),
      source: sourceName,
      receivedAt: lastReceivedAt,
      rawSentences,
    };

    if (type === 6) {
      message.destinationMmsi = String(decoded.GetInt(40, 30)).padStart(9, '0');
      message.dac = decoded.GetInt(72, 10);
      message.fi = decoded.GetInt(82, 6);
      if (message.dac === 1 && message.fi === 31) {
        message.fi31 = decodeFi31(decoded, 32);
      }
    } else {
      message.dac = finite(decoded.dac);
      message.fi = finite(decoded.fid);
      if (type === 8 && message.dac === 1 && message.fi === 31) {
        message.fi31 = {
          latitude: finite(decoded.lat),
          longitude: finite(decoded.lon),
          day: finite(decoded.utcday),
          hour: finite(decoded.utchour),
          minute: finite(decoded.utcminute),
          averageWindSpeed: finite(decoded.avgwindspd),
          windGust: finite(decoded.windgust),
          windDirection: finite(decoded.winddir),
          gustDirection: finite(decoded.windgustdir),
          airTemperature: finite(decoded.airtemp),
          relativeHumidity: finite(decoded.relhumid),
          dewPoint: finite(decoded.dewpoint),
          airPressure: finite(decoded.airpress),
          pressureTrend: finite(decoded.airpressten),
          visibility: finite(decoded.horvisib),
          waterLevel: finite(decoded.waterlevel),
          surfaceCurrentSpeed: finite(decoded.surfcurrspd),
          surfaceCurrentDirection: finite(decoded.surfcurrdir),
          significantWaveHeight: finite(decoded.signwavewhgt),
          wavePeriod: finite(decoded.waveperiod),
          waveDirection: finite(decoded.wavedir),
          swellHeight: finite(decoded.swellhgt),
          swellPeriod: finite(decoded.swellperiod),
          swellDirection: finite(decoded.swelldir),
          seaState: finite(decoded.seastate),
          waterTemperature: finite(decoded.watertemp),
          precipitation: finite(decoded.precipitation),
          salinity: finite(decoded.salinity),
          ice: finite(decoded.ice),
        };
      }
    }

    messages.unshift(message);
    if (messages.length > MAX_EVENTS) messages.length = MAX_EVENTS;
    totalMessages += 1;
  };

  const pushLine = (rawLine) => {
    const line = String(rawLine || '').trim();
    if (!line.startsWith('!AIVDM,') && !line.startsWith('!AIVDO,')) return;
    if (!hasValidChecksum(line)) return;
    lastReceivedAt = new Date().toISOString();

    const fields = line.split(',');
    const fragmentCount = Number(fields[1]);
    const fragmentNumber = Number(fields[2]);
    const formatter = fields[0];
    const channel = fields[4];
    const sequenceId = fields[3];
    const channelKey = `${formatter}|${channel}`;
    let session;
    let sessionKey;
    let decoderSequenceId = sequenceId;
    let decoderLine = line;
    let rawSentences = [line];

    if (fragmentCount > 1) {
      if (fragmentNumber === 1) {
        sessionKey = sequenceId
          ? `${channelKey}|${sequenceId}`
          : `${channelKey}|anonymous-${++anonymousSequence}`;
        session = {};
        decoderSequenceId = sequenceId || '1';
        sessions.set(sessionKey, { session, rawSentences: [line], decoderSequenceId });
        if (!sequenceId) unsequencedByChannel.set(channelKey, sessionKey);
      } else {
        sessionKey = sequenceId
          ? `${channelKey}|${sequenceId}`
          : unsequencedByChannel.get(channelKey);
        const pending = sessions.get(sessionKey);
        if (!pending) return;
        session = pending.session;
        decoderSequenceId = pending.decoderSequenceId;
        pending.rawSentences.push(line);
        rawSentences = pending.rawSentences;
      }
      if (!sequenceId) {
        decoderLine = setSequenceId(line, decoderSequenceId);
        if (!decoderLine) return;
      }
    }

    try {
      const decoded = new AisDecode(decoderLine, session);
      if (fragmentCount > 1 && fragmentNumber === fragmentCount) {
        sessions.delete(sessionKey);
        if (!sequenceId && unsequencedByChannel.get(channelKey) === sessionKey) {
          unsequencedByChannel.delete(channelKey);
        }
      }
      if (!Number.isInteger(decoded.aistype)) return;

      if (AIS_POSITION_TYPES.has(decoded.aistype) && validPosition(decoded.lat, decoded.lon)) {
        recordTarget(decoded, 'vessel');
      } else if (decoded.aistype === 21) {
        recordTarget(decoded, 'aton');
      } else if (decoded.aistype === 5 || decoded.aistype === 24) {
        recordTarget(decoded, 'vessel');
      }

      if ([6, 8, 21].includes(decoded.aistype)) {
        recordMessage(decoded, [...rawSentences]);
      }
    } catch (error) {
      if (sessionKey) sessions.delete(sessionKey);
      console.error('No se pudo decodificar una trama AIS:', error.message);
    }
  };

  return {
    pushLine,
    snapshot: () => ({
      source: sourceName,
      totalMessages,
      lastReceivedAt,
      targets: [...targets.values()],
      messages: [...messages],
    }),
  };
};

const AIS_SOURCE_NAME = 'AIS principal';
const DEFAULT_AIS_SOURCE_HOST = '190.210.40.127';
const DEFAULT_AIS_SOURCE_PORT = 3069;
let currentAisHost = DEFAULT_AIS_SOURCE_HOST;
let currentAisPort = DEFAULT_AIS_SOURCE_PORT;
const processor = createFeedProcessor(AIS_SOURCE_NAME);
const connectionState = {
  status: 'disconnected',
  error: null,
};
let connectionRequested = false;
let activeClient = null;
let reconnectTimer = null;

const connect = () => {
  if (!connectionRequested) return;
  connectionState.status = 'connecting';
  connectionState.error = null;
  let buffer = '';
  const client = net.createConnection({ host: currentAisHost, port: currentAisPort });
  activeClient = client;

  client.on('connect', () => {
    if (activeClient !== client || !connectionRequested) return;
    connectionState.status = 'connected';
    console.log(`Conectado a la fuente AIS ${AIS_SOURCE_NAME} (${currentAisHost}:${currentAisPort}).`);
  });

  client.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    if (buffer.length > 65536 && !buffer.includes('\n')) {
      buffer = buffer.slice(-4096);
    }
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(processor.pushLine);
  });

  client.on('error', (error) => {
    if (activeClient !== client || !connectionRequested) return;
    connectionState.status = 'error';
    connectionState.error = 'No se pudo conectar a la fuente AIS.';
    console.error(`Error de conexión AIS (${currentAisHost}:${currentAisPort}):`, error.message);
  });

  client.on('close', () => {
    if (activeClient === client) activeClient = null;
    if (!connectionRequested) {
      connectionState.status = 'disconnected';
      return;
    }
    connectionState.status = 'reconnecting';
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  });
};

const connectAisFeed = (host, port) => {
  if (!connectionRequested) {
    connectionRequested = true;
    if (host) currentAisHost = String(host);
    if (port) currentAisPort = Number(port);
    connect();
  }
  return getAisLiveSnapshot();
};

const disconnectAisFeed = () => {
  connectionRequested = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const client = activeClient;
  activeClient = null;
  if (client) client.destroy();
  connectionState.status = 'disconnected';
  connectionState.error = null;
  return getAisLiveSnapshot();
};

const getAisLiveSnapshot = () => ({
  ...connectionState,
  sourceAddress: `${currentAisHost}:${currentAisPort}`,
  ...processor.snapshot(),
});

module.exports = {
  connectAisFeed,
  createFeedProcessor,
  disconnectAisFeed,
  getAisLiveSnapshot,
};
