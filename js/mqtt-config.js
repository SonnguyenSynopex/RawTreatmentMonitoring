/**
 * HiveMQ MQTT config for Vercel frontend (browser WSS).
 * Điền cluster URL + user subscribe (hoặc publish history nếu cần Save).
 *
 * HiveMQ Cloud WSS: wss://<cluster>.s1.eu.hivemq.cloud:8884/mqtt
 */
window.MQTT_CONFIG = {
  enabled: true,
  restFallback: true,

  // Khớp BE/.env mqtts://broker.hivemq.com:8883
  url: 'wss://broker.hivemq.com:8884/mqtt',
  username: '',
  password: '',
  clientIdPrefix: 'raw-uf-web',

  topicPrefix: 'synopex/raw-uf',
  qos: 1,

  useSnapshotAll: true,
};
