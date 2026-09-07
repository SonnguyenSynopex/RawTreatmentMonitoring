# RAW TREATMENT & UF — Tài liệu logic hiển thị & map API ↔ SVG

Thư mục dự án: **root repo** (nguồn gốc từ `raw/`, đã copy lên root để deploy Vercel).

| File | Vai trò |
|------|---------|
| `index.html` | Dashboard: Chart.js + bảng LocTho phía trên + SVG realtime |
| `record.html` | Trang Record: chọn tháng, bảng/biểu đồ lịch sử, Save/Clear/Export |
| `js/index.js` | Fetch SCADA tags → cập nhật SVG (text, pump, valve, path, tank, line status) |
| `js/chart.js` | Chart.js bar chart + bảng Dashboard (LINE A / LINE B) |
| `js/record.js` | Fetch/Save/Clear/Export RawUF theo tháng (Chart.js riêng) |
| `js/scolling.js`, `js/time.js` | Menu, đồng hồ, health check (`systemId=raw-uf`) |
| `svg/Raw_UF.svg` | Sơ đồ kỹ thuật (load trong iframe `#left-wapper`) |
| `svg/Raw_UF - Copy.svg` | Bản SVG backup |
| `api.json` | Data test local (không dùng trên production path) |
| `css/layout.css`, `css/styleSvg.css`, `css/record.css` | Styles |
| `template/Template.xlsx` | Template Excel export |
| `BE/` | Bridge REST → HiveMQ MQTT (xem `MQTT_HIVEMQ_BACKEND_SPEC.md`) |

---

## 1. API

### 1.1 Realtime SCADA (Dashboard SVG)

```
GET http://10.100.203.78:3456/api/data/cleaned?systemId=raw-uf
```

- Refresh: **5 giây** (`FETCH_INTERVAL = 5000`)
- Response dùng: `data.data.tags[]` — mỗi tag có `tagId`, `value`
- Tra cứu: `getTagValue(tags, tagId)`
- Flow: `DOMContentLoaded` → `waitForIframe` → `startMonitoring` → `tick()` → `fetchData()` → `processData()`
- Dashboard tự `location.reload()` mỗi **1 giờ**

### 1.2 RawUF Records (bảng + biểu đồ)

```
GET  http://10.100.203.78:4506/api/rawuf/{month}/{year}
PUT  http://10.100.203.78:4506/api/rawuf/{month}/{year}
     Body: {
       "RAWUF_LocThoA": number[31],
       "RAWUF_LocThoB": number[31]
     }
```

- Response thành công chứa `RAWUF_LocThoA` / `RAWUF_LocThoB` (31 giá trị m³ mỗi mảng)
- Dashboard: load **một lần** khi `DOMContentLoaded` — **không** auto-poll bảng
- Record: load khi đổi `#datePicker` — **không** auto-poll

---

## 2. Map API `tagId` → SVG element ID (text số liệu)

Hàm: `processData()` → `setText(id, text)`.

| API tagId | SVG ID | Format | Mô tả |
|-----------|--------|--------|-------|
| `RAWUF_Phan_tram_be_UF` | `RAWUF_Phan_tram_be_UF` | `N.N%` (1 decimal) | Mức bể UF (%) |
| `RAWUF_Muc_UF` | `RAWUF_Muc_UF` | `N.NN m3` (2 decimals) | Thể tích UF |
| `RAWUF_Pressure_input_A` | `RAWUF_Pressure_input_A` | `N.NN` | Áp suất đầu vào Line A |
| `RAWUF_Pressure_output_A` | `RAWUF_Pressure_output_A` | `N.NN` | Áp suất đầu ra Line A |
| `RAWUF_Hieu_suat_line_A` | `RAWUF_Hieu_suat_line_A` | `N.NN` | Hiệu suất Line A |
| `RAWUF_Pressure_input_B` | `RAWUF_Pressure_input_B` | `N.NN` | Áp suất đầu vào Line B |
| `RAWUF_Pressure_output_B` | `RAWUF_Pressure_output_B` | `N.NN` | Áp suất đầu ra Line B |
| `RAWUF_Hieu_suat_line_B` | `RAWUF_Hieu_suat_line_B` | `N.NN` | Hiệu suất Line B |
| `RAWUF_Flow_LocTho_LineA` | `RAWUF_Flow_LocTho_LineA` | `N.NN` | Lưu lượng lọc thô Line A |
| `RAWUF_HieuSuat_LocTho_LineA` | `RAWUF_HieuSuat_LocTho_LineA` | `N.NN` | Hiệu suất lọc thô Line A |
| `RAWUF_Flow_LocTho_LineB` | `RAWUF_Flow_LocTho_LineB` | `N.NN` | Lưu lượng lọc thô Line B |
| `RAWUF_HieuSuat_LocTho_LineB` | `RAWUF_HieuSuat_LocTho_LineB` | `N.NN` | Hiệu suất lọc thô Line B |

