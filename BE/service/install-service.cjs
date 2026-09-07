// Cai service A_IoT_RawTreatmentMqttBride (node-windows + winsw dong goi san)
// Chay file nay voi quyen Administrator (file .bat tu dong nang quyen).
const path = require('node:path');
const fs = require('node:fs');
const { Service } = require('node-windows');

const NAME = 'A_IoT_RawTreatmentMqttBride';
const BE_DIR = path.join(__dirname, '..');
const LOG_DIR = path.join(__dirname, 'logs');

fs.mkdirSync(LOG_DIR, { recursive: true });

const svc = new Service({
  name: NAME,
  description: 'MQTT bridge Raw Treatment and UF: fetch SCADA to HiveMQ, auto start',
  script: path.join(BE_DIR, 'src', 'index.js'),
  workingDirectory: BE_DIR,
  logpath: LOG_DIR,
  logmode: 'append',
});

svc.on('install', () => {
  console.log('[OK] Da cai service. Dang khoi dong...');
  svc.start();
});
svc.on('alreadyinstalled', () => {
  console.log('[!] Service da ton tai. Chay file Go truoc roi cai lai.');
  process.exit(0);
});
svc.on('invalidinstallation', () => {
  console.error('[LOI] Cai dat khong hop le (thieu file wrapper).');
  process.exit(1);
});
svc.on('start', () => {
  console.log('[OK] Service DANG CHAY: ' + NAME);
  process.exit(0);
});
svc.on('error', (err) => {
  console.error('[LOI]', (err && err.message) || err);
  process.exit(1);
});

svc.install();
