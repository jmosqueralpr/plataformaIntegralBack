const AisDecode = require('ggencoder').AisDecode;

const isAisSentence = (line) => line.startsWith('!AIVDM,') || line.startsWith('!AIVDO,');

const validateChecksum = (line, checksumIndex, expectedChecksum) => {
  let checksum = 0;
  for (let index = 1; index < checksumIndex; index += 1) {
    checksum ^= line.charCodeAt(index);
  }
  return checksum.toString(16).padStart(2, '0').toUpperCase() === expectedChecksum.toUpperCase();
};

const parseSentence = (rawLine) => {
  const line = String(rawLine || '').trim();
  if (!isAisSentence(line)) return null;

  const checksumIndex = line.lastIndexOf('*');
  if (checksumIndex < 0) return { invalid: true };

  const expectedChecksum = line.slice(checksumIndex + 1).trim();
  if (!/^[\da-f]{2}$/i.test(expectedChecksum) || !validateChecksum(line, checksumIndex, expectedChecksum)) {
    return { invalid: true };
  }

  const fields = line.slice(0, checksumIndex).split(',');
  if (fields.length !== 7) return { invalid: true };

  const fragmentCount = Number(fields[1]);
  const fragmentNumber = Number(fields[2]);
  const fillBits = Number(fields[6]);
  if (
    !Number.isInteger(fragmentCount)
    || !Number.isInteger(fragmentNumber)
    || fragmentCount < 1
    || fragmentNumber < 1
    || fragmentNumber > fragmentCount
    || !Number.isInteger(fillBits)
    || fillBits < 0
    || fillBits > 5
    || !fields[5]
  ) {
    return { invalid: true };
  }

  return {
    line,
    formatter: fields[0],
    fragmentCount,
    fragmentNumber,
    sequenceId: fields[3],
    channel: fields[4],
    payload: fields[5],
    fillBits,
  };
};

const payloadMessageType = (payload) => {
  if (!payload) return null;
  let value = payload.charCodeAt(0) - 48;
  if (value > 40) value -= 8;
  return value >= 0 && value <= 63 ? value : null;
};

const checksumForBody = (body) => {
  let checksum = 0;
  for (let index = 1; index < body.length; index += 1) {
    checksum ^= body.charCodeAt(index);
  }
  return checksum.toString(16).padStart(2, '0').toUpperCase();
};

const makeSingleSentence = (state) => {
  const payload = Array.from(
    { length: state.fragmentCount },
    (_, index) => state.parts.get(index + 1).payload
  ).join('');
  const fillBits = state.parts.get(state.fragmentCount).fillBits;
  const body = `${state.formatter},1,1,,${state.channel},${payload},${fillBits}`;
  return `${body}*${checksumForBody(body)}`;
};

const finiteValue = (value) => (Number.isFinite(value) ? value : null);

const getSample = (decoded, rawSentences, sourceLines) => {
  const day = finiteValue(decoded.utcday);
  const hour = finiteValue(decoded.utchour);
  const minute = finiteValue(decoded.utcminute);
  const hasValidTime = day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;

  return {
    decoded: decoded.valid === true,
    dac: finiteValue(decoded.dac),
    fi: finiteValue(decoded.fid),
    longitude: finiteValue(decoded.lon),
    latitude: finiteValue(decoded.lat),
    utcDay: hasValidTime ? day : null,
    utcHour: hasValidTime ? hour : null,
    utcMinute: hasValidTime ? minute : null,
    averageWindSpeed: finiteValue(decoded.avgwindspd),
    windGust: finiteValue(decoded.windgust),
    windDirection: finiteValue(decoded.winddir),
    gustDirection: finiteValue(decoded.windgustdir),
    airTemperature: finiteValue(decoded.airtemp),
    relativeHumidity: finiteValue(decoded.relhumid),
    airPressure: finiteValue(decoded.airpress),
    rawSentences,
    sourceLines,
  };
};

