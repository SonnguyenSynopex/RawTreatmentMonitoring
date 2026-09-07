function controlPump(iframeDoc, pumpId, isRunning) {
  const pumpElement = iframeDoc.getElementById(pumpId);
  if (!pumpElement) return;

  if (isRunning) {
    pumpElement.style.fill = '#00FF00';
    pumpElement.style.animation = 'fanRotate 1.333s linear infinite';
    pumpElement.style.transformOrigin = 'center';
    pumpElement.style.transformBox = 'fill-box';
  } else {
    pumpElement.style.animation = 'none';
    pumpElement.style.fill = '#b3b3b3ff';
  }
}

function controlWaterLevel(iframeDoc, tankId, percentage) {
  const waterElement = iframeDoc.getElementById(tankId);
  if (!waterElement) return;

  const level = Math.max(0, Math.min(100, percentage));
  const scaleY = level / 100;

  waterElement.style.transform = `scaleY(${scaleY})`;
  waterElement.style.transition = 'transform 1s ease-in-out';
  waterElement.style.transformOrigin = 'bottom';
  waterElement.style.transformBox = 'fill-box';
}

// ========================================
// Data source: MQTT (Vercel) + REST fallback (LAN)
// ========================================
const API_URL = 'http://10.100.203.78:3456/api/data/cleaned?systemId=raw-uf';
const FETCH_INTERVAL = 5000; // 5 seconds
let fetchInterval = null;
let usingMqtt = false;

/**
 * Láº¥y iframe document
 */
function getIframeDocument() {
  const iframe = document.getElementById('left-wapper');
  if (!iframe) return null;
  try {
    return iframe.contentDocument || iframe.contentWindow.document;
  } catch (e) {
    return null;
  }
}

/**
 * Chá» iframe load xong
 */
function waitForIframe(callback) {
  const iframe = document.getElementById('left-wapper');
  if (!iframe) return;

  const check = () => {
    const doc = getIframeDocument();
    if (doc && doc.readyState === 'complete') {
      callback();
    } else {
      setTimeout(check, 200);
    }
  };
  iframe.addEventListener('load', check);
  check();
}

function ensureStatusBlinkStyle(iframeDoc) {
  if (!iframeDoc || iframeDoc.getElementById('line-status-blink-style')) return;
  const style = iframeDoc.createElementNS
    ? iframeDoc.createElementNS('http://www.w3.org/2000/svg', 'style')
    : iframeDoc.createElement('style');
  style.id = 'line-status-blink-style';
  style.textContent = `
    @keyframes lineStatusBlink {
      0%, 40% { opacity: 1; }
      50%, 90% { opacity: 0.15; }
      100% { opacity: 1; }
    }
    .line-status-blink {
      animation: lineStatusBlink 2.5s ease-in-out infinite;
    }
  `;
  iframeDoc.documentElement.appendChild(style);
}

/**
 * Helper: láº¥y giÃ¡ trá»‹ tag theo tagId
 */
function getTagValue(tags, tagId) {
  const tag = tags.find(t => t.tagId === tagId);
  return tag ? tag.value : null;
}

/**
 * Fetch data tá»« API
 */
async function fetchData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    return null;
  }
}

/**
 * Xá»­ lÃ½ data vÃ  cáº­p nháº­t SVG
 */
