# Raw Treatment & UF — Tài liệu logic hiển thị & map API ↔ SVG

> **STATUS: LEGACY SHELL / INCOMPLETE**
>
> Thư mục `RawTreatment&UF/` chỉ còn khung UI tĩnh. **Không dùng để vận hành realtime.**
>
> **Reference (working):** `raw/` (`index.html` + `js/index.js` + `js/chart.js` + `record.html` + `svg/Raw_UF.svg`)

---

## 0. Trạng thái thư mục shell

| | Shell (`RawTreatment&UF/`) | Reference (`raw/`) |
|--|----------------------------|--------------------|
| Status | LEGACY SHELL — incomplete | Production dashboard |
| Dashboard logic | **Thiếu** `js/index.js` | `js/index.js` |
| Record / chart | **Thiếu** `record.html`, `js/record.js`, `js/chart.js` | Có đầy đủ |
| SVG | `svg/RawTreatment&UF.svg` (static) | `svg/Raw_UF.svg` |
| Có sẵn | `index.html`, `js/scolling.js`, `js/time.js`, `css/*`, SVG | Full stack + `api.json` sample |

### Health ping (sai)

Trong `js/scolling.js`:

```
GET http://10.100.203.78:3456/api/tags/latest?systemId=WaterLevelMonitoring
```

→ **Wrong `systemId`.** Reference realtime dùng `systemId=raw-uf`.

---

## 1. File reference (working)

| File | Vai trò |
|------|---------|
| `raw/index.html` | Dashboard: SVG realtime + bảng/biểu đồ Line A/B |
| `raw/record.html` | Trang Record theo tháng + Export |
| `raw/js/index.js` | Fetch SCADA → SVG (pump / van / path / line status / mực nước) |
| `raw/js/chart.js` | Chart.js bar LINE A / LINE B + Save/Clear tháng hiện tại |
| `raw/js/record.js` | Record theo tháng chọn + Export Excel |
| `raw/svg/Raw_UF.svg` | Sơ đồ kỹ thuật (iframe `#left-wapper`) |

---

## 2. API (reference)

### 2.1 Realtime SCADA (Dashboard SVG)

```
GET http://10.100.203.78:3456/api/data/cleaned?systemId=raw-uf
```

- Refresh: **5 giây** (`FETCH_INTERVAL = 5000`)
- Response: `data.data.tags[]`
- Flow: `DOMContentLoaded` → `waitForIframe` → `startMonitoring` → `tick()` → `processData()`

### 2.2 Monthly records (bảng + biểu đồ)

```
GET  http://10.100.203.78:4506/api/rawuf/{month}/{year}
PUT  http://10.100.203.78:4506/api/rawuf/{month}/{year}
```

- Datasets: LINE A / LINE B (m³ × 31 ngày)
- Dashboard (`chart.js`): tháng hiện tại; Record (`record.js`): chọn tháng + Export `Template.xlsx`

---

## 3. Map API `tagId` → SVG text / status

### 3.1 Mức bể & sensors

| API tagId | SVG ID | Format | Mô tả |
|-----------|--------|--------|-------|
| `RAWUF_Phan_tram_be_UF` | `RAWUF_Phan_tram_be_UF` | `N.N%` | % bể UF (+ điều khiển `uf_tank`) |
| `RAWUF_Muc_UF` | `RAWUF_Muc_UF` | `N.NN m3` | Thể tích UF |
| `RAWUF_Pressure_input_A` | cùng tên | `N.NN` | Áp suất vào A |
| `RAWUF_Pressure_output_A` | cùng tên | `N.NN` | Áp suất ra A |
| `RAWUF_Hieu_suat_line_A` | cùng tên | `N.NN` | Hiệu suất A (+ Line status) |
| `RAWUF_Pressure_input_B` | cùng tên | `N.NN` | Áp suất vào B |
| `RAWUF_Pressure_output_B` | cùng tên | `N.NN` | Áp suất ra B |
| `RAWUF_Hieu_suat_line_B` | cùng tên | `N.NN` | Hiệu suất B (+ Line status) |
| `RAWUF_Flow_LocTho_LineA` | cùng tên | `N.NN` | Flow lọc thô A |
| `RAWUF_HieuSuat_LocTho_LineA` | cùng tên | `N.NN` | Hiệu suất lọc thô A |
| `RAWUF_Flow_LocTho_LineB` | cùng tên | `N.NN` | Flow lọc thô B |
| `RAWUF_HieuSuat_LocTho_LineB` | cùng tên | `N.NN` | Hiệu suất lọc thô B |

### 3.2 Line A/B status (`setLineStatus`)

Dựa trên `RAWUF_Hieu_suat_line_{A|B}`:

| Điều kiện | Text SVG | Rect SVG | Hành vi |
|-----------|----------|----------|---------|
| `value > 1` | `textLine{A\|B}Status` = `Alarm` | `rectLine{A\|B}Status` fill `#ff0707` | class `line-status-blink` |
| `value ≤ 1` | `Normal` | fill `#00b600` | không blink |

### 3.3 Status background shapes

| API tagId | SVG ID | Logic |
|-----------|--------|-------|
| `RAWUF_Raw_Pump` | `RAWUF_Raw_Pump` | `1` → fill `#00ff00`; else `#ffffff` |
| `RAWUF_Raw_BW_Pump` | `RAWUF_Raw_BW_Pump` | tương tự |

