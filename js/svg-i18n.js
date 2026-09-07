/**
 * SVG label i18n (EN ↔ KO) for Raw_UF.svg inside iframe #left-wapper
 */
(function (global) {
  /** Exact string map — keys = English source in SVG */
  const LABELS = {
    'MMF A': { en: 'MMF A', ko: 'MMF A' },
    'MMF B': { en: 'MMF B', ko: 'MMF B' },
    'BIRM A': { en: 'BIRM A', ko: 'BIRM A' },
    'BIRM B': { en: 'BIRM B', ko: 'BIRM B' },
    'Multi-Media Filtration Tank': {
      en: 'Multi-Media Filtration Tank',
      ko: '전처리탱크',
    },
    'Iron & Manganese Removal Filter': {
      en: 'Iron & Manganese Removal Filter',
      ko: '철·망간 제거 탱크',
    },
    'Iron &amp; Manganese Removal Filter': {
      en: 'Iron & Manganese Removal Filter',
      ko: '철·망간 제거 탱크',
    },
    '전처리탱크': {
      en: 'Multi-Media Filtration Tank',
      ko: '전처리탱크',
    },
    '철·망간 제거 탱크': {
      en: 'Iron & Manganese Removal Filter',
      ko: '철·망간 제거 탱크',
    },
    'A/C FILRET A': { en: 'A/C FILRET A', ko: '활성탄필터 A' },
    'A/C FILRET B': { en: 'A/C FILRET B', ko: '활성탄필터 B' },
    'SOFTENER A': { en: 'SOFTENER A', ko: '연수기 A' },
    'SOFTENER B': { en: 'SOFTENER B', ko: '연수기 B' },
    'BW PUMP A': { en: 'BW PUMP A', ko: '역세펌프 A' },
    'BW PUMP B': { en: 'BW PUMP B', ko: '역세펌프 B' },
    'RAW WATER': { en: 'RAW WATER', ko: '원수' },
    'RAW WATER PUMP A': { en: 'RAW WATER PUMP A', ko: '원수펌프 A' },
    'RAW WATER PUMP B': { en: 'RAW WATER PUMP B', ko: '원수펌프 B' },
    'RAW WATER PUMP C': { en: 'RAW WATER PUMP C', ko: '원수펌프 C' },
    Vavle: { en: 'Vavle', ko: '밸브' },
    Valve: { en: 'Valve', ko: '밸브' },
    SERVICE: { en: 'SERVICE', ko: '운전' },
    BACKWASH: { en: 'BACKWASH', ko: '역세' },
    'LINE A': { en: 'LINE A', ko: '라인 A' },
    'LINE B': { en: 'LINE B', ko: '라인 B' },
    'Capa:70m3/h': { en: 'Capa:70m3/h', ko: '용량:70m3/h' },
    'Flow(m3/h)': { en: 'Flow(m3/h)', ko: '유량(m3/h)' },
    'H.Suất(%)': { en: 'Eff.(%)', ko: '효율(%)' },
    'Eff.(%)': { en: 'Eff.(%)', ko: '효율(%)' },
    'Efficiency(%)': { en: 'Efficiency(%)', ko: '효율(%)' },
    'UF WATER TANK': { en: 'UF WATER TANK', ko: 'UF 물탱크' },
    'CAPA: 430m3': { en: 'CAPA: 430m3', ko: '용량: 430m3' },
    'CAPA: 430 m3': { en: 'CAPA: 430 m3', ko: '용량: 430 m3' },
    INLET: { en: 'INLET', ko: '입구' },
    OUTLET: { en: 'OUTLET', ko: '출구' },
    Normal: { en: 'Normal', ko: '정상' },
    Alarm: { en: 'Alarm', ko: '알람' },
    'WASTE STORE TANK': { en: 'WASTE STORE TANK', ko: '폐수저장탱크' },
    Pressure: { en: 'Pressure', ko: '압력' },
    Turbidity: { en: 'Turbidity', ko: '탁도' },
    outlet: { en: 'outlet', ko: '출구' },
    inlet: { en: 'inlet', ko: '입구' },
    'PRESSURE(Bar) - LINE A': { en: 'PRESSURE(Bar) - LINE A', ko: '압력(Bar) - 라인 A' },
    'PRESSURE(Bar) - LINE B': { en: 'PRESSURE(Bar) - LINE B', ko: '압력(Bar) - 라인 B' },
  };

  const STATUS = {
    Normal: { en: 'Normal', ko: '정상' },
    Alarm: { en: 'Alarm', ko: '알람' },
  };

  /** Reverse lookup: any known lang string → key */
  const lookupKey = Object.create(null);
  Object.keys(LABELS).forEach((key) => {
    lookupKey[LABELS[key].en] = key;
    lookupKey[LABELS[key].ko] = key;
    lookupKey[key] = key;
  });

  function normalize(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function translateStatus(word, lang) {
    const key = word === '알람' || word === 'Alarm' ? 'Alarm' : 'Normal';
    return STATUS[key][lang === 'ko' ? 'ko' : 'en'];
  }

  function applyToSvgDoc(doc, lang) {
    if (!doc) return;
    const L = lang === 'ko' ? 'ko' : 'en';

    const nodes = doc.querySelectorAll('tspan, text');
    nodes.forEach((el) => {
      // Only leaf text nodes (tspan with no child elements, or text with only text)
      if (el.children && el.children.length > 0) return;

      const raw = el.textContent;
      if (!raw || !raw.trim()) return;

      // Keep leading spaces used for layout in some tspans
      const leading = raw.match(/^\s*/)?.[0] || '';
      const trailing = raw.match(/\s*$/)?.[0] || '';
      const core = normalize(raw);
      if (!core) return;

      // Skip pure numbers / values
      if (/^[\d.\s%]+$/.test(core)) return;
      if (/^\d+(\.\d+)?\s*m3$/i.test(core)) return;

      let key = el.getAttribute('data-i18n-key');
      if (!key) {
        key = lookupKey[core];
        if (!key) return;
        el.setAttribute('data-i18n-key', key);
      }

      const entry = LABELS[key];
      if (!entry) return;
      el.textContent = leading + entry[L] + trailing;
    });
  }

  function applySvgLanguage(lang) {
    const iframe = document.getElementById('left-wapper');
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.documentElement) return;
      applyToSvgDoc(doc, lang);
    } catch (e) {
      console.warn('[svg-i18n]', e.message);
    }
  }

  global.SvgI18n = {
    LABELS,
    applySvgLanguage,
    applyToSvgDoc,
    translateStatus,
  };
})(window);
