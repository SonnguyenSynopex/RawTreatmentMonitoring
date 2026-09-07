/**
 * 22 realtime tags — contract from MQTT_HIVEMQ_BACKEND_SPEC.md
 */
export const SYSTEM_ID = 'raw-uf';

/** Units aligned with raw/api.json sample */
export const FLOAT_TAGS = [
  { tagId: 'RAWUF_Phan_tram_be_UF', unit: '%' },
  { tagId: 'RAWUF_Muc_UF', unit: 'm3' },
  { tagId: 'RAWUF_Pressure_input_A', unit: 'bar' },
  { tagId: 'RAWUF_Pressure_output_A', unit: 'bar' },
  { tagId: 'RAWUF_Hieu_suat_line_A', unit: 'bar' },
  { tagId: 'RAWUF_Pressure_input_B', unit: 'bar' },
  { tagId: 'RAWUF_Pressure_output_B', unit: 'bar' },
  { tagId: 'RAWUF_Hieu_suat_line_B', unit: 'bar' },
  { tagId: 'RAWUF_Flow_LocTho_LineA', unit: 'm3' },
  { tagId: 'RAWUF_HieuSuat_LocTho_LineA', unit: '%' },
  { tagId: 'RAWUF_Flow_LocTho_LineB', unit: 'm3' },
  { tagId: 'RAWUF_HieuSuat_LocTho_LineB', unit: '%' },
];

export const BOOL_TAGS = [
  { tagId: 'RAWUF_Waste_BW_UF', unit: null },
  { tagId: 'RAWUF_Raw_Pump', unit: null },
  { tagId: 'RAWUF_Raw_BW_Pump', unit: null },
  { tagId: 'RAWUF_Raw_PumpC', unit: null },
  { tagId: 'RAWUF_HMI01_RAW_PUMP_A', unit: null },
  { tagId: 'RAWUF_BW_Raw_PumpB', unit: null },
  { tagId: 'RAWUF_BW_Raw_PumpA', unit: null },
  { tagId: 'RAWUF_Raw_Pump_15kW', unit: null },
  { tagId: 'RAWUF_BW_UF_PumpA', unit: null },
  { tagId: 'RAWUF_BW_UF_PumpB', unit: null },
];

export const ALL_TAG_IDS = [
  ...FLOAT_TAGS.map((t) => t.tagId),
  ...BOOL_TAGS.map((t) => t.tagId),
];

export const TAG_META = Object.fromEntries([
  ...FLOAT_TAGS.map((t) => [t.tagId, { dataType: 'float', unit: t.unit }]),
  ...BOOL_TAGS.map((t) => [t.tagId, { dataType: 'bool', unit: t.unit }]),
]);

export function normalizeTagValue(tagId, raw) {
  const meta = TAG_META[tagId];
  if (!meta) return null;

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;

  if (meta.dataType === 'bool') {
    return num >= 0.5 ? 1 : 0;
  }
  return num;
}

export function buildTagPayload(tagId, value, ts, quality = 'good') {
  const meta = TAG_META[tagId];
  if (!meta) return null;

  return {
    tagId,
    value,
    dataType: meta.dataType,
    unit: meta.unit,
    quality,
    ts,
  };
}
