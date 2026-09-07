import { MqttPublisher } from './mqtt/publisher.js';
import { BridgeService } from './services/bridgeService.js';
import { ALL_TAG_IDS } from './tags.js';
import { config } from './config.js';

async function main() {
  console.log('=== Raw Treatment & UF → HiveMQ bridge ===');
  console.log(`[config] systemId=${config.scadaSystemId}`);
  console.log(`[config] cleaned=${config.scadaCleanedUrl}`);
  console.log(`[config] history=${config.historyBaseUrl}`);
  console.log(`[config] prefix=${config.topicPrefix}`);
  console.log(`[config] tags=${ALL_TAG_IDS.length}`);

  const publisher = new MqttPublisher();
  await publisher.connect();
  await publisher.publishOnline(true);

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
  console.error('[main] fatal', err);
  process.exit(1);
});