> Tất cả text displays: **tagId = SVG ID**.

Các sensor format `00.00` nằm trong mảng `sensorTags` (pressure / hiệu suất / flow LocTho).

---

## 3. Filter / pressure config

**Không có** `FILTER_PRESSURE_CONFIG` kiểu DI/RoWater. Áp suất Line A/B hiển thị trực tiếp từ tag text.

Line status (Alarm/Normal) suy ra từ **hiệu suất** — xem mục 4.2.

---

## 4. Logic animation / trạng thái thiết bị

### 4.1 Line status (derived từ hiệu suất)

| Source API | SVG text | SVG rect | Logic |
|------------|----------|----------|-------|
| `RAWUF_Hieu_suat_line_A` | `textLineAStatus` | `rectLineAStatus` | `value > 1` → Alarm; else Normal |
| `RAWUF_Hieu_suat_line_B` | `textLineBStatus` | `rectLineBStatus` | tương tự |

- Alarm: text `"Alarm"`, fill trắng, BG `#ff0707`, class `.line-status-blink`
- Normal: text `"Normal"`, BG `#00b600`, tắt blink
- Style blink được inject vào iframe (`ensureStatusBlinkStyle`)

### 4.2 Bơm animated (`controlPump`)

`value === 1` → fill `#00FF00` + `fanRotate 2s`; ngược lại → xám `#b3b3b3ff`.

| API tagId | Biến nội bộ | Ghi chú |
|-----------|-------------|---------|
| `RAWUF_Raw_PumpC` | `pumpC` | |
| `RAWUF_HMI01_RAW_PUMP_A` | `pumpA` | |
| `RAWUF_BW_Raw_PumpB` | `bwPumpB` | Backwash raw |
| `RAWUF_BW_Raw_PumpA` | `bwPumpA` | Backwash raw |
| `RAWUF_Raw_Pump_15kW` | `pump15kW` | Toggle `uf_on_a/b`, `uf_off_a/b` |
| `RAWUF_BW_UF_PumpA` | `bwUfPumpA` | Backwash UF A + override paths |
| `RAWUF_BW_UF_PumpB` | `bwUfPumpB` | Backwash UF B + override paths |

### 4.3 Status backgrounds (fill only, không xoay)

| API tagId | SVG ID | ON | OFF |
|-----------|--------|----|-----|
| `RAWUF_Raw_Pump` | `RAWUF_Raw_Pump` | `#00ff00` | `#ffffff` |
| `RAWUF_Raw_BW_Pump` | `RAWUF_Raw_BW_Pump` | `#00ff00` | `#ffffff` |

### 4.4 Mực nước (`controlWaterLevel`)

| API tagId | SVG ID | Logic |
|-----------|--------|-------|
| `RAWUF_Phan_tram_be_UF` | `uf_tank` | `scaleY(percent/100)`, origin bottom |
| `RAWUF_Waste_BW_UF` | `RAWUF_Waste_BW_UF` | `value === 1` → 70%; else → 30% |

### 4.5 Nhóm bơm (OR logic)

| Nhóm | Điều kiện |
|------|-----------|
| `groupC_active` | `pumpC` OR `bwPumpB` |
| `groupA_active` | `pumpA` OR `bwPumpA` |
| `any_active` | `groupC_active` OR `groupA_active` |

### 4.6 Van / path / BSV

Visibility dùng `visibility: visible/hidden` (không dùng `display`).

**Quy ước tên SVG (khác DI/RoWater):**

| Pattern | Ý nghĩa |
|---------|---------|
| `on-van-{N}` / `off-van-{N}` | Van thường (có dấu gạch ngang) |
| `on-bsv-{N}` / `off-bsv-{N}` | Backwash valve |
| `uf_on_a`, `uf_off_a`, `uf_on_b`, `uf_off_b` | UF module on/off (15kW) |
| `uf_back_a`, `uf_back_b` | UF backwash path |

#### Per-pump valves & paths

| Pump / group | Valves ON | Paths |
|--------------|-----------|-------|
| `pumpC` | `on-van-1`, `on-van-2` | path1966, path2025 |
| `pumpA` | `on-van-3`, `on-van-4` | path1967, path2026 |
| `bwPumpB` | `on-van-5`, `on-van-6`, `on-bsv-1` | path1968, path2027, path2030 |
| `bwPumpA` | `on-van-7`, `on-van-8`, `on-bsv-2` | path1969, path2028, path2029 |
| `groupC_active` | `on-bsv-13` … `on-bsv-21` | path1977, path1970, path1978, path1979 |
| `groupA_active` | `on-bsv-4` … `on-bsv-12` | path1972, path1973, path1974, path1975, path1976 |
| `any_active` (shared) | — | path1, path1980, path1981, path1982–1991, path1992–2001, path2002, path2013, path2024, path2003–2012, path2014–2023 |
| `bwUfPumpA` | `on-van-9`, `on-van-11`, `on-van-13`, `on-van-14` | path2055, path2054, path2043, path2044–2053, `uf_back_a` |
| `bwUfPumpB` | `on-van-10`, `on-van-12`, `on-van-15`, `on-van-16` | path2056, path2042, path2031, path2032–2041, `uf_back_b` |
| `pump15kW` | — | `uf_on_a`/`uf_off_a`, `uf_on_b`/`uf_off_b` |

