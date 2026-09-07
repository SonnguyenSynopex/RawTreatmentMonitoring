import mqtt from 'mqtt';
import {
  config,
  topicOnline,
  topicRealtime,
  topicRealtimeAll,
  topicHistory,
} from '../config.js';
import { SYSTEM_ID } from '../tags.js';

export class MqttPublisher {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const lwtPayload = JSON.stringify({
        systemId: SYSTEM_ID,
        online: false,
        ts: new Date().toISOString(),
      });

      const options = {
        clientId: config.mqttClientId,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 20_000,
        username: config.mqttUsername || undefined,
        password: config.mqttPassword || undefined,
        protocolVersion: 4,
        will: {
          topic: topicOnline(),
          payload: Buffer.from(lwtPayload),
          qos: config.qos,
          retain: config.retain,
        },
      };

      console.log(`[mqtt] connecting ${config.mqttUrl} as ${config.mqttClientId}`);
      this.client = mqtt.connect(config.mqttUrl, options);

      let settled = false;

      this.client.on('connect', () => {
        this.connected = true;
        console.log('[mqtt] connected');
        if (!settled) {
          settled = true;
          resolve();
        }
      });

      this.client.on('reconnect', () => console.log('[mqtt] reconnecting...'));

      this.client.on('close', () => {
        this.connected = false;
        console.warn('[mqtt] connection closed');
      });

      this.client.on('offline', () => {
        this.connected = false;
        console.warn('[mqtt] offline');
      });

      this.client.on('error', (err) => {
        console.error('[mqtt] error', err.message);
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  publish(topic, payloadObj) {
    if (!this.client) {
      throw new Error('MQTT not connected');
    }
    // During brief reconnect flaps, wait up to 5s for socket to come back
    if (!this.connected) {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const tryPub = () => {
          if (this.connected) {
            this._doPublish(topic, payloadObj).then(resolve, reject);
            return;
          }
          if (Date.now() - started > 5000) {
            reject(new Error('MQTT not connected'));
            return;
          }
          setTimeout(tryPub, 250);
        };
        tryPub();
      });
    }
    return this._doPublish(topic, payloadObj);
  }

  _doPublish(topic, payloadObj) {
    const payload = Buffer.from(JSON.stringify(payloadObj));
    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        payload,
        { qos: config.qos, retain: config.retain },
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async publishTag(tagPayload) {
    await this.publish(topicRealtime(tagPayload.tagId), tagPayload);
  }

  async publishSnapshot(tags, ts) {
    await this.publish(topicRealtimeAll(), {
      systemId: SYSTEM_ID,
      ts,
      tags,
    });
  }

  async publishHistory({ year, month, RAWUF_LocThoA, RAWUF_LocThoB, ts }) {
    await this.publish(topicHistory(year, month), {
      systemId: SYSTEM_ID,
      year,
      month,
      unit: 'm3',
      RAWUF_LocThoA,
      RAWUF_LocThoB,
      ts,
    });
  }

  async publishOnline(online = true) {
    await this.publish(topicOnline(), {
      systemId: SYSTEM_ID,
      online: !!online,
      ts: new Date().toISOString(),
    });
  }

  async end() {
    if (!this.client) return;
    try {
      if (this.connected) await this.publishOnline(false);
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => this.client.end(false, {}, resolve));
    this.client = null;
    this.connected = false;
  }
}
