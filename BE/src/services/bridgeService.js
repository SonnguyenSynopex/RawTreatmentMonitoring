import { config } from '../config.js';
import { fetchRealtimeTags, fetchHistory } from '../api/scadaClient.js';
import {
  ALL_TAG_IDS,
  buildTagPayload,
  normalizeTagValue,
  applySimulatedTurbidity,
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
    /** SCADA realtime OK — drives status/online for FE footer */
    this.lastRealtimeOk = false;
    this.lastRealtimeAt = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;

    console.log(
      `[bridge] realtime=${config.realtimeIntervalMs}ms history=${config.historyIntervalMs}ms lookback=${config.historyLookbackMonths}mo heartbeat=${config.heartbeatIntervalMs}ms`
    );
    console.log(
      `[bridge] FE topics: ${config.topicPrefix}/realtime/all | .../realtime/{tagId} | .../history/{yyyy}/{MM} | .../status/online`
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
    const fresh =
      this.lastRealtimeOk &&
      Date.now() - this.lastRealtimeAt < config.realtimeIntervalMs * 3;
    await this.publisher.publishOnline(fresh);
  }

  async tickRealtime() {
    try {
      const map = await fetchRealtimeTags();
      applySimulatedTurbidity(map);
      const ts = new Date().toISOString();
      const snapshotTags = [];
      const jobs = [];
      let published = 0;
      let missing = 0;

      for (const tagId of ALL_TAG_IDS) {
        if (!map.has(tagId)) {
          missing += 1;
          continue;
        }

        const value = normalizeTagValue(tagId, map.get(tagId));
        if (value === null) {
          missing += 1;
          continue;
        }

        const payload = buildTagPayload(tagId, value, ts, 'good');
        jobs.push(this.publisher.publishTag(payload));
        published += 1;
        snapshotTags.push({
          tagId: payload.tagId,
          value: payload.value,
          dataType: payload.dataType,
          unit: payload.unit,
          quality: payload.quality,
        });
      }

      if (!snapshotTags.length) {
        this.lastRealtimeOk = false;
        throw new Error('No matching RAWUF tags in SCADA response');
      }

      if (config.publishSnapshotAll) {
        jobs.push(this.publisher.publishSnapshot(snapshotTags, ts));
      }

      await Promise.all(jobs);

      this.lastRealtimeOk = true;
      this.lastRealtimeAt = Date.now();

      const hash = JSON.stringify(snapshotTags.map((t) => [t.tagId, t.value]));
      if (hash !== this.lastRealtimeHash) {
        this.lastRealtimeHash = hash;
        console.log(
          `[bridge] realtime published=${published}/${ALL_TAG_IDS.length} missing=${missing} ts=${ts}`
        );
      }
    } catch (err) {
      this.lastRealtimeOk = false;
      throw err;
    }
  }

  async tickHistory() {
    const now = new Date();
    const lookback = config.historyLookbackMonths || 12;
    const jobs = [];
    const labels = [];

    for (let i = 0; i < lookback; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      labels.push(`${year}-${String(month).padStart(2, '0')}`);

      jobs.push(
        (async () => {
          const hist = await fetchHistory(month, year);
          const ts = new Date().toISOString();
          await this.publisher.publishHistory({
            year: hist.year,
            month: hist.month,
            RAWUF_LocThoA: hist.RAWUF_LocThoA,
            RAWUF_LocThoB: hist.RAWUF_LocThoB,
            ts,
          });
          return {
            key: `${year}-${String(month).padStart(2, '0')}`,
            hash: JSON.stringify([hist.RAWUF_LocThoA, hist.RAWUF_LocThoB]),
          };
        })()
      );
    }

    const results = await Promise.all(jobs);
    const hash = JSON.stringify(results.map((r) => [r.key, r.hash]));
    if (hash !== this.lastHistoryHash) {
      this.lastHistoryHash = hash;
      console.log(
        `[bridge] history published ${results.length} months: ${labels[labels.length - 1]} … ${labels[0]}`
      );
    }
  }
}
