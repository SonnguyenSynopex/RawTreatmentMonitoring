// Go service A_IoT_RawTreatmentMqttBride (node-windows)
// Chay file nay voi quyen Administrator (file .bat tu dong nang quyen).
const { Service } = require('node-windows');

const NAME = 'A_IoT_RawTreatmentMqttBride';

const svc = new Service({ name: NAME });

svc.on('uninstall', () => {
  console.log('[OK] DA GO service: ' + NAME);
  process.exit(0);
});
svc.on('alreadyuninstalled', () => {
  console.log('[!] Service khong ton tai - khong can go.');
  process.exit(0);
});
svc.on('error', (err) => {
  console.error('[LOI]', (err && err.message) || err);
  process.exit(1);
});

svc.uninstall();
