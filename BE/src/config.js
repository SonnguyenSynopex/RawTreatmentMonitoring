import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function int(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  scadaCleanedUrl: process.env.SCADA_CLEANED_URL || 'http://10.100.203.78:3456/api/data/cleaned',
  scadaSystemId: process.env.SCADA_SYSTEM_ID || 'raw-uf',
  historyBaseUrl: process.env.HISTORY_BASE_URL || 'http://10.100.203.78:4506/api/rawuf',

  realtimeIntervalMs: int('REALTIME_INTERVAL_MS', 5000),
  historyIntervalMs: int('HISTORY_INTERVAL_MS', 60_000),
  heartbeatIntervalMs: int('HEARTBEAT_INTERVAL_MS', 5000),

  mqttUrl: required('MQTT_URL'),
  mqttUsername: process.env.MQTT_USERNAME || '',
  mqttPassword: process.env.MQTT_PASSWORD || '',
  mqttClientId: process.env.MQTT_CLIENT_ID || `raw-uf-bridge-${process.pid}`,

  topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'synopex/raw-uf',
  qos: /** @type {0|1|2} */ (int('MQTT_QOS', 1)),
  retain: bool('MQTT_RETAIN', true),
  publishSnapshotAll: bool('PUBLISH_SNAPSHOT_ALL', true),
};

export function topicRealtime(tagId) {
  return `${config.topicPrefix}/realtime/${tagId}`;
}

export function topicRealtimeAll() {
  return `${config.topicPrefix}/realtime/all`;
}

export function topicHistory(year, month) {
  const mm = String(month).padStart(2, '0');
  return `${config.topicPrefix}/history/${year}/${mm}`;
}

export function topicOnline() {
  return `${config.topicPrefix}/status/online`;
}
