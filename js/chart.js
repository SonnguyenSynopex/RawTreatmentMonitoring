// ========================================
// CHART & TABLE DATA MANGEMENT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initRawChart();
  loadRawData();
});

let rawChartInstance = null;
const RAW_API = 'http://10.100.203.78:4506/api/rawuf';

// Initialize Chart
function initRawChart() {
  const ctx = document.getElementById('rawChart')?.getContext('2d');
  if (!ctx) return;
  
  rawChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({length: 31}, (_, i) => i + 1), // 1 to 31
      datasets: [
        {
          label: 'LINE A',
          data: new Array(31).fill(0),
          backgroundColor: '#1976D2', // Xanh dương đậm
          barPercentage: 0.8,
          categoryPercentage: 0.8
        },
        {
          label: 'LINE B',
          data: new Array(31).fill(0),
          backgroundColor: '#64B5F6', // Xanh dương nhạt
          barPercentage: 0.8,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Use custom HTML legend
        title: { display: false }   // Use custom HTML title
      },
      scales: {
        x: { 
          grid: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: { 
          beginAtZero: true,
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

// Fetch data from BE and update table + chart
async function loadRawData() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const response = await fetch(`${RAW_API}/${month}/${year}`);
    if (!response.ok) throw new Error('API fetch error');
    const data = await response.json();

    const locThoA = data.RAWUF_LocThoA || new Array(31).fill(0);
    const locThoB = data.RAWUF_LocThoB || new Array(31).fill(0);

    // Update table inputs
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

    // Update chart
    updateChartFromData(locThoA, locThoB);

  } catch (error) {
    console.error('Error fetching RAW UF data:', error);
  }
}

// Update chart dynamically
function updateChartFromData(arrA, arrB) {
  if (!rawChartInstance) return;
  
  rawChartInstance.data.datasets[0].data = arrA;
  rawChartInstance.data.datasets[1].data = arrB;
  rawChartInstance.update();
}

// Save data from table to BE
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
    const res = await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: locThoA,
        RAWUF_LocThoB: locThoB
      })
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

// Clear table data
async function onClearRaw() {
  if (!confirm('Are you sure you want to clear all data for this month?')) return;

  const emptyArr = new Array(31).fill(0);
  
  // Update UI immediately
  for (let i = 1; i <= 31; i++) {
    const elA = document.getElementById(`rawA_${i}`);
    const elB = document.getElementById(`rawB_${i}`);
    const elTotal = document.getElementById(`rawTotal_${i}`);
    if (elA) elA.value = 0;
    if (elB) elB.value = 0;
    if (elTotal) elTotal.value = 0;
  }
  updateChartFromData(emptyArr, emptyArr);

  // Save empty to BE
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    await fetch(`${RAW_API}/${month}/${year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RAWUF_LocThoA: emptyArr,
        RAWUF_LocThoB: emptyArr
      })
    });
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Thêm listener cho các thẻ input để update chart trực tiếp khi người dùng gõ
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