function processData(data) {
  if (!data || !data.data || !data.data.tags) return;

  const iframeDoc = getIframeDocument();
  if (!iframeDoc) return;

  ensureStatusBlinkStyle(iframeDoc);

  const tags = data.data.tags;

  // Helper: set text in SVG element
  function setText(id, text) {
    const el = iframeDoc.getElementById(id);
    if (el) el.textContent = text;
  }

  // --- Text displays ---
  const phanTram = getTagValue(tags, 'RAWUF_Phan_tram_be_UF');
  if (phanTram !== null) setText('RAWUF_Phan_tram_be_UF', Math.round(phanTram) + '%');

  const mucUF = getTagValue(tags, 'RAWUF_Muc_UF');
  if (mucUF !== null) setText('RAWUF_Muc_UF', (mucUF).toFixed(2) + ' m3');

  // Sensors: format 00.00
  const sensorTags = [
    'RAWUF_Pressure_input_A', 'RAWUF_Pressure_output_A', 'RAWUF_Hieu_suat_line_A',
    'RAWUF_Pressure_input_B', 'RAWUF_Pressure_output_B', 'RAWUF_Hieu_suat_line_B',
    'RAWUF_Flow_LocTho_LineA', 'RAWUF_HieuSuat_LocTho_LineA',
    'RAWUF_Flow_LocTho_LineB', 'RAWUF_HieuSuat_LocTho_LineB'
  ];

  sensorTags.forEach(tagId => {
    const val = getTagValue(tags, tagId);
    if (val !== null) setText(tagId, val.toFixed(2));
  });

  // Line A/B status: 0-1 Normal, 1-3 Alarm (dá»±a trÃªn hiá»‡u suáº¥t)
  function setLineStatus(line, value) {
    if (value === null || value === undefined) return;
    const isAlarm = value > 1;
    const textEl = iframeDoc.getElementById(`textLine${line}Status`);
    const rectEl = iframeDoc.getElementById(`rectLine${line}Status`);
    if (textEl) {
      textEl.textContent = window.SvgI18n
        ? window.SvgI18n.translateStatus(
            isAlarm ? 'Alarm' : 'Normal',
            typeof currentLanguage !== 'undefined' ? currentLanguage : 'en'
          )
        : isAlarm
          ? 'Alarm'
          : 'Normal';
      textEl.style.fill = '#ffffff';
      textEl.classList.toggle('line-status-blink', isAlarm);
      if (!isAlarm) textEl.style.opacity = '1';
    }
    if (rectEl) {
      rectEl.style.fill = isAlarm ? '#ff0707' : '#00b600';
      rectEl.classList.toggle('line-status-blink', isAlarm);
      if (!isAlarm) rectEl.style.opacity = '1';
    }
  }

  setLineStatus('A', getTagValue(tags, 'RAWUF_Hieu_suat_line_A'));
  setLineStatus('B', getTagValue(tags, 'RAWUF_Hieu_suat_line_B'));

  // --- Water level ---
  const ufLevel = getTagValue(tags, 'RAWUF_Phan_tram_be_UF');
  if (ufLevel !== null) controlWaterLevel(iframeDoc, 'uf_tank', ufLevel);

  const wasteBwUf = getTagValue(tags, 'RAWUF_Waste_BW_UF');
  if (wasteBwUf !== null) {
    const level = wasteBwUf === 1 ? 70 : 30;
    controlWaterLevel(iframeDoc, 'RAWUF_Waste_BW_UF', level);
  }

  // --- Pump Shapes / Status Backgrounds ---
  function setFillColor(id, val) {
    const el = iframeDoc.getElementById(id);
    if (el) {
        el.style.fill = val === 1 ? '#00ff00' : '#ffffff';
    }
  }

  const rawPumpStatus = getTagValue(tags, 'RAWUF_Raw_Pump');
  if (rawPumpStatus !== null) setFillColor('RAWUF_Raw_Pump', rawPumpStatus);

  const rawBWPumpStatus = getTagValue(tags, 'RAWUF_Raw_BW_Pump');
  if (rawBWPumpStatus !== null) setFillColor('RAWUF_Raw_BW_Pump', rawBWPumpStatus);

  // --- Pumps: show/hide paths + valves ---
  function setVisible(id, visible) {
    const el = iframeDoc.getElementById(id);
    if (el) el.style.visibility = visible ? 'visible' : 'hidden';
  }

  // Helper: generate range of IDs
  function pathRange(prefix, from, to) {
    const ids = [];
    for (let i = from; i <= to; i++) ids.push(prefix + i);
    return ids;
  }

  const pumpC = getTagValue(tags, 'RAWUF_Raw_PumpC') === 1;
  const pumpA = getTagValue(tags, 'RAWUF_HMI01_RAW_PUMP_A') === 1;
  const bwPumpB = getTagValue(tags, 'RAWUF_BW_Raw_PumpB') === 1;
  const bwPumpA = getTagValue(tags, 'RAWUF_BW_Raw_PumpA') === 1;
  
  const pump15kW = getTagValue(tags, 'RAWUF_Raw_Pump_15kW') === 1;
  const bwUfPumpA = getTagValue(tags, 'RAWUF_BW_UF_PumpA') === 1;
  const bwUfPumpB = getTagValue(tags, 'RAWUF_BW_UF_PumpB') === 1;

  controlPump(iframeDoc, 'RAWUF_Raw_PumpC', pumpC);
  controlPump(iframeDoc, 'RAWUF_HMI01_RAW_PUMP_A', pumpA);
  controlPump(iframeDoc, 'RAWUF_BW_Raw_PumpB', bwPumpB);
  controlPump(iframeDoc, 'RAWUF_BW_Raw_PumpA', bwPumpA);
  
  controlPump(iframeDoc, 'RAWUF_Raw_Pump_15kW', pump15kW);
  controlPump(iframeDoc, 'RAWUF_BW_UF_PumpA', bwUfPumpA);
  controlPump(iframeDoc, 'RAWUF_BW_UF_PumpB', bwUfPumpB);

  const groupC_active = pumpC || bwPumpB;
  const groupA_active = pumpA || bwPumpA;
  const any_active = groupC_active || groupA_active;

  // RAWUF_Raw_Pump_15kW specific toggles
  setVisible('uf_on_a', pump15kW);
  setVisible('uf_off_a', !pump15kW);
  setVisible('uf_on_b', pump15kW);
  setVisible('uf_off_b', !pump15kW);

  // RAWUF_BW_UF_PumpA specific paths
  const bwUfPumpA_paths = ['path2055', 'path2054', 'path2043', ...pathRange('path', 2044, 2053)];
  bwUfPumpA_paths.forEach(id => setVisible(id, bwUfPumpA));
  setVisible('uf_back_a', bwUfPumpA);

  // RAWUF_BW_UF_PumpA vans: 13, 14, 11, 9
  [13, 14, 11, 9].forEach(i => {
    setVisible(`on-van-${i}`, bwUfPumpA);
    setVisible(`off-van-${i}`, !bwUfPumpA);
  });

  // RAWUF_BW_UF_PumpB specific paths
  const bwUfPumpB_paths = ['path2056', 'path2042', 'path2031', ...pathRange('path', 2032, 2041)];
  bwUfPumpB_paths.forEach(id => setVisible(id, bwUfPumpB));
  setVisible('uf_back_b', bwUfPumpB);

  // RAWUF_BW_UF_PumpB vans: 15, 16, 12, 10
  [15, 16, 12, 10].forEach(i => {
    setVisible(`on-van-${i}`, bwUfPumpB);
    setVisible(`off-van-${i}`, !bwUfPumpB);
  });

  // Paths riÃªng tá»«ng bÆ¡m (khÃ´ng tÃ­nh pháº§n chung cá»§a cá»¥m)
  const pumpC_paths = ['path1966', 'path2025'];
  const pumpA_paths = ['path1967', 'path2026'];
  const bwPumpB_paths = ['path1968', 'path2027', 'path2030'];
  const bwPumpA_paths = ['path1969', 'path2028', 'path2029'];

  // Paths chung cá»§a cá»¥m bÆ¡m C & BW B
  const groupC_paths = ['path1977', 'path1970', 'path1978', 'path1979'];

  // Paths chung cá»§a cá»¥m bÆ¡m A & BW A
  const groupA_paths = ['path1972', 'path1973', 'path1974', 'path1975', 'path1976'];

  // Paths dÃ¹ng chung toÃ n há»‡ thá»‘ng
  const shared_paths = [
    'path1','path1980', 'path1981',
    ...pathRange('path', 1982, 1991),
    ...pathRange('path', 1992, 2001),
    'path2002', 'path2013', 'path2024',
    ...pathRange('path', 2003, 2012),
    ...pathRange('path', 2014, 2023)
  ];

  pumpC_paths.forEach(id => setVisible(id, pumpC));
  pumpA_paths.forEach(id => setVisible(id, pumpA));
  bwPumpB_paths.forEach(id => setVisible(id, bwPumpB));
  bwPumpA_paths.forEach(id => setVisible(id, bwPumpA));

  groupC_paths.forEach(id => setVisible(id, groupC_active));
  groupA_paths.forEach(id => setVisible(id, groupA_active));

  shared_paths.forEach(id => setVisible(id, any_active));

  // Ghi Ä‘Ã¨ logic cho RAWUF_BW_UF_PumpA
  if (bwUfPumpA) {
    // Cá»‘ tÃ¬nh Ä‘Ã³ng van 18, 19
    setVisible('on-van-18', false);
    setVisible('off-van-18', true);
    setVisible('on-van-19', false);
    setVisible('off-van-19', true);

    // Táº¯t cÃ¡c Ä‘Æ°á»ng nÆ°á»›c dÃ¹ng chung do bÆ¡m nÃ y khÃ´ng cháº£y qua
    setVisible('path2013', false);
    pathRange('path', 2014, 2023).forEach(id => setVisible(id, false));
    setVisible('path1981', false);
    pathRange('path', 1982, 1991).forEach(id => setVisible(id, false));
  } else {
    // Máº·c Ä‘á»‹nh hoáº·c logic cho bÆ¡m khÃ¡c (náº¿u khÃ´ng má»Ÿ bÆ¡m A thÃ¬ van nÃ y Ä‘Ã³ng, hoáº·c má»Ÿ khi cáº§n)
    // TÃ´i sáº½ set vá» tráº¡ng thÃ¡i Ä‘Ã³ng an toÃ n khi bÆ¡m khÃ´ng cháº¡y, náº¿u cÃ³ yÃªu cáº§u má»Ÿ lÃºc táº¯t bÆ¡m bÃ¡o tÃ´i chá»‰nh láº¡i nhÃ©.
    setVisible('on-van-18', false);
    setVisible('off-van-18', true);
    setVisible('on-van-19', false);
    setVisible('off-van-19', true);
  }

  // Ghi Ä‘Ã¨ logic cho RAWUF_BW_UF_PumpB
  if (bwUfPumpB) {
    // Cá»‘ tÃ¬nh Ä‘Ã³ng van 17, 20
    setVisible('on-van-17', false);
    setVisible('off-van-17', true);
    setVisible('on-van-20', false);
    setVisible('off-van-20', true);

    // Táº¯t cÃ¡c Ä‘Æ°á»ng nÆ°á»›c dÃ¹ng chung do bÆ¡m nÃ y khÃ´ng cháº£y qua
    setVisible('path1', false);
    pathRange('path', 1992, 2001).forEach(id => setVisible(id, false));
    setVisible('path2002', false);
    pathRange('path', 2003, 2012).forEach(id => setVisible(id, false));
  } else {
    // Máº·c Ä‘á»‹nh set vá» tráº¡ng thÃ¡i Ä‘Ã³ng an toÃ n khi bÆ¡m khÃ´ng cháº¡y
    setVisible('on-van-17', false);
    setVisible('off-van-17', true);
    setVisible('on-van-20', false);
    setVisible('off-van-20', true);
  }

  // Van riÃªng tá»«ng bÆ¡m
  setVisible('on-van-1', pumpC); setVisible('off-van-1', !pumpC);
  setVisible('on-van-2', pumpC); setVisible('off-van-2', !pumpC);

  setVisible('on-van-3', pumpA); setVisible('off-van-3', !pumpA);
  setVisible('on-van-4', pumpA); setVisible('off-van-4', !pumpA);

  setVisible('on-van-5', bwPumpB); setVisible('off-van-5', !bwPumpB);
  setVisible('on-van-6', bwPumpB); setVisible('off-van-6', !bwPumpB);
  setVisible('on-bsv-1', bwPumpB); setVisible('off-bsv-1', !bwPumpB);

  setVisible('on-van-7', bwPumpA); setVisible('off-van-7', !bwPumpA);
  setVisible('on-van-8', bwPumpA); setVisible('off-van-8', !bwPumpA);
  setVisible('on-bsv-2', bwPumpA); setVisible('off-bsv-2', !bwPumpA);

  // GroupC valves: bsv-13..21 (Cháº¡y khi PumpC hoáº·c BW_PumpB cháº¡y)
  for (let i = 13; i <= 21; i++) {
    setVisible(`on-bsv-${i}`, groupC_active);
    setVisible(`off-bsv-${i}`, !groupC_active);
  }

  // GroupA valves: bsv-4..12 (Cháº¡y khi PumpA hoáº·c BW_PumpA cháº¡y)
  for (let i = 4; i <= 12; i++) {
    setVisible(`on-bsv-${i}`, groupA_active);
    setVisible(`off-bsv-${i}`, !groupA_active);
  }
}

