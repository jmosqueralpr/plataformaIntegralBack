const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeMGE8Lines } = require('./mge8Decoder');

const mmsi1600Parts = [
  '!AIVDM,2,1,8,A,80006@00GvE9u?0Ug6<DPHe@gdR>EuFBgwl?wnSwe7wvlOwwsAwwnSGmwwh0,0*3D',
  '!AIVDM,2,2,8,A,00,4*1A',
];

const mmsi997011152 = '!AIVDM,1,1,,B,8>nlfl00GvEIO?0`2b<G21Al>pNtLgnD?wl?wnP1PwwvlOwwsAwwnSCuwvh0,0*40';

test('groups received Message 8 data by MMSI and preserves decoded sample values', () => {
  const report = decodeMGE8Lines([...mmsi1600Parts, mmsi997011152]);
  const station = report.stations.find((item) => item.mmsi === '000001600');

  assert.equal(report.stats.message8Count, 2);
  assert.equal(report.stats.stationCount, 2);
  assert.equal(station.messageCount, 1);
  assert.equal(station.sample.dac, 1);
  assert.equal(station.sample.fi, 31);
  assert.equal(station.sample.averageWindSpeed, 3);
  assert.equal(station.sample.windGust, 11);
  assert.equal(station.sample.windDirection, 161);
  assert.equal(station.sample.airTemperature, 27.3);
  assert.deepEqual(station.sample.rawSentences, mmsi1600Parts);
});

test('counts repeated messages for the same MMSI', () => {
  const report = decodeMGE8Lines([...mmsi1600Parts, ...mmsi1600Parts]);
  const station = report.stations.find((item) => item.mmsi === '000001600');

  assert.equal(report.stats.message8Count, 2);
  assert.equal(report.stats.stationCount, 1);
  assert.equal(station.messageCount, 2);
});

test('collects original Message 8 sentences for only the requested MMSI export', () => {
  const report = decodeMGE8Lines(
    [...mmsi1600Parts, mmsi997011152, ...mmsi1600Parts],
    { includeRawMessages: true }
  );
  const station = report.stations.find((item) => item.mmsi === '000001600');

  assert.equal(station.rawMessages.length, 2);
  assert.deepEqual(
    station.rawMessages.flat().map((entry) => entry.line),
    [...mmsi1600Parts, ...mmsi1600Parts]
  );
  assert.ok(station.rawMessages.flat().every((entry) => entry.sourceLine !== 3));
});

test('reports incomplete fragments and rejects invalid checksums', () => {
  const report = decodeMGE8Lines([
    mmsi1600Parts[0],
    mmsi1600Parts[1].replace('*1A', '*00'),
  ]);

  assert.equal(report.stats.message8Count, 0);
  assert.equal(report.stats.invalidSentenceCount, 1);
  assert.equal(report.stats.incompleteMessageCount, 1);
});
