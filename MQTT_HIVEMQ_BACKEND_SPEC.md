# Raw Treatment & UF — MQTT HiveMQ Backend Spec

> **Mục đích:** Spec này dùng để bảo AI / backend **đẩy đủ dữ liệu** lên **HiveMQ MQTT**, để frontend deploy trên **Vercel** subscribe qua **WebSocket (MQTT over WSS)** và hiển thị realtime.
>
> **Nguồn gốc contract:** map từ API cũ `systemId=raw-uf` + logic hiển thị SVG trong `RawTreatmentdoc.md`.
>
> **Yêu cầu bắt buộc:** Publish **đủ 22 tag realtime** + **history LINE A/B** + **status online**. Không bỏ sót tag.

---

## 1. Bối cảnh kiến trúc

```
PLC / SCADA / Backend
        │
        │  publish MQTT
        ▼
   HiveMQ Cloud (MQTT broker)
        │
        │  WebSocket Secure (WSS)
        ▼
 Frontend (Vercel) — subscribe → cập nhật SVG / chart
```

| Mục | Giá trị |
|-----|---------|
| System ID legacy | `raw-uf` |
| Broker | HiveMQ (Cloud hoặc self-host) |
| Protocol frontend | MQTT over **WSS** (bắt buộc cho Vercel / HTTPS) |
| QoS khuyến nghị | **1** (at least once) |
| Retain khuyến nghị | **true** cho realtime tags + status (client mới vào vẫn có giá trị cuối) |
| Tần suất publish realtime | **≤ 5 giây** (khớp `FETCH_INTERVAL = 5000` cũ); đổi giá trị thì publish ngay |
| Timestamp | ISO-8601 UTC, ví dụ `2026-09-07T06:00:00.000Z` |

---

## 2. Quy ước topic MQTT

### 2.1 Namespace gốc

```
synopex/raw-uf/
```

### 2.2 Cấu trúc topic

| Loại | Topic pattern | Retain | Ghi chú |
|------|---------------|--------|---------|
| Realtime từng tag | `synopex/raw-uf/realtime/{tagId}` | `true` | **Bắt buộc** — 22 tag |
| Snapshot tất cả tag (optional) | `synopex/raw-uf/realtime/all` | `true` | Convenience cho FE subscribe 1 lần |
| History tháng | `synopex/raw-uf/history/{yyyy}/{MM}` | `true` | LINE A + LINE B (31 ngày) |
| Online / heartbeat | `synopex/raw-uf/status/online` | `true` | Health cho đèn trạng thái FE |
| Last will (LWT) | cùng `.../status/online` | `true` | Khi backend disconnect → `online: false` |

> `{tagId}` phải **khớp exact** tên trong bảng mục 4 (ví dụ `RAWUF_Phan_tram_be_UF`).

---

## 3. Payload JSON chuẩn

### 3.1 Realtime tag (mỗi topic 1 tag)