/**
 * Main tick (REST fallback only)
 */
async function tick() {
  if (usingMqtt) return;
  const data = await fetchData();
  if (data) processData(data);
}

/**
 * Start monitoring â€” Æ°u tiÃªn MQTT WSS, fallback REST LAN
 */
async function startMonitoring() {
  const mqttReady =
    window.RawUfMqtt &&
    window.MQTT_CONFIG &&
    window.MQTT_CONFIG.enabled !== false;

  if (mqttReady) {
    try {
      await window.RawUfMqtt.connect();
      usingMqtt = true;
      window.RawUfMqtt.onTags((envelope) => processData(envelope));
      const cached = window.RawUfMqtt.getCachedTagsEnvelope();
      if (cached) processData(cached);
      console.log('[dashboard] using MQTT realtime');
      return;
    } catch (e) {
      console.warn('[dashboard] MQTT failed, fallback REST:', e.message);
      usingMqtt = false;
    }
  }

  if (window.MQTT_CONFIG && window.MQTT_CONFIG.restFallback === false) {
    console.error('[dashboard] no data source available');
    return;
  }

  tick();
  if (fetchInterval) clearInterval(fetchInterval);
  fetchInterval = setInterval(tick, FETCH_INTERVAL);
}

/**
 * Cleanup
 */
window.addEventListener('beforeunload', () => {
  if (fetchInterval) clearInterval(fetchInterval);
});

/**
 * Init
 */
document.addEventListener('DOMContentLoaded', () => {
  waitForIframe(() => {
    if (window.SvgI18n) {
      window.SvgI18n.applySvgLanguage(typeof currentLanguage !== 'undefined' ? currentLanguage : 'en');
    }
    startMonitoring();
  });
});