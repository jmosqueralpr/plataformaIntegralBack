const test = require('node:test');
const assert = require('node:assert/strict');
const { AisEncode } = require('ggencoder');
const { createFeedProcessor } = require('./aisLiveFeed');

const encode = (message) => new AisEncode(message).nmea;
const setNmeaSequenceId = (line, sequenceId) => {
  const fields = line.slice(0, line.lastIndexOf('*')).split(',');
  fields[3] = sequenceId;
  const body = fields.join(',');
  let checksum = 0;
  for (let index = 1; index < body.length; index += 1) checksum ^= body.charCodeAt(index);
  return `${body}*${checksum.toString(16).padStart(2, '0').toUpperCase()}`;
};

const encodeMessage6Fi31 = () => {
  const bits = Array(448).fill('0');
  const set = (start, width, value) => {
    const encoded = BigInt.asUintN(width, BigInt(value)).toString(2).padStart(width, '0');
    bits.splice(start, width, ...encoded);
  };
  set(0, 6, 6);
  set(8, 30, 123456789);
  set(40, 30, 987654321);
  set(72, 10, 1);
  set(82, 6, 31);
  set(32 + 56, 25, -3502800);
  set(32 + 81, 24, -2076000);
  set(32 + 106, 5, 1);
  set(32 + 111, 5, 12);
  set(32 + 116, 6, 34);
  set(32 + 122, 7, 3);
  set(32 + 129, 7, 11);
  set(32 + 136, 9, 161);
  set(32 + 154, 11, 273);

  const payload = [];
  for (let index = 0; index < bits.length; index += 6) {
    const value = Number.parseInt(bits.slice(index, index + 6).join(''), 2);
    payload.push(String.fromCharCode(value < 40 ? value + 48 : value + 56));
  }
  const body = `!AIVDM,1,1,,A,${payload.join('')},2`;
  let checksum = 0;
  for (let index = 1; index < body.length; index += 1) checksum ^= body.charCodeAt(index);
  return `${body}*${checksum.toString(16).padStart(2, '0').toUpperCase()}`;
};

test('tracks ship positions and ATONs from NMEA position reports', () => {
  const processor = createFeedProcessor('Prueba');
  const ship = encode({
    aistype: 1,
    mmsi: 205035000,
    navstatus: 0,
    rot: 0,
    sog: 4.2,
    lon: -58.38,
    lat: -34.6,
    cog: 90,
    smi: 0,
  });
  const aton = encode({
    aistype: 21,
    mmsi: 995036009,
    aid_type: 1,
    atonname: 'Faro de prueba',
    accuracy: 1,
    lon: -58.4,
    lat: -34.61,
    dimA: 0,
    dimB: 0,
    dimC: 0,
    dimD: 0,
    off_position: 0,
    raim: 0,
    virtual_aid: 0,
    assigned: 0,
  });

  processor.pushLine(ship);
  processor.pushLine(aton);
  const snapshot = processor.snapshot();

  assert.equal(snapshot.targets.length, 2);
  assert.equal(snapshot.targets.find((target) => target.kind === 'vessel').mmsi, '205035000');
  assert.equal(snapshot.targets.find((target) => target.kind === 'aton').name, 'FARO DE PRUEBA');
  assert.equal(snapshot.messages[0].type, 21);
});

test('reassembles multipart NMEA messages and reports decoded DAC/FI 1/31 data', () => {
  const sequenced = [
    '!AIVDM,2,1,8,A,80006@00GvE9u?0Ug6<DPHe@gdR>EuFBgwl?wnSwe7wvlOwwsAwwnSGmwwh0,0*3D',
    '!AIVDM,2,2,8,A,00,4*1A',
  ];
  const unsequenced = sequenced.map((line) => setNmeaSequenceId(line, ''));

  [sequenced, unsequenced].forEach((sentences) => {
    const processor = createFeedProcessor('Prueba');
    sentences.forEach(processor.pushLine);

    const message = processor.snapshot().messages[0];
    assert.equal(message.type, 8);
    assert.equal(message.dac, 1);
    assert.equal(message.fi, 31);
    assert.equal(message.fi31.averageWindSpeed, 3);
    assert.equal(message.fi31.windGust, 11);
    assert.equal(message.rawSentences.length, 2);
  });
});

test('decodes addressed Message 6 DAC/FI 1/31 fields', () => {
  const processor = createFeedProcessor('Prueba');
  processor.pushLine(encodeMessage6Fi31());

  const message = processor.snapshot().messages[0];
  assert.equal(message.type, 6);
  assert.equal(message.mmsi, '123456789');
  assert.equal(message.destinationMmsi, '987654321');
  assert.equal(message.dac, 1);
  assert.equal(message.fi, 31);
  assert.equal(message.fi31.latitude, -34.6);
  assert.equal(message.fi31.longitude, -58.38);
  assert.equal(message.fi31.averageWindSpeed, 3);
  assert.equal(message.fi31.airTemperature, 27.3);
});
