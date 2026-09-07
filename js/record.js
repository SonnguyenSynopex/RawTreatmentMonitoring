// ========================================
// RAW UF - Record Page Logic (MQTT + REST fallback)
// ========================================

const RAW_API = 'http://10.100.203.78:4506/api/rawuf';
let rawChartInstance = null;
let currentMonthData = { locThoA: new Array(31).fill(0), locThoB: new Array(31).fill(0) };
let historyUnsub = null;
let activeHistoryTopic = null;

document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  initTableInputs();
  initChart();
  loadDataForSelectedMonth();
});

function pad31(arr) {
  const out = new Array(31).fill(0);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < 31; i++) {
    const n = Number(arr[i] ?? 0);
    out[i] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

function applyRecordPayload(data) {
  if (!data) return false;
  currentMonthData.locThoA = pad31(data.RAWUF_LocThoA || data.lineA);
  currentMonthData.locThoB = pad31(data.RAWUF_LocThoB || data.lineB);
  updateTable(currentMonthData.locThoA, currentMonthData.locThoB);
  updateChart(currentMonthData.locThoA, currentMonthData.locThoB);
  return true;
}

function initDatePicker() {
  const datePicker = document.getElementById('datePicker');
  if (!datePicker) return;

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  datePicker.value = `${yyyy}-${mm}`;

  datePicker.addEventListener('change', loadDataForSelectedMonth);
}

async function loadDataForSelectedMonth() {
  const datePicker = document.getElementById('datePicker');
  if (!datePicker) return;

  const [yearStr, monthStr] = datePicker.value.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const rawADate = document.getElementById('rawADate');
  const rawBDate = document.getElementById('rawBDate');
  const rawTotalDate = document.getElementById('rawTotalDate');
  const displayDate = `${monthStr}/${yearStr}`;

  if (rawADate) rawADate.textContent = displayDate;
  if (rawBDate) rawBDate.textContent = displayDate;
  if (rawTotalDate) rawTotalDate.textContent = displayDate;

  const mqttReady =
    window.RawUfMqtt &&
    window.MQTT_CONFIG &&
    window.MQTT_CONFIG.enabled !== false;

  if (mqttReady) {
    try {
      await window.RawUfMqtt.connect();
      activeHistoryTopic = window.RawUfMqtt.historyTopic(year, month);

      if (historyUnsub) historyUnsub();
      historyUnsub = window.RawUfMqtt.onHistory((topic, payload) => {
        if (topic === activeHistoryTopic) applyRecordPayload(payload);
      });

      const retained = await window.RawUfMqtt.waitForHistory(year, month, 4000);
      if (retained && applyRecordPayload(retained)) {
        console.log('[record] history from MQTT');
        return;
      }
    } catch (e) {
      console.warn('[record] MQTT history failed:', e.message);
    }
  }

  if (window.MQTT_CONFIG && window.MQTT_CONFIG.restFallback === false) {
    applyRecordPayload({ RAWUF_LocThoA: [], RAWUF_LocThoB: [] });
    return;
  }

  try {
    const response = await fetch(`${RAW_API}/${month}/${year}`);
    if (!response.ok) throw new Error('API fetch error');
    const data = await response.json();
    applyRecordPayload(data);
  } catch (error) {
    console.error('Error fetching RAW UF data for Record:', error);
    applyRecordPayload({ RAWUF_LocThoA: [], RAWUF_LocThoB: [] });
  }
}

function initTableInputs() {
  const rowA = document.getElementById('rawARow');
  const rowB = document.getElementById('rawBRow');
  const rowTotal = document.getElementById('rawTotalRow');

  while (rowA.children.length > 2) rowA.removeChild(rowA.lastChild);
  while (rowB.children.length > 2) rowB.removeChild(rowB.lastChild);
  while (rowTotal.children.length > 2) rowTotal.removeChild(rowTotal.lastChild);

  for (let i = 1; i <= 31; i++) {
    let tdA = document.createElement('td');
    tdA.innerHTML = `<input type="number" id="recA_${i}" class="edi-cell" value="0" step="0.1" style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent;">`;
    rowA.appendChild(tdA);

    let tdB = document.createElement('td');
    tdB.innerHTML = `<input type="number" id="recB_${i}" class="edi-cell" value="0" step="0.1" style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent;">`;
    rowB.appendChild(tdB);

    let tdT = document.createElement('td');
    tdT.innerHTML = `<input type="number" id="recTotal_${i}" class="edi-cell" value="0" step="0.1" readonly style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent; font-weight: bold; color: #d50000;">`;
    rowTotal.appendChild(tdT);
  }
}

function updateTable(arrA, arrB) {
  for (let i = 1; i <= 31; i++) {
    const valA = arrA[i - 1] || 0;
    const valB = arrB[i - 1] || 0;
    const total = valA + valB;

    const elA = document.getElementById(`recA_${i}`);
    const elB = document.getElementById(`recB_${i}`);
    const elTotal = document.getElementById(`recTotal_${i}`);

    if (elA) elA.value = valA;
    if (elB) elB.value = valB;
    if (elTotal) elTotal.value = total.toFixed(0);
  }
}

function initChart() {
  const ctx = document.getElementById('rawChart')?.getContext('2d');
  if (!ctx) return;

  rawChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 31 }, (_, i) => i + 1),
      datasets: [
        {
          label: 'LINE A',
          data: new Array(31).fill(0),
          backgroundColor: '#1976D2',
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
        {
          label: 'LINE B',
          data: new Array(31).fill(0),
          backgroundColor: '#64B5F6',
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: 'RAW TREATMENT WATER CHART (m3)',
          font: { size: 16 },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
  applyRecordChartTitle(typeof currentLanguage !== 'undefined' ? currentLanguage : 'en');
}

function applyRecordChartTitle(lang) {
  if (!rawChartInstance) return;
  const titles = {
    en: 'RAW TREATMENT WATER CHART (m3)',
    ko: '원수/UF 수량 차트 (m3)',
  };
  rawChartInstance.options.plugins.title.text = titles[lang === 'ko' ? 'ko' : 'en'];
  rawChartInstance.update('none');
}

function updateChart(arrA, arrB) {
  if (!rawChartInstance) return;
  rawChartInstance.data.datasets[0].data = arrA;
  rawChartInstance.data.datasets[1].data = arrB;
  rawChartInstance.update();
}

async function exportToExcel() {
  try {
    const datePicker = document.getElementById('datePicker');
    const monthStr = datePicker ? datePicker.value : 'Unknown';

    const response = await fetch('./template/Template.xlsx');
    if (!response.ok) throw new Error('Could not fetch Template.xlsx from ./template/Template.xlsx');

    const arrayBuffer = await response.arrayBuffer();
    const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
    const worksheet = workbook.sheet(0);

    const arrA = currentMonthData.locThoA || new Array(31).fill(0);
    const arrB = currentMonthData.locThoB || new Array(31).fill(0);

    for (let i = 0; i < 31; i++) {
      worksheet.row(3).cell(i + 2).value(arrA[i] || 0);
      worksheet.row(4).cell(i + 2).value(arrB[i] || 0);
    }

    const blob = await workbook.outputAsync();
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `RAW_UF_Record_${monthStr}.xlsx`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export Excel failed:', error);
    alert(
      typeof currentLanguage !== 'undefined' && currentLanguage === 'ko'
        ? 'Template.xlsx를 불러오거나 처리하는 중 오류가 발생했습니다!'
        : 'Failed to load/process Template.xlsx!'
    );
  }
}

document.addEventListener('input', (e) => {
  if (e.target.classList.contains('edi-cell')) {
    const arrA = [];
    const arrB = [];
    for (let i = 1; i <= 31; i++) {
      const valA = parseFloat(document.getElementById(`recA_${i}`)?.value) || 0;
      const valB = parseFloat(document.getElementById(`recB_${i}`)?.value) || 0;
      arrA.push(valA);
      arrB.push(valB);

      const elTotal = document.getElementById(`recTotal_${i}`);
      if (elTotal) elTotal.value = (valA + valB).toFixed(0);
    }

    currentMonthData.locThoA = arrA;
    currentMonthData.locThoB = arrB;
    updateChart(arrA, arrB);
  }
});

async function onSaveRecord() {
  const arrA = [];
  const arrB = [];
  for (let i = 1; i <= 31; i++) {
    arrA.push(parseFloat(document.getElementById(`recA_${i}`)?.value) || 0);
    arrB.push(parseFloat(document.getElementById(`recB_${i}`)?.value) || 0);
  }

  const datePicker = document.getElementById('datePicker');
  if (!datePicker) return;
  const [yearStr, monthStr] = datePicker.value.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  currentMonthData.locThoA = arrA;
  currentMonthData.locThoB = arrB;

  try {
    if (window.RawUfMqtt && window.MQTT_CONFIG?.enabled !== false) {
      await window.RawUfMqtt.connect();
      await window.RawUfMqtt.publishHistory(year, month, arrA, arrB);
      updateChart(arrA, arrB);
      alert('Data saved successfully!');
      return;
    }
  } catch (e) {
    console.warn('[record] MQTT save failed, try REST:', e.message);
  }

  try {
    const res = await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: arrA,
        RAWUF_LocThoB: arrB,
      }),
    });

    if (res.ok) {
      alert('Data saved successfully!');
      updateChart(arrA, arrB);
    } else {
      alert('Failed to save data!');
    }
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save data!');
  }
}

async function onClearRecord() {
  if (!confirm('Are you sure you want to clear all data for this month?')) return;

  const emptyArr = new Array(31).fill(0);
  updateTable(emptyArr, emptyArr);
  updateChart(emptyArr, emptyArr);
  currentMonthData.locThoA = emptyArr;
  currentMonthData.locThoB = emptyArr;

  const datePicker = document.getElementById('datePicker');
  if (!datePicker) return;
  const [yearStr, monthStr] = datePicker.value.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  try {
    if (window.RawUfMqtt && window.MQTT_CONFIG?.enabled !== false) {
      await window.RawUfMqtt.connect();
      await window.RawUfMqtt.publishHistory(year, month, emptyArr, emptyArr);
      alert('Data cleared successfully!');
      return;
    }
  } catch (e) {
    console.warn('[record] MQTT clear failed:', e.message);
  }

  try {
    const res = await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: emptyArr,
        RAWUF_LocThoB: emptyArr,
      }),
    });
    if (res.ok) alert('Data cleared successfully!');
    else alert('Failed to clear data!');
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Failed to clear data!');
  }
}
