/**
 * HiveMQ MQTT config for Vercel frontend (browser WSS).
 * Điền cluster URL + user subscribe (hoặc publish history nếu cần Save).
 *
 * HiveMQ Cloud WSS: wss://<cluster>.s1.eu.hivemq.cloud:8884/mqtt
 */
window.MQTT_CONFIG = {
  enabled: true,
  // Fallback REST khi MQTT tắt / lỗi (chỉ chạy được trên LAN)
  restFallback: true,

  url: 'wss://xxxxxxxx.s1.eu.hivemq.cloud:8884/mqtt',
  username: '',
  password: '',
  clientIdPrefix: 'raw-uf-web',

  topicPrefix: 'synopex/raw-uf',
  qos: 1,

  /** Prefer snapshot topic (BE publishes all 22 tags) */
  useSnapshotAll: true,
};