const decodeMGE8Lines = (lines, { includeRawMessages = false } = {}) => {
  const pending = new Map();
  const unsequencedByChannel = new Map();
  const stations = new Map();
  let anonymousSequence = 0;
  let aisSentenceCount = 0;
  let invalidSentenceCount = 0;
  let message8Count = 0;
  let decodedMessageCount = 0;
  let incompleteMessageCount = 0;

  const addDecodedMessage = (decoded, rawSentences, sourceLines, rawEntries) => {
    if (decoded.aistype !== 8 || !decoded.mmsi) return;

    message8Count += 1;
    if (decoded.valid === true) decodedMessageCount += 1;

    const mmsi = String(decoded.mmsi);
    const station = stations.get(mmsi) || {
      mmsi,
      messageCount: 0,
      decodedMessageCount: 0,
      sample: null,
    };
    if (includeRawMessages && !station.rawMessages) station.rawMessages = [];
    station.messageCount += 1;
    if (decoded.valid === true) station.decodedMessageCount += 1;
    if (includeRawMessages) station.rawMessages.push(rawEntries);
    if (!station.sample || (!station.sample.decoded && decoded.valid === true)) {
      station.sample = getSample(decoded, rawSentences, sourceLines);
    }
    stations.set(mmsi, station);
  };

  lines.forEach((rawLine, index) => {
    const sentence = parseSentence(rawLine);
    if (!sentence) return;

    aisSentenceCount += 1;
    if (sentence.invalid) {
      invalidSentenceCount += 1;
      return;
    }

    const streamKey = `${sentence.formatter}|${sentence.channel}`;
    let key = sentence.sequenceId
      ? `${streamKey}|${sentence.sequenceId}`
      : unsequencedByChannel.get(streamKey);

    if (sentence.fragmentCount === 1) {
      if (payloadMessageType(sentence.payload) !== 8) return;

      try {
        const decoded = new AisDecode(sentence.line);
        addDecodedMessage(
          decoded,
          [sentence.line],
          [index + 1],
          [{ line: sentence.line, sourceLine: index + 1 }]
        );
        if (decoded.aistype !== 8) invalidSentenceCount += 1;
      } catch {
        invalidSentenceCount += 1;
      }
      return;
    }

    if (sentence.fragmentNumber === 1) {
      if (payloadMessageType(sentence.payload) !== 8) return;
      if (!key) {
        anonymousSequence += 1;
        key = `${streamKey}|anonymous-${anonymousSequence}`;
        unsequencedByChannel.set(streamKey, key);
      }
      if (pending.has(key)) incompleteMessageCount += 1;

      const state = {
        formatter: sentence.formatter,
        channel: sentence.channel,
        fragmentCount: sentence.fragmentCount,
        parts: new Map([[1, { payload: sentence.payload, fillBits: sentence.fillBits }]]),
        sourceLines: new Map([[1, index + 1]]),
      };
      pending.set(key, state);
      return;
    }

    if (!key || !pending.has(key)) return;
    const state = pending.get(key);
    if (state.fragmentCount !== sentence.fragmentCount || state.parts.has(sentence.fragmentNumber)) {
      pending.delete(key);
      if (unsequencedByChannel.get(streamKey) === key) unsequencedByChannel.delete(streamKey);
      incompleteMessageCount += 1;
      return;
    }

    state.parts.set(sentence.fragmentNumber, { payload: sentence.payload, fillBits: sentence.fillBits });
    state.sourceLines.set(sentence.fragmentNumber, index + 1);
    if (state.parts.size !== state.fragmentCount) return;

    pending.delete(key);
    if (unsequencedByChannel.get(streamKey) === key) unsequencedByChannel.delete(streamKey);

    try {
      const decoded = new AisDecode(makeSingleSentence(state));
      const rawEntries = [...state.parts.keys()]
        .sort((left, right) => left - right)
        .map((part) => {
          const lineIndex = state.sourceLines.get(part) - 1;
          return {
            line: String(lines[lineIndex]).trim(),
            sourceLine: lineIndex + 1,
          };
        });
      const rawSentences = rawEntries.map((entry) => entry.line);
      const sourceLines = [...state.sourceLines.values()].sort((left, right) => left - right);
      addDecodedMessage(decoded, rawSentences, sourceLines, rawEntries);
      if (decoded.aistype !== 8) invalidSentenceCount += 1;
    } catch {
      invalidSentenceCount += 1;
    }
  });

  incompleteMessageCount += pending.size;
  const sortedStations = [...stations.values()].sort((left, right) => left.mmsi.localeCompare(right.mmsi));

  return {
    stats: {
      totalLines: lines.length,
      aisSentenceCount,
      message8Count,
      stationCount: sortedStations.length,
      decodedMessageCount,
      invalidSentenceCount,
      incompleteMessageCount,
    },
    stations: sortedStations,
  };
};

module.exports = { decodeMGE8Lines };