```json
{
  "tagId": "RAWUF_Phan_tram_be_UF",
  "value": 79.5,
  "dataType": "float",
  "unit": "%",
  "quality": "good",
  "ts": "2026-09-07T06:00:00.000Z"
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `tagId` | string | ✅ | Trùng tên topic leaf |
| `value` | number \| 0 \| 1 | ✅ | Giá trị hiện tại |
| `dataType` | `"float"` \| `"bool"` | ✅ | `bool` = binary 0/1 |
| `unit` | string \| null | ✅ | Đơn vị; `null` nếu binary / không có |
| `quality` | `"good"` \| `"bad"` \| `"uncertain"` | ✅ | Chất lượng tín hiệu |
| `ts` | string (ISO-8601) | ✅ | Thời điểm đo / publish |

### 3.2 Snapshot all (optional — topic `.../realtime/all`)

```json
{
  "systemId": "raw-uf",
  "ts": "2026-09-07T06:00:00.000Z",
  "tags": [
    { "tagId": "RAWUF_Phan_tram_be_UF", "value": 79.5, "dataType": "float", "unit": "%", "quality": "good" },
    { "tagId": "RAWUF_Raw_PumpC", "value": 1, "dataType": "bool", "unit": null, "quality": "good" }
  ]
}
```

> Nếu dùng snapshot: **đủ cả 22 tag** trong mỗi lần publish. Vẫn nên giữ topic từng tag để FE linh hoạt.

### 3.3 History tháng

Topic: `synopex/raw-uf/history/2026/09`

```json
{
  "systemId": "raw-uf",
  "year": 2026,
  "month": 9,
  "unit": "m3",
  "lineA": [12.5, 13.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "lineB": [10.2, 11.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "ts": "2026-09-07T06:00:00.000Z"
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `year` | int | ✅ | Năm |
| `month` | int | ✅ | 1–12 |
| `unit` | string | ✅ | Luôn `"m3"` |
| `lineA` | number[31] | ✅ | Sản lượng LINE A theo ngày 1→31 |
| `lineB` | number[31] | ✅ | Sản lượng LINE B theo ngày 1→31 |
| `ts` | string | ✅ | Thời điểm cập nhật |

**Quy tắc mảng:**
- Luôn **đúng 31 phần tử** (ngày không tồn tại trong tháng → `0` hoặc `null`; thống nhất dùng `0`).
- Index `0` = ngày 1, index `30` = ngày 31.
- Publish lại khi có Save/Clear hoặc cập nhật ngày hiện tại.

### 3.4 Status online

Topic: `synopex/raw-uf/status/online`

```json
{
  "systemId": "raw-uf",
  "online": true,
  "ts": "2026-09-07T06:00:00.000Z"
}
```

- Heartbeat mỗi **3–10 giây**.
- LWT khi disconnect: `{ "online": false, "ts": "..." }`.

---

## 4. DANH SÁCH ĐẦY ĐỦ TAG REALTIME (22 tag — bắt buộc)

### 4.1 Analog / float (12 tag)

| # | tagId | dataType | unit | Format hiển thị FE | Mô tả |
|---|-------|----------|------|--------------------|-------|
| 1 | `RAWUF_Phan_tram_be_UF` | float | `%` | `N.N%` | % mức bể UF; FE scale tank `uf_tank` = `value/100` |
| 2 | `RAWUF_Muc_UF` | float | `m3` | `N.NN m3` | Thể tích bể UF |
| 3 | `RAWUF_Pressure_input_A` | float | `bar`* | `N.NN` | Áp suất đầu vào Line A |
| 4 | `RAWUF_Pressure_output_A` | float | `bar`* | `N.NN` | Áp suất đầu ra Line A |
| 5 | `RAWUF_Hieu_suat_line_A` | float | — / ratio | `N.NN` | Hiệu suất Line A (**cũng dùng cho Alarm**) |
| 6 | `RAWUF_Pressure_input_B` | float | `bar`* | `N.NN` | Áp suất đầu vào Line B |
| 7 | `RAWUF_Pressure_output_B` | float | `bar`* | `N.NN` | Áp suất đầu ra Line B |
| 8 | `RAWUF_Hieu_suat_line_B` | float | — / ratio | `N.NN` | Hiệu suất Line B (**cũng dùng cho Alarm**) |
| 9 | `RAWUF_Flow_LocTho_LineA` | float | `m3/h`* | `N.NN` | Flow lọc thô Line A |
| 10 | `RAWUF_HieuSuat_LocTho_LineA` | float | — / ratio | `N.NN` | Hiệu suất lọc thô Line A |
| 11 | `RAWUF_Flow_LocTho_LineB` | float | `m3/h`* | `N.NN` | Flow lọc thô Line B |
| 12 | `RAWUF_HieuSuat_LocTho_LineB` | float | — / ratio | `N.NN` | Hiệu suất lọc thô Line B |

> `*` Đơn vị pressure/flow legacy không ghi rõ trong code — **backend nên gửi đúng đơn vị thực tế PLC** và điền vào field `unit`. FE chỉ format `N.NN`.

**Topic tương ứng:**

```
synopex/raw-uf/realtime/RAWUF_Phan_tram_be_UF
synopex/raw-uf/realtime/RAWUF_Muc_UF
synopex/raw-uf/realtime/RAWUF_Pressure_input_A
synopex/raw-uf/realtime/RAWUF_Pressure_output_A
synopex/raw-uf/realtime/RAWUF_Hieu_suat_line_A
synopex/raw-uf/realtime/RAWUF_Pressure_input_B
synopex/raw-uf/realtime/RAWUF_Pressure_output_B
synopex/raw-uf/realtime/RAWUF_Hieu_suat_line_B
synopex/raw-uf/realtime/RAWUF_Flow_LocTho_LineA
synopex/raw-uf/realtime/RAWUF_HieuSuat_LocTho_LineA
synopex/raw-uf/realtime/RAWUF_Flow_LocTho_LineB
synopex/raw-uf/realtime/RAWUF_HieuSuat_LocTho_LineB
```

### 4.2 Binary / bool 0|1 (10 tag)

| # | tagId | dataType | Giá trị | Mô tả / tác dụng UI |
|---|-------|----------|---------|---------------------|
| 13 | `RAWUF_Waste_BW_UF` | bool | `0` / `1` | Mức tank waste: `1`→70% height, `0`→30% |
| 14 | `RAWUF_Raw_Pump` | bool | `0` / `1` | Status shape: `1`→xanh `#00ff00`, else trắng |
| 15 | `RAWUF_Raw_BW_Pump` | bool | `0` / `1` | Status shape tương tự |
| 16 | `RAWUF_Raw_PumpC` | bool | `0` / `1` | Bơm Raw Pump C — animation + van/path |
| 17 | `RAWUF_HMI01_RAW_PUMP_A` | bool | `0` / `1` | Bơm Raw Pump A — animation + van/path |
| 18 | `RAWUF_BW_Raw_PumpB` | bool | `0` / `1` | Bơm BW Raw B — animation + van/path |
| 19 | `RAWUF_BW_Raw_PumpA` | bool | `0` / `1` | Bơm BW Raw A — animation + van/path |
| 20 | `RAWUF_Raw_Pump_15kW` | bool | `0` / `1` | Bơm 15kW + UF membrane on/off (`uf_on_*` / `uf_off_*`) |
| 21 | `RAWUF_BW_UF_PumpA` | bool | `0` / `1` | Bơm BW UF A + paths/vans backwash A |
| 22 | `RAWUF_BW_UF_PumpB` | bool | `0` / `1` | Bơm BW UF B + paths/vans backwash B |

**Topic tương ứng:**

```
synopex/raw-uf/realtime/RAWUF_Waste_BW_UF
synopex/raw-uf/realtime/RAWUF_Raw_Pump
synopex/raw-uf/realtime/RAWUF_Raw_BW_Pump
synopex/raw-uf/realtime/RAWUF_Raw_PumpC
synopex/raw-uf/realtime/RAWUF_HMI01_RAW_PUMP_A
synopex/raw-uf/realtime/RAWUF_BW_Raw_PumpB
synopex/raw-uf/realtime/RAWUF_BW_Raw_PumpA
synopex/raw-uf/realtime/RAWUF_Raw_Pump_15kW
synopex/raw-uf/realtime/RAWUF_BW_UF_PumpA
synopex/raw-uf/realtime/RAWUF_BW_UF_PumpB
```

**Lưu ý binary:**
- Chỉ gửi `0` hoặc `1` (number), **không** gửi `"ON"`/`"OFF"`/`true`/`false`.
- FE **tự derive** van/path/BSV từ các bơm — **KHÔNG** cần publish từng van.

---

## 5. History — bắt buộc cho Chart / Record

| Dataset | Topic | Nội dung |
|---------|-------|----------|
| Tháng hiện tại + các tháng lưu | `synopex/raw-uf/history/{yyyy}/{MM}` | `lineA[31]`, `lineB[31]` đơn vị `m3` |

**Checklist backend history:**
- [ ] Publish tháng hiện tại (retain)
- [ ] Khi Save / Clear / cập nhật ngày → publish lại đúng topic tháng đó
- [ ] Mảng luôn 31 phần tử
- [ ] Đủ cả LINE A và LINE B

Legacy REST tương đương (tham chiếu migrate):

```
GET/PUT http://10.100.203.78:4506/api/rawuf/{month}/{year}
```

---

## 6. Logic FE derive (backend KHÔNG publish)

Backend **chỉ** publish 22 tag + history + online. FE tự tính:

### 6.1 Line status (Alarm / Normal)

Từ `RAWUF_Hieu_suat_line_A` / `RAWUF_Hieu_suat_line_B`:

| Điều kiện | UI |
|-----------|-----|
| `value > 1` | Text `Alarm`, nền đỏ `#ff0707`, blink |
| `value ≤ 1` | Text `Normal`, nền xanh `#00b600` |

### 6.2 Nhóm bơm

| Biến FE | Công thức |
|---------|-----------|
| `groupC_active` | `RAWUF_Raw_PumpC == 1` **OR** `RAWUF_BW_Raw_PumpB == 1` |
| `groupA_active` | `RAWUF_HMI01_RAW_PUMP_A == 1` **OR** `RAWUF_BW_Raw_PumpA == 1` |
| `any_active` | `groupC_active` **OR** `groupA_active` |

### 6.3 Van / BSV / path / membrane

| Nguồn | UI derive |
|-------|-----------|
| PumpC | `on-van-1`, `on-van-2` + paths riêng |
| Pump A (`HMI01_RAW_PUMP_A`) | `on-van-3`, `on-van-4` + paths riêng |
| BW_Raw_PumpB | `on-van-5`, `on-van-6`, `on-bsv-1` |
| BW_Raw_PumpA | `on-van-7`, `on-van-8`, `on-bsv-2` |
| groupC | `on-bsv-13` … `on-bsv-21` |
| groupA | `on-bsv-4` … `on-bsv-12` |
| `RAWUF_Raw_Pump_15kW` | `uf_on_a/b` vs `uf_off_a/b` |
| `RAWUF_BW_UF_PumpA` / `B` | paths + vans backwash (xem `RawTreatmentdoc.md` §4.3–4.5) |

---

## 7. Checklist publish tối thiểu (copy cho AI backend)

### Realtime — phải có đủ

```
[ ] RAWUF_Phan_tram_be_UF
[ ] RAWUF_Muc_UF
[ ] RAWUF_Pressure_input_A
[ ] RAWUF_Pressure_output_A
[ ] RAWUF_Hieu_suat_line_A
[ ] RAWUF_Pressure_input_B
[ ] RAWUF_Pressure_output_B
[ ] RAWUF_Hieu_suat_line_B
[ ] RAWUF_Flow_LocTho_LineA
[ ] RAWUF_HieuSuat_LocTho_LineA
[ ] RAWUF_Flow_LocTho_LineB
[ ] RAWUF_HieuSuat_LocTho_LineB
[ ] RAWUF_Waste_BW_UF
[ ] RAWUF_Raw_Pump
[ ] RAWUF_Raw_BW_Pump
[ ] RAWUF_Raw_PumpC
[ ] RAWUF_HMI01_RAW_PUMP_A
[ ] RAWUF_BW_Raw_PumpB
[ ] RAWUF_BW_Raw_PumpA
[ ] RAWUF_Raw_Pump_15kW
[ ] RAWUF_BW_UF_PumpA
[ ] RAWUF_BW_UF_PumpB
```

### Khác

```
[ ] Topic history tháng hiện tại: synopex/raw-uf/history/{yyyy}/{MM}
[ ] Topic status: synopex/raw-uf/status/online + LWT
[ ] QoS 1, retain=true cho realtime/history/status
[ ] Payload JSON đúng schema mục 3
[ ] Binary chỉ 0/1; float là number
[ ] Publish ≤ 5s hoặc on-change
[ ] (Optional) synopex/raw-uf/realtime/all đủ 22 tag
```

---

## 8. Ví dụ publish (HiveMQ)

### Ví dụ float

- Topic: `synopex/raw-uf/realtime/RAWUF_Muc_UF`
- Payload:

```json
{
  "tagId": "RAWUF_Muc_UF",
  "value": 341.9,
  "dataType": "float",
  "unit": "m3",
  "quality": "good",
  "ts": "2026-09-07T06:00:00.000Z"
}
```

### Ví dụ bool

- Topic: `synopex/raw-uf/realtime/RAWUF_Raw_PumpC`
- Payload:

```json
{
  "tagId": "RAWUF_Raw_PumpC",
  "value": 1,
  "dataType": "bool",
  "unit": null,
  "quality": "good",
  "ts": "2026-09-07T06:00:00.000Z"
}
```

---

## 9. Gợi ý ACL HiveMQ (frontend Vercel)

| Role | Quyền |
|------|--------|
| Backend publisher | `PUBLISH` `synopex/raw-uf/#` |
| Frontend (Vercel) | `SUBSCRIBE` `synopex/raw-uf/#` only — **không** publish |
| Auth | Username/password hoặc token; FE dùng WSS port (thường `8884`) |

---

## 10. Mapping legacy REST → MQTT (migrate)

| Legacy | MQTT |
|--------|------|
| `GET .../api/data/cleaned?systemId=raw-uf` → `tags[]` | `synopex/raw-uf/realtime/{tagId}` (+ optional `/all`) |
| `GET/PUT .../api/rawuf/{month}/{year}` | `synopex/raw-uf/history/{yyyy}/{MM}` |
| Health ping 3s | `synopex/raw-uf/status/online` |

---

## 11. Không nằm trong scope MQTT của app này

- Alarm History page cũ (`/scada/alarmhistory/`) — hệ SCADA ngoài.
- Clock trên header — FE lấy giờ local.
- i18n / menu — FE tĩnh.

---

## 12. Tóm tắt số lượng

| Nhóm | Số lượng | Bắt buộc |
|------|----------|----------|
| Float sensors | 12 | ✅ |
| Binary devices / status | 10 | ✅ |
| History series | 2 (`lineA`, `lineB`) theo tháng | ✅ |
| Online status | 1 | ✅ |
| **Tổng realtime tag** | **22** | ✅ |

**Công thức đủ dữ liệu cho dashboard Raw Treatment & UF trên Vercel:**

> **22 realtime tags + history LINE A/B theo tháng + online heartbeat** trên HiveMQ, FE nhận qua MQTT WebSocket.
