// ========================================
// CHART & TABLE — MQTT history + REST fallback
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initRawChart();
  loadRawData();
});

let rawChartInstance = null;
const RAW_API = 'http://10.100.203.78:4506/api/rawuf';

function pad31(arr) {
  const out = new Array(31).fill(0);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < 31; i++) {
    const n = Number(arr[i] ?? 0);
    out[i] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

function applyHistoryPayload(data) {
  if (!data) return false;
  const locThoA = pad31(data.RAWUF_LocThoA || data.lineA);
  const locThoB = pad31(data.RAWUF_LocThoB || data.lineB);

  for (let i = 1; i <= 31; i++) {
    const elA = document.getElementById(`rawA_${i}`);
    const elB = document.getElementById(`rawB_${i}`);
    const elTotal = document.getElementById(`rawTotal_${i}`);
    if (elA && elB && elTotal) {
      elA.value = locThoA[i - 1];
      elB.value = locThoB[i - 1];
      elTotal.value = locThoA[i - 1] + locThoB[i - 1];
    }
  }
  updateChartFromData(locThoA, locThoB);
  return true;
}

function initRawChart() {
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
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 } },
        },
      },
    },
  });
}

async function loadRawData() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const mqttReady =
    window.RawUfMqtt &&
    window.MQTT_CONFIG &&
    window.MQTT_CONFIG.enabled !== false;

  if (mqttReady) {
    try {
      await window.RawUfMqtt.connect();
      const want = window.RawUfMqtt.historyTopic(year, month);

      window.RawUfMqtt.onHistory((topic, payload) => {
        if (topic === want) applyHistoryPayload(payload);
      });

      const retained = await window.RawUfMqtt.waitForHistory(year, month, 4000);
      if (retained && applyHistoryPayload(retained)) {
        console.log('[chart] history from MQTT');
        return;
      }
    } catch (e) {
      console.warn('[chart] MQTT history failed:', e.message);
    }
  }

  if (window.MQTT_CONFIG && window.MQTT_CONFIG.restFallback === false) return;

  try {
    const response = await fetch(`${RAW_API}/${month}/${year}`);
    if (!response.ok) throw new Error('API fetch error');
    const data = await response.json();
    applyHistoryPayload(data);
  } catch (error) {
    console.error('Error fetching RAW UF data:', error);
  }
}

function updateChartFromData(arrA, arrB) {
  if (!rawChartInstance) return;
  rawChartInstance.data.datasets[0].data = arrA;
  rawChartInstance.data.datasets[1].data = arrB;
  rawChartInstance.update();
}

async function onSaveRaw() {
  const locThoA = [];
  const locThoB = [];

  for (let i = 1; i <= 31; i++) {
    locThoA.push(parseFloat(document.getElementById(`rawA_${i}`)?.value) || 0);
    locThoB.push(parseFloat(document.getElementById(`rawB_${i}`)?.value) || 0);
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    if (window.RawUfMqtt && window.MQTT_CONFIG?.enabled !== false) {
      await window.RawUfMqtt.connect();
      await window.RawUfMqtt.publishHistory(year, month, locThoA, locThoB);
      updateChartFromData(locThoA, locThoB);
      alert('Data saved successfully!');
      return;
    }
  } catch (e) {
    console.warn('[chart] MQTT save failed, try REST:', e.message);
  }

  try {
    const res = await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: locThoA,
        RAWUF_LocThoB: locThoB,
      }),
    });

    if (res.ok) {
      alert('Data saved successfully!');
      updateChartFromData(locThoA, locThoB);
    } else {
      alert('Failed to save data!');
    }
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save data!');
  }
}

async function onClearRaw() {
  if (!confirm('Are you sure you want to clear all data for this month?')) return;

  const emptyArr = new Array(31).fill(0);

  for (let i = 1; i <= 31; i++) {
    const elA = document.getElementById(`rawA_${i}`);
    const elB = document.getElementById(`rawB_${i}`);
    const elTotal = document.getElementById(`rawTotal_${i}`);
    if (elA) elA.value = 0;
    if (elB) elB.value = 0;
    if (elTotal) elTotal.value = 0;
  }
  updateChartFromData(emptyArr, emptyArr);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    if (window.RawUfMqtt && window.MQTT_CONFIG?.enabled !== false) {
      await window.RawUfMqtt.connect();
      await window.RawUfMqtt.publishHistory(year, month, emptyArr, emptyArr);
      return;
    }
  } catch (e) {
    console.warn('[chart] MQTT clear failed:', e.message);
  }

  try {
    await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: emptyArr,
        RAWUF_LocThoB: emptyArr,
      }),
    });
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

document.addEventListener('input', (e) => {
  if (e.target.classList.contains('edi-cell')) {
    const arrA = [];
    const arrB = [];
    for (let i = 1; i <= 31; i++) {
      arrA.push(parseFloat(document.getElementById(`rawA_${i}`)?.value) || 0);
      arrB.push(parseFloat(document.getElementById(`rawB_${i}`)?.value) || 0);
    }
    updateChartFromData(arrA, arrB);
  }
});
