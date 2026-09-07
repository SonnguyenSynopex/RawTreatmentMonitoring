import { config } from '../config.js';
import { fetchRealtimeTags, fetchHistory } from '../api/scadaClient.js';
import {
  ALL_TAG_IDS,
  buildTagPayload,
  normalizeTagValue,
} from '../tags.js';

export class BridgeService {
  /**
   * @param {import('../mqtt/publisher.js').MqttPublisher} publisher
   */
  constructor(publisher) {
    this.publisher = publisher;
    this.timers = [];
    this.lastRealtimeHash = '';
    this.lastHistoryHash = '';
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    console.log(
      `[bridge] realtime=${config.realtimeIntervalMs}ms history=${config.historyIntervalMs}ms heartbeat=${config.heartbeatIntervalMs}ms`
    );

    this.tickRealtime().catch((e) => console.error('[bridge] realtime init', e.message));
    this.tickHistory().catch((e) => console.error('[bridge] history init', e.message));
    this.tickHeartbeat().catch((e) => console.error('[bridge] heartbeat init', e.message));

    this.timers.push(
      setInterval(() => {
        this.tickRealtime().catch((e) => console.error('[bridge] realtime', e.message));
      }, config.realtimeIntervalMs)
    );

    this.timers.push(
      setInterval(() => {
        this.tickHistory().catch((e) => console.error('[bridge] history', e.message));
      }, config.historyIntervalMs)
    );

    this.timers.push(
      setInterval(() => {
        this.tickHeartbeat().catch((e) => console.error('[bridge] heartbeat', e.message));
      }, config.heartbeatIntervalMs)
    );
  }

  stop() {
    this.running = false;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  async tickHeartbeat() {
    await this.publisher.publishOnline(true);
  }

  async tickRealtime() {
    const map = await fetchRealtimeTags();
    const ts = new Date().toISOString();
    const snapshotTags = [];
    let published = 0;
    let missing = 0;

    for (const tagId of ALL_TAG_IDS) {
      const raw = map.has(tagId) ? map.get(tagId) : null;
      const value = normalizeTagValue(tagId, raw);

      if (value === null) {
        missing += 1;
        const payload = buildTagPayload(tagId, 0, ts, 'bad');
        if (payload) {
          // Still publish so FE has retain value; mark quality bad when missing
          if (payload.dataType === 'bool') payload.value = 0;
          await this.publisher.publishTag(payload);
          snapshotTags.push({
            tagId: payload.tagId,
            value: payload.value,
            dataType: payload.dataType,
            unit: payload.unit,
            quality: payload.quality,
          });
        }
        continue;
      }

      const payload = buildTagPayload(tagId, value, ts, 'good');
      await this.publisher.publishTag(payload);
      published += 1;
      snapshotTags.push({
        tagId: payload.tagId,
        value: payload.value,
        dataType: payload.dataType,
        unit: payload.unit,
        quality: payload.quality,
      });
    }

    if (config.publishSnapshotAll) {
      await this.publisher.publishSnapshot(snapshotTags, ts);
    }

    const hash = JSON.stringify(snapshotTags.map((t) => [t.tagId, t.value]));
    if (hash !== this.lastRealtimeHash) {
      this.lastRealtimeHash = hash;
      console.log(
        `[bridge] realtime published=${published}/${ALL_TAG_IDS.length} missing=${missing} ts=${ts}`
      );
    }
  }

  async tickHistory() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const hist = await fetchHistory(month, year);
    const ts = new Date().toISOString();

    const payload = {
      year: hist.year,
      month: hist.month,
      lineA: hist.lineA,
      lineB: hist.lineB,
      ts,
    };

    const hash = JSON.stringify([payload.lineA, payload.lineB]);
    await this.publisher.publishHistory(payload);

    if (hash !== this.lastHistoryHash) {
      this.lastHistoryHash = hash;
      console.log(`[bridge] history ${year}-${String(month).padStart(2, '0')} published`);
    }
  }
}