---

## 4. Logic animation / trạng thái thiết bị

### 4.1 Pumps (`controlPump` — xanh + `fanRotate`)

| API tagId | SVG pump ID |
|-----------|-------------|
| `RAWUF_Raw_PumpC` | `RAWUF_Raw_PumpC` |
| `RAWUF_HMI01_RAW_PUMP_A` | `RAWUF_HMI01_RAW_PUMP_A` |
| `RAWUF_BW_Raw_PumpB` | `RAWUF_BW_Raw_PumpB` |
| `RAWUF_BW_Raw_PumpA` | `RAWUF_BW_Raw_PumpA` |
| `RAWUF_Raw_Pump_15kW` | `RAWUF_Raw_Pump_15kW` |
| `RAWUF_BW_UF_PumpA` | `RAWUF_BW_UF_PumpA` |
| `RAWUF_BW_UF_PumpB` | `RAWUF_BW_UF_PumpB` |

Nhóm logic:

- `groupC_active` = PumpC **hoặc** BW_Raw_PumpB
- `groupA_active` = PumpA **hoặc** BW_Raw_PumpA
- `any_active` = groupC **hoặc** groupA

### 4.2 Raw Pump 15kW — UF membrane ON/OFF

| Khi `RAWUF_Raw_Pump_15kW === 1` | Khi OFF |
|--------------------------------|---------|
| `uf_on_a`, `uf_on_b` visible | `uf_off_a`, `uf_off_b` visible |

### 4.3 BW UF Pump A / B — paths & vans

| Bơm | Paths visible | Van ON | Ghi đè khi chạy |
|-----|---------------|--------|-----------------|
| `RAWUF_BW_UF_PumpA` | `path2055`, `path2054`, `path2043`, `path2044`…`2053`, `uf_back_a` | 13, 14, 11, 9 (`on-van-{n}`) | Đóng van 18, 19; tắt `path2013`, `path2014`…`2023`, `path1981`, `path1982`…`1991` |
| `RAWUF_BW_UF_PumpB` | `path2056`, `path2042`, `path2031`, `path2032`…`2041`, `uf_back_b` | 15, 16, 12, 10 | Đóng van 17, 20; tắt `path1`, `path1992`…`2001`, `path2002`, `path2003`…`2012` |

### 4.4 Paths theo bơm / nhóm

| Controller | Path SVG IDs |
|------------|--------------|
| PumpC riêng | `path1966`, `path2025` |
| PumpA riêng | `path1967`, `path2026` |
| BW_Raw_PumpB riêng | `path1968`, `path2027`, `path2030` |
| BW_Raw_PumpA riêng | `path1969`, `path2028`, `path2029` |
| groupC (PumpC \| BW B) | `path1977`, `path1970`, `path1978`, `path1979` |
| groupA (PumpA \| BW A) | `path1972`…`path1976` |
| any_active (shared) | `path1`, `path1980`, `path1981`, `path1982`…`1991`, `path1992`…`2001`, `path2002`, `path2013`, `path2024`, `path2003`…`2012`, `path2014`…`2023` |

### 4.5 Van / BSV

| Điều kiện | Van / BSV |
|-----------|-----------|
| PumpC | `on-van-1`, `on-van-2` |
| PumpA | `on-van-3`, `on-van-4` |
| BW_Raw_PumpB | `on-van-5`, `on-van-6`, `on-bsv-1` |
| BW_Raw_PumpA | `on-van-7`, `on-van-8`, `on-bsv-2` |
| groupC_active | `on-bsv-13` … `on-bsv-21` |
| groupA_active | `on-bsv-4` … `on-bsv-12` |

OFF tương ứng dùng `off-van-*` / `off-bsv-*`.

### 4.6 Water levels

| API tagId | SVG ID | Logic |
|-----------|--------|-------|
| `RAWUF_Phan_tram_be_UF` | `uf_tank` | `scaleY(%/100)` |
| `RAWUF_Waste_BW_UF` | `RAWUF_Waste_BW_UF` | `1` → 70%; `0` → 30% |

---

## 5. Bảng & biểu đồ (reference)

| Trang | File | API | Nội dung |
|-------|------|-----|----------|
| Dashboard | `chart.js` | `4506/api/rawuf` | LINE A / LINE B, tháng hiện tại, Save/Clear |
| Record | `record.js` | cùng API | Chọn tháng, Export Excel |

Shell **không** có các file này.

---

## 6. Sơ đồ tổng quan

```
┌─ LEGACY SHELL: RawTreatment&UF/ ──────────────────────────────┐
│ index.html → SVG static + scolling.js (sai systemId) + time.js │
│ ✗ thiếu index.js / chart / record                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼ dùng thay thế
┌─ REFERENCE: raw/ ──────────────────────────────────────────────┐
│ iframe Raw_UF.svg ← index.js (systemId=raw-uf, 5s)             │
│ chart + record ← port 4506 /api/rawuf                          │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Ghi chú vận hành / migrate

- Mở dashboard thật: **`raw/index.html`** (record: `raw/record.html`).
- Khi rebuild từ shell: port mappings từ `raw/js/index.js`; sửa health ping sang `raw-uf`.
- SVG shell vs `Raw_UF.svg` có thể khác ID — đối chiếu bảng trên trước khi gắn JS.
