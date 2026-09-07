import { MqttPublisher } from './mqtt/publisher.js';
import { BridgeService } from './services/bridgeService.js';
import { ALL_TAG_IDS } from './tags.js';
import { config, topicRealtimeAll, topicOnline, topicHistory } from './config.js';

function assertMqttConfig() {
  if (!config.mqttUrl || config.mqttUrl.includes('xxxxxxxx')) {
    throw new Error(
      'MQTT_URL chưa cấu hình. Sửa BE/.env — ví dụ: mqtts://<cluster>.s1.eu.hivemq.cloud:8883'
    );
  }
}

async function main() {
  assertMqttConfig();

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  console.log('=== Raw Treatment & UF → HiveMQ bridge ===');
  console.log(`[config] systemId=${config.scadaSystemId}`);
  console.log(`[config] cleaned=${config.scadaCleanedUrl}?systemId=${config.scadaSystemId}`);
  console.log(`[config] history=${config.historyBaseUrl}/{month}/{year}`);
  console.log(`[config] mqtt=${config.mqttUrl}`);
  console.log(`[config] prefix=${config.topicPrefix}`);
  console.log(`[config] tags=${ALL_TAG_IDS.length}`);
  console.log(`[config] publish → ${topicRealtimeAll()}`);
  console.log(`[config] publish → ${topicOnline()}`);
  console.log(`[config] publish → ${topicHistory(y, m)}`);

  const publisher = new MqttPublisher();
  await publisher.connect();

  const bridge = new BridgeService(publisher);
  bridge.start();

  const shutdown = async (signal) => {
    console.log(`[main] ${signal} — shutting down`);
    bridge.stop();
    await publisher.end();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[main] fatal', err.message || err);
  process.exit(1);
});
