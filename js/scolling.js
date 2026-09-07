
// Check server connection every 3 seconds
setInterval(checkServerConnection, 3000);
// Initial check
setTimeout(checkServerConnection, 1000);


setTimeout(() => {
  location.reload();
}, 3600000);


// Language management — default Korean
let currentLanguage = 'ko';
let menuTimeout = null;

// Hàm toggle dropdown menu chính
function toggleMenu() {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  const overlay = document.getElementById('menuOverlay');
  const isOpen = menu && menu.classList.contains('show');

  if (menu && btn) {
    menu.classList.toggle('show');
    btn.classList.toggle('active');

    // Hiển thị/ẩn overlay
    if (overlay) {
      if (!isOpen && menu.classList.contains('show')) {
        overlay.classList.add('show');
      } else {
        overlay.classList.remove('show');
      }
    }

    // Clear existing timeout
    if (menuTimeout) {
      clearTimeout(menuTimeout);
      menuTimeout = null;
    }

    // If menu is now open, set timeout to close after 15 seconds
    if (!isOpen && menu.classList.contains('show')) {
      menuTimeout = setTimeout(() => {
        closeMenu();
      }, 15000);
    }
  }
}

function closeMenu() {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  const overlay = document.getElementById('menuOverlay');

  if (menu) {
    menu.classList.remove('show');
  }
  if (btn) {
    btn.classList.remove('active');
  }
  if (overlay) {
    overlay.classList.remove('show');
  }

  // Clear timeout when menu is closed
  if (menuTimeout) {
    clearTimeout(menuTimeout);
    menuTimeout = null;
  }
}

// Legacy function for backward compatibility
function toggleDropdown(event) {
  if (event) {
    event.stopPropagation();
  }
  toggleMenu();
}

// Hàm toggle submenu
function toggleSubmenu(event) {
  event.stopPropagation();
  // Chỉ toggle nếu click vào phần header của submenu, không phải submenu-content
  const submenuContent = event.target.closest('.dropdown-submenu-content');
  if (submenuContent) {
    return; // Nếu click vào submenu-content, không làm gì
  }
  const submenu = event.currentTarget;
  if (submenu) {
    submenu.classList.toggle('show');
  }
}

// Close dropdown and submenus
function closeDropdownAndSubmenus() {
  const dropdown = document.getElementById('mainDropdown');
  if (dropdown) {
    dropdown.classList.remove('show');
    const submenus = document.querySelectorAll('.dropdown-submenu');
    submenus.forEach(submenu => {
      submenu.classList.remove('show');
    });
  }
}

// Close dropdown when clicking outside the dropdown or iframe
document.addEventListener('click', function (event) {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('menuBtn');
  const dropdown = btn ? btn.closest('.dropdown') : null;
  const overlay = document.getElementById('menuOverlay');
  const isClickOnIframe = event.target.tagName === 'IFRAME';
  const isClickOnOverlay = event.target === overlay;

  // Nếu click vào overlay, đóng menu (đã xử lý trong overlay event listener)
  if (isClickOnOverlay) {
    return;
  }

  // Check if menu is open and click is outside dropdown
  if (menu && menu.classList.contains('show') && dropdown && !dropdown.contains(event.target) && !isClickOnIframe) {
    closeMenu();
  }

  // Legacy support for old dropdown structure
  const oldDropdown = document.getElementById('mainDropdown');
  if (oldDropdown && (!oldDropdown.contains(event.target) || isClickOnIframe)) {
    closeDropdownAndSubmenus();
  }
});


document.addEventListener('DOMContentLoaded', function () {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
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
        // Cross-origin iframe
      }
    });
  });
});

// Ngăn đóng dropdown khi click vào dropdown content
document.addEventListener('DOMContentLoaded', function () {
  const dropdownContent = document.querySelector('.dropdown-content');
  if (dropdownContent) {
    dropdownContent.addEventListener('click', function (event) {
      event.stopPropagation();
    });
  }

  // Đóng menu khi click vào overlay
  const overlay = document.getElementById('menuOverlay');
  if (overlay) {
    overlay.addEventListener('click', function () {
      closeMenu();
    });
  }

  // Apply default language on page load
  applyLanguage(currentLanguage);
});

// Hàm đóng dropdown menu chính (legacy support)
function closeMainDropdown() {
  closeMenu();
  // Đóng tất cả submenu
  const submenus = document.querySelectorAll('.dropdown-submenu');
  submenus.forEach(submenu => {
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
