import { api } from "./services/api";
import { MeasureBatch } from "./types";

async function testBatch() {
  const batch: MeasureBatch[] = [
    { type: 'heart', value: '75', source: 'ring' },
    { type: 'spo2', value: '98', source: 'ring' },
    { type: 'hrv', value: '65', source: 'estimated', confidence: 0.7 },
    { type: 'pressure', value: '120/80', source: 'ring' }
  ];

  const result = await api.saveBatchMeasures(batch);
  console.log('Batch result:', result);
}

testBatch();