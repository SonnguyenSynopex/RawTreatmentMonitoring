
// Check server connection every 3 seconds
setInterval(checkServerConnection, 3000);
// Initial check
setTimeout(checkServerConnection, 1000);


setTimeout(() => {
  location.reload();
}, 3600000);


// Language management — default English
let currentLanguage = 'en';
let menuTimeout = null;

function toggleMenu() {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  const overlay = document.getElementById('menuOverlay');
  if (!menu || !btn) return;

  const willOpen = !menu.classList.contains('show');
  menu.classList.toggle('show', willOpen);
  btn.classList.toggle('active', willOpen);
  btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  menu.setAttribute('aria-hidden', willOpen ? 'false' : 'true');

  if (overlay) {
    overlay.classList.toggle('show', willOpen);
  }

  if (menuTimeout) {
    clearTimeout(menuTimeout);
    menuTimeout = null;
  }
}

function closeMenu() {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  const overlay = document.getElementById('menuOverlay');

  if (menu) {
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (overlay) {
    overlay.classList.remove('show');
  }

  if (menuTimeout) {
    clearTimeout(menuTimeout);
    menuTimeout = null;
  }
}

function toggleDropdown(event) {
  if (event) event.stopPropagation();
  toggleMenu();
}

function toggleSubmenu(event) {
  event.stopPropagation();
  const submenuContent = event.target.closest('.dropdown-submenu-content');
  if (submenuContent) return;
  const submenu = event.currentTarget;
  if (submenu) submenu.classList.toggle('show');
}

function closeDropdownAndSubmenus() {
  closeMenu();
  document.querySelectorAll('.dropdown-submenu').forEach((submenu) => {
    submenu.classList.remove('show');
  });
}

// Click outside sidebar / on iframe → close
document.addEventListener('click', function (event) {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  if (!menu || !menu.classList.contains('show')) return;

  const onBtn = btn && btn.contains(event.target);
  const onMenu = menu.contains(event.target);
  if (!onBtn && !onMenu) {
    closeMenu();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('iframe').forEach((iframe) => {
    iframe.addEventListener('focus', closeDropdownAndSubmenus);
    iframe.addEventListener('load', function () {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          iframeDoc.addEventListener('click', closeDropdownAndSubmenus);
        }
        if (window.SvgI18n) {
          window.SvgI18n.applySvgLanguage(currentLanguage);
        }
      } catch (e) {
        /* cross-origin */
      }
    });
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const sidebar = document.getElementById('dropdownMenu');
  if (sidebar) {
    sidebar.addEventListener('click', function (event) {
      event.stopPropagation();
    });
  }

  const overlay = document.getElementById('menuOverlay');
  if (overlay) {
    overlay.addEventListener('click', function () {
      closeMenu();
    });
  }

  applyLanguage(currentLanguage);
});

function closeMainDropdown() {
  closeMenu();
  document.querySelectorAll('.dropdown-submenu').forEach((submenu) => {
    submenu.classList.remove('show');
  });
}

// Language switching function
function toggleLanguage() {
  const flagImg = document.getElementById('flagImg');
  const languageLabel = document.getElementById('languageLabel');

  if (currentLanguage === 'en') {
    currentLanguage = 'ko';
    if (flagImg) flagImg.src = './img/south-korea.png';
    if (languageLabel) languageLabel.textContent = '한국어';
  } else {
    currentLanguage = 'en';
    if (flagImg) flagImg.src = './img/united-kingdom.png';
    if (languageLabel) languageLabel.textContent = 'English';
  }

  applyLanguage(currentLanguage);
}

function applyLanguage(lang) {
  // Update all elements with data-lang-en and data-lang-ko attributes
  // This includes: menu labels, status labels, settings table headers, buttons, etc.
  const allLangElements = document.querySelectorAll('[data-lang-en], [data-lang-ko]');
  allLangElements.forEach(element => {
    const langText = element.getAttribute(`data-lang-${lang}`);
    if (langText) {
      element.textContent = langText;
    }
  });

  // Update export button text (has nested span)
  const exportButtons = document.querySelectorAll('.export-btn .export-text');
  exportButtons.forEach(btn => {
    const parent = btn.closest('.export-btn');
    if (parent) {
      const langText = parent.getAttribute(`data-lang-${lang}`);
      if (langText) {
        btn.textContent = langText;
      }
    }
  });

  // Update select options
  const selectOptions = document.querySelectorAll('select option[data-lang-en], select option[data-lang-ko]');
  selectOptions.forEach(option => {
    const langText = option.getAttribute(`data-lang-${lang}`);
    if (langText) {
      option.textContent = langText;
    }
  });

  // Sync language flag + label (current language)
  const flagImg = document.getElementById('flagImg');
  const languageLabel = document.getElementById('languageLabel');
  if (lang === 'ko') {
    if (flagImg) flagImg.src = './img/south-korea.png';
    if (languageLabel) languageLabel.textContent = '한국어';
  } else {
    if (flagImg) flagImg.src = './img/united-kingdom.png';
    if (languageLabel) languageLabel.textContent = 'English';
  }

  // SVG labels inside dashboard iframe
  if (window.SvgI18n) {
    window.SvgI18n.applySvgLanguage(lang);
  }

  if (typeof applyRecordChartTitle === 'function') {
    applyRecordChartTitle(lang);
  }

  // Export / Save / Clear button labels on record page
  const btnSave = document.getElementById('btnSaveRecord') || document.getElementById('btnSaveRaw');
  const btnClear = document.getElementById('btnClearRecord') || document.getElementById('btnClearRaw');
  const btnExport = document.getElementById('btnExportExcel');
  if (btnSave) {
    btnSave.textContent = lang === 'ko' ? '💾 저장' : '💾 Save';
  }
  if (btnClear) {
    btnClear.textContent = lang === 'ko' ? '🗑️ 초기화' : '🗑️ Clear';
  }
  if (btnExport) {
    btnExport.textContent = lang === 'ko' ? '📥 엑셀 내보내기' : '📥 Export Excel';
  }

  document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';
}

// Server connection checking — MQTT online topic, fallback REST
function setConnectionUi(connected) {
  const statusLight = document.getElementById('status-light');
  const alarmText = document.getElementById('alarmText');
  if (!statusLight || !alarmText) return;

  if (connected) {
    statusLight.classList.remove('disconnected');
    statusLight.classList.add('connected');
    alarmText.textContent =
      currentLanguage === 'ko' ? '서버 연결 정상' : 'System connected normally';
  } else {
    statusLight.classList.remove('connected');
    statusLight.classList.add('disconnected');
    alarmText.textContent =
      currentLanguage === 'ko' ? '서버 연결 오류' : 'Server connection error';
  }
}

let mqttStatusBound = false;

function bindMqttStatus() {
  if (mqttStatusBound || !window.RawUfMqtt) return;
  mqttStatusBound = true;
  window.RawUfMqtt.onOnline((online) => setConnectionUi(!!online));
}

function checkServerConnection() {
  const mqttReady =
    window.RawUfMqtt &&
    window.MQTT_CONFIG &&
    window.MQTT_CONFIG.enabled !== false;

  if (mqttReady) {
    bindMqttStatus();
    window.RawUfMqtt
      .connect()
      .then(() => setConnectionUi(true))
      .catch(() => {
        if (window.MQTT_CONFIG.restFallback === false) {
          setConnectionUi(false);
          return;
        }
        checkRestConnection();
      });
    return;
  }

  checkRestConnection();
}

function checkRestConnection() {
  fetch('http://10.100.203.78:3456/api/tags/latest?systemId=raw-uf', {
    method: 'GET',
  })
    .then((response) => {
      if (response.ok) setConnectionUi(true);
      else throw new Error('Server error');
    })
    .catch(() => setConnectionUi(false));
}
