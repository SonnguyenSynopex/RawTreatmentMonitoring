// ========================================
// RAW UF - Record Page Logic
// ========================================

const RAW_API = 'http://10.100.203.78:4506/api/rawuf';
let rawChartInstance = null;
let currentMonthData = { locThoA: new Array(31).fill(0), locThoB: new Array(31).fill(0) };

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    initTableInputs();
    initChart();
    loadDataForSelectedMonth();
});

// Initialize the month picker with current month
function initDatePicker() {
    const datePicker = document.getElementById('datePicker');
    if (!datePicker) return;

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    datePicker.value = `${yyyy}-${mm}`;

    // Reload data when user changes the month
    datePicker.addEventListener('change', loadDataForSelectedMonth);
}

// Fetch data from API and populate chart and table
async function loadDataForSelectedMonth() {
    const datePicker = document.getElementById('datePicker');
    if (!datePicker) return;
    
    const [yearStr, monthStr] = datePicker.value.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // Xử lý logic hiện ngày tháng vào cột DATE
    const rawADate = document.getElementById('rawADate');
    const rawBDate = document.getElementById('rawBDate');
    const rawTotalDate = document.getElementById('rawTotalDate');
    const displayDate = `${monthStr}/${yearStr}`;
    
    if (rawADate) rawADate.textContent = displayDate;
    if (rawBDate) rawBDate.textContent = displayDate;
    if (rawTotalDate) rawTotalDate.textContent = displayDate;

    try {
        const response = await fetch(`${RAW_API}/${month}/${year}`);
        if (!response.ok) throw new Error('API fetch error');
        const data = await response.json();

        currentMonthData.locThoA = data.RAWUF_LocThoA || new Array(31).fill(0);
        currentMonthData.locThoB = data.RAWUF_LocThoB || new Array(31).fill(0);

        updateTable(currentMonthData.locThoA, currentMonthData.locThoB);
        updateChart(currentMonthData.locThoA, currentMonthData.locThoB);

    } catch (error) {
        console.error('Error fetching RAW UF data for Record:', error);
        alert('Failed to load data for the selected month.');
    }
}

// Init the HTML table inputs
function initTableInputs() {
    const rowA = document.getElementById('rawARow');
    const rowB = document.getElementById('rawBRow');
    const rowTotal = document.getElementById('rawTotalRow');
    
    // Xóa các ô cũ ngoại trừ nhãn và ngày (giữ lại 2 ô đầu tiên)
    while (rowA.children.length > 2) rowA.removeChild(rowA.lastChild);
    while (rowB.children.length > 2) rowB.removeChild(rowB.lastChild);
    while (rowTotal.children.length > 2) rowTotal.removeChild(rowTotal.lastChild);

    for (let i = 1; i <= 31; i++) {
        // Line A
        let tdA = document.createElement('td');
        tdA.innerHTML = `<input type="number" id="recA_${i}" class="edi-cell" value="0" step="0.1" style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent;">`;
        rowA.appendChild(tdA);

        // Line B
        let tdB = document.createElement('td');
        tdB.innerHTML = `<input type="number" id="recB_${i}" class="edi-cell" value="0" step="0.1" style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent;">`;
        rowB.appendChild(tdB);

        // Total
        let tdT = document.createElement('td');
        tdT.innerHTML = `<input type="number" id="recTotal_${i}" class="edi-cell" value="0" step="0.1" readonly style="width:100%; box-sizing:border-box; border:none; text-align:center; padding: 2px; font-size:11px; background: transparent; font-weight: bold; color: #d50000;">`;
        rowTotal.appendChild(tdT);
    }
}

// Update the HTML table with values
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

// Initialize the Chart.js chart
function initChart() {
    const ctx = document.getElementById('rawChart')?.getContext('2d');
    if (!ctx) return;
    
    rawChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 31}, (_, i) => i + 1), // Days 1 to 31
            datasets: [
                {
                    label: 'LINE A',
                    data: new Array(31).fill(0),
                    backgroundColor: '#1976D2',
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                },
                {
                    label: 'LINE B',
                    data: new Array(31).fill(0),
                    backgroundColor: '#64B5F6',
                    barPercentage: 0.8,
                    categoryPercentage: 0.8
                }
            ]
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
                    font: { size: 16 }
                }
            },
            scales: {
                x: { 
                    grid: { display: false }
                },
                y: { 
                    beginAtZero: true
                }
            }
        }
    });
}

// Update Chart with new data
function updateChart(arrA, arrB) {
    if (!rawChartInstance) return;
    
    rawChartInstance.data.datasets[0].data = arrA;
    rawChartInstance.data.datasets[1].data = arrB;
    rawChartInstance.update();
}

// Export Table to Excel using XlsxPopulate
async function exportToExcel() {
    try {
        const datePicker = document.getElementById('datePicker');
        const monthStr = datePicker ? datePicker.value : "Unknown";

        // Fetch template
        const response = await fetch('./template/Template.xlsx');
        if (!response.ok) throw new Error('Could not fetch Template.xlsx from ./template/Template.xlsx');
        
        const arrayBuffer = await response.arrayBuffer();

        // Load into XlsxPopulate workbook
        const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);

        // Get the first worksheet
        const worksheet = workbook.sheet(0);

        // Ensure we have currentMonthData
        const arrA = currentMonthData.locThoA || new Array(31).fill(0);
        const arrB = currentMonthData.locThoB || new Array(31).fill(0);

        // Line A: Row 3, Columns B to AF (2 to 32)
        // Line B: Row 4, Columns B to AF (2 to 32)
        for (let i = 0; i < 31; i++) {
            worksheet.row(3).cell(i + 2).value(arrA[i] || 0);
            worksheet.row(4).cell(i + 2).value(arrB[i] || 0);
        }

        // Generate Blob and Download
        const blob = await workbook.outputAsync();
        
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `RAW_UF_Record_${monthStr}.xlsx`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Export Excel failed:', error);
        alert('Có lỗi xảy ra khi tải/xử lý Template.xlsx!');
    }
}

// Thêm listener cho các thẻ input để update chart trực tiếp khi người dùng gõ
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
        if(elTotal) elTotal.value = (valA + valB).toFixed(0);
      }
      
      currentMonthData.locThoA = arrA;
      currentMonthData.locThoB = arrB;
      updateChart(arrA, arrB);
    }
});

// Save Function
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

    try {
      const res = await fetch(`${RAW_API}/${month}/${year}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RAWUF_LocThoA: arrA,
          RAWUF_LocThoB: arrB
        })
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

// Clear Function
async function onClearRecord() {
    if (!confirm('Are you sure you want to clear all data for this month?')) return;
  
    const emptyArr = new Array(31).fill(0);
    updateTable(emptyArr, emptyArr);
    updateChart(emptyArr, emptyArr);
  
    const datePicker = document.getElementById('datePicker');
    if (!datePicker) return;
    const [yearStr, monthStr] = datePicker.value.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
  
    try {
      const res = await fetch(`${RAW_API}/${month}/${year}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RAWUF_LocThoA: emptyArr,
          RAWUF_LocThoB: emptyArr
        })
      });
      if(res.ok) alert('Data cleared successfully!');
      else alert('Failed to clear data!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data!');
    }
}
