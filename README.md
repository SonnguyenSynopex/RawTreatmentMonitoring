# RawTreatmentMonitoring

Frontend **Raw Treatment & UF** — dashboard SVG realtime + Record, data qua **MQTT WebSocket (HiveMQ)**.

| | |
|--|--|
| Dashboard | https://raw-treatment-monitoring.vercel.app/ |
| Record | https://raw-treatment-monitoring.vercel.app/record |
| MQTT config | `js/mqtt-config.js` |
| Bridge BE | `BE/` |
| Spec | `MQTT_HIVEMQ_BACKEND_SPEC.md` |

### Bật data trên Vercel
1. Điền HiveMQ WSS vào `js/mqtt-config.js` (`url`, `username`, `password`).
2. Chạy `BE/` trên máy LAN để poll SCADA → publish MQTT.
3. Deploy lại frontend lên Vercel.

**Topics:** `synopex/raw-uf/realtime/#`, `.../history/{yyyy}/{MM}`, `.../status/online`

