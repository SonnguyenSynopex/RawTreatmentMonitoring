# Raw Treatment & UF — MQTT HiveMQ Backend Spec

> **Nguồn sự thật:** dự án frontend **raw** (đã copy lên root repo để deploy Vercel).
> Chi tiết UI/API: `RAWdoc.md`, sample realtime: `api.json`.
>
> Backend (`BE/`) poll REST nội bộ → publish HiveMQ → Frontend Vercel subscribe MQTT over WSS.

**Bắt buộc publish:** **22 tag realtime** + **history `RAWUF_LocThoA` / `RAWUF_LocThoB`** + **status online**.

---

## 1. Kiến trúc

```
SCADA REST (LAN)
  GET :3456/api/data/cleaned?systemId=raw-uf     (realtime, 5s)
  GET :4506/api/rawuf/{month}/{year}             (history)
        │
        ▼  BE bridge (Node)
   HiveMQ MQTT
        │  WSS
        ▼
 Frontend Vercel (index.html + record.html + SVG)
```

| Mục | Giá trị |
|-----|---------|
| systemId | `raw-uf` |
| QoS | `1` |
| Retain | `true` (realtime + history + online) |
| Realtime interval | `≤ 5000 ms` |
| Timestamp | ISO-8601 UTC |

---

## 2. Topic MQTT

Prefix: `synopex/raw-uf/`

| Loại | Topic | Retain |
|------|-------|--------|
| Realtime 1 tag | `synopex/raw-uf/realtime/{tagId}` | true |
| Snapshot all | `synopex/raw-uf/realtime/all` | true |
| History tháng | `synopex/raw-uf/history/{yyyy}/{MM}` | true |
| Online + LWT | `synopex/raw-uf/status/online` | true |

---

## 3. Payload

### 3.1 Realtime tag

```json
{
  "tagId": "RAWUF_Phan_tram_be_UF",
  "value": 58.5,
  "dataType": "float",
  "unit": "%",
  "quality": "good",
  "ts": "2026-09-07T06:00:00.000Z"
}
```

- `dataType`: `"float"` | `"bool"`
- Binary: value chỉ `0` hoặc `1` (number)

### 3.2 Snapshot `.../realtime/all`

```json
{
  "systemId": "raw-uf",
  "ts": "2026-09-07T06:00:00.000Z",
  "tags": [ /* đủ 22 tag */ ]
}
```

### 3.3 History (khớp raw `chart.js` / `record.js`)

Topic: `synopex/raw-uf/history/2026/09`

```json
{
  "systemId": "raw-uf",
  "year": 2026,
  "month": 9,
  "unit": "m3",
  "RAWUF_LocThoA": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "RAWUF_LocThoB": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "ts": "2026-09-07T06:00:00.000Z"
}
```

- Luôn **31 phần tử**; index 0 = ngày 1.
- Legacy REST PUT body dùng đúng 2 key này.

### 3.4 Online

```json
{ "systemId": "raw-uf", "online": true, "ts": "2026-09-07T06:00:00.000Z" }
```

Heartbeat 3–10s. LWT: `online: false`.

---

## 4. 22 realtime tags (bắt buộc)

### Float (12) — units theo `api.json`

| tagId | unit | Format FE |
|-------|------|-----------|
| `RAWUF_Phan_tram_be_UF` | `%` | `N.N%` (+ scale `uf_tank`) |
| `RAWUF_Muc_UF` | `m3` | `N.NN m3` |
| `RAWUF_Pressure_input_A` | `bar` | `N.NN` |
| `RAWUF_Pressure_output_A` | `bar` | `N.NN` |
| `RAWUF_Hieu_suat_line_A` | `bar`* | `N.NN` (+ Line A Alarm nếu `> 1`) |
| `RAWUF_Pressure_input_B` | `bar` | `N.NN` |
| `RAWUF_Pressure_output_B` | `bar` | `N.NN` |
| `RAWUF_Hieu_suat_line_B` | `bar`* | `N.NN` (+ Line B Alarm nếu `> 1`) |
| `RAWUF_Flow_LocTho_LineA` | `m3` | `N.NN` |
| `RAWUF_HieuSuat_LocTho_LineA` | `%` | `N.NN` |
| `RAWUF_Flow_LocTho_LineB` | `m3` | `N.NN` |
| `RAWUF_HieuSuat_LocTho_LineB` | `%` | `N.NN` |

\* API sample ghi unit `bar` cho hiệu suất line; FE vẫn dùng threshold `> 1` cho Alarm.

### Bool 0|1 (10)

| tagId | UI |
|-------|-----|
| `RAWUF_Waste_BW_UF` | tank waste 70%/30% |
| `RAWUF_Raw_Pump` | status fill xanh/trắng |
| `RAWUF_Raw_BW_Pump` | status fill xanh/trắng |
| `RAWUF_Raw_PumpC` | pump + van/path |
| `RAWUF_HMI01_RAW_PUMP_A` | pump + van/path |
| `RAWUF_BW_Raw_PumpB` | pump + van/path |
| `RAWUF_BW_Raw_PumpA` | pump + van/path |
| `RAWUF_Raw_Pump_15kW` | pump + `uf_on_*` / `uf_off_*` |
| `RAWUF_BW_UF_PumpA` | BW UF A paths/vans |
| `RAWUF_BW_UF_PumpB` | BW UF B paths/vans |

**Không** publish van/path — FE derive trong `js/index.js`.

---

## 5. Legacy REST → MQTT

| REST | MQTT |
|------|------|
| `GET .../cleaned?systemId=raw-uf` → `data.data.tags[]` | `realtime/{tagId}` + optional `realtime/all` |
| `GET/PUT .../rawuf/{m}/{y}` → `RAWUF_LocThoA/B` | `history/{yyyy}/{MM}` |
| Health | `status/online` |

---

## 6. Checklist

```
[ ] 12 float tags
[ ] 10 bool tags
[ ] history RAWUF_LocThoA + RAWUF_LocThoB (31)
[ ] status/online + LWT
[ ] QoS 1, retain true
[ ] binary chỉ 0/1
```

Service sẵn: `BE/` — `npm start` sau khi điền `.env` HiveMQ.