#### Override khi BW UF pumps active

**`bwUfPumpA === 1`:**

- Force đóng van 18, 19 (`on-van-18/19` hidden, `off-van-*` visible)
- Ẩn shared paths: path2013, path2014–2023, path1981, path1982–1991

**`bwUfPumpB === 1`:**

- Force đóng van 17, 20
- Ẩn shared paths: path1, path1992–2001, path2002, path2003–2012

Khi BW UF pump OFF: van 17–20 vẫn ở trạng thái đóng an toàn.

> Không có UV, carbon/RO module icons, hay filter pressure delta groups.

---

## 5. Bảng & biểu đồ — Dashboard (`index.html`)

### 5.1 Cấu trúc UI

| Thành phần | Vị trí / ID |
|------------|-------------|
| Chart | `<canvas id="rawChart">` — Chart.js bar, LINE A (`#1976D2`) + LINE B (`#64B5F6`) |
| Table | Ô `#rawA_{1..31}`, `#rawB_{1..31}`, `#rawTotal_{1..31}` (total readonly = A+B) |
| Panel | Chart/table nằm **phía trên** SVG (~300px), không overlay lên SVG |
| SVG | iframe `#left-wapper` → `./svg/Raw_UF.svg` |
| Month | **Tháng hiện tại** |

### 5.2 Lấy data

1. `chart.js` init Chart.js + bảng.
2. `loadRawData()` → `GET /api/rawuf/{month}/{year}` → điền `rawA_*` / `rawB_*` → cập nhật total + chart.
3. **Không** refresh định kỳ bảng (chỉ load 1 lần).
4. Save: `onSaveRaw()` → đọc 31 ô A/B → PUT.
5. Clear: `onClearRaw()` → zeros UI + PUT zeros.
6. Sửa ô `.edi-cell` → cập nhật chart ngay (`input` event).

---

## 6. Bảng & biểu đồ — Record (`record.html`)

Trang tách biệt, **không** có SVG realtime. Chart.js khởi tạo trong `record.js` (không dùng chung `chart.js`).

### 6.1 Khác Dashboard

| | Dashboard (`chart.js`) | Record (`record.js`) |
|--|------------------------|----------------------|
| API | Cùng `rawuf` | Cùng `rawuf` |
| Tháng | Tháng hiện tại | `#datePicker` (`type="month"`) |
| Polling | Không | Không |
| Cell ID | `rawA_N`, `rawB_N`, `rawTotal_N` | `recA_N`, `recB_N`, `recTotal_N` (tạo động) |
| Extra | — | Cột DATE (`rawADate`, …) |
| Save / Clear | `onSaveRaw` / `onClearRaw` | `onSaveRecord` / `onClearRecord` (Clear **có** PUT) |
| Export Excel | Không | Có (XlsxPopulate + `./template/Template.xlsx`) |

### 6.2 Flow Record

1. `DOMContentLoaded` → init date picker + table → load tháng hiện tại
2. Đổi tháng → `GET /api/rawuf/{m}/{y}` → bảng + chart
3. 404 / lỗi → bảng/chart toàn 0
4. Export: rows 3–4, cols B…AF → file `RAW_UF_Record_{YYYY-MM}.xlsx`

---

## 7. Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│ index.html (Dashboard)                                       │
│  ┌─ Chart.js + table LocTho A/B (port 4506, tháng hiện tại) │
│  └─ iframe Raw_UF.svg ← index.js (port 3456, 5s)            │
│       tags → text / line status / pump / van / path / tank  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ record.html                                                  │
│  datePicker → record.js → GET/PUT rawuf                     │
│  → bảng recA/recB/recTotal + Chart.js + Export Excel        │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Ghi chú vận hành

- Dashboard tự `location.reload()` mỗi **1 giờ**.
- SVG cùng origin bắt buộc để JS ghi `contentDocument`.
- Valve ID dùng **hyphen** (`on-van-1`), khác DI (`van1_on`) và RoWater (`on-van1`).
- Line Alarm dựa trên `hieu_suat > 1` (không phải tag ON/OFF riêng).
- BW UF pumps ghi đè shared paths — kiểm tra carefully khi debug dòng chảy.
- Bảng Dashboard **không** poll; chỉ realtime SVG poll 5s.
- Record Clear **có** PUT zeros (khác RoWater Record Clear UI-only).
