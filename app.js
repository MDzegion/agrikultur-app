/**
 * Nandoor — App Controller
 * Handles screen navigation, auth flow, and dynamic data rendering
 * Integrated with Supabase backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // --- State ---
  let isRegisterMode = false;
  let currentUser = null;
  let cachedCommodities = [];
  let selectedCommodityId = null;

  // --- DOM References ---
  const app = document.getElementById('app');
  const screens = document.querySelectorAll('.screen');
  const bottomNav = document.getElementById('bottom-nav');
  const navItems = document.querySelectorAll('.nav-item');
  const loginForm = document.getElementById('login-form');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const btnTogglePw = document.getElementById('btn-toggle-pw');
  const loginPassword = document.getElementById('login-password');
  const loginEmail = document.getElementById('login-email');
  const loginName = document.getElementById('login-name');
  const nameGroup = document.getElementById('name-group');
  const formOptions = document.getElementById('form-options');
  const loginCardTitle = document.getElementById('login-card-title');
  const loginFooter = document.getElementById('login-footer');
  const toggleAuthMode = document.getElementById('toggle-auth-mode');
  const chartTabs = document.querySelectorAll('.chart-tab');

  // --- Screen Navigation ---
  // Shows a specific screen and updates the bottom nav indicator
  function showScreen(screenId) {
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (!targetScreen) return;

    // Find currently active screen
    const currentScreen = document.querySelector('.screen.active');
    
    if (currentScreen === targetScreen) return;

    // Animate out current screen
    if (currentScreen) {
      currentScreen.classList.add('exit');
      currentScreen.classList.remove('active');
      
      // Cleanup exit class after transition
      setTimeout(() => {
        currentScreen.classList.remove('exit');
        currentScreen.scrollTop = 0; // Reset scroll position
      }, 300);
    }

    // Animate in target screen
    setTimeout(() => {
      targetScreen.classList.add('active');
    }, 50);

    // Show/hide bottom nav (hidden on login screen)
    if (screenId === 'login') {
      bottomNav.classList.add('hidden');
    } else {
      bottomNav.classList.remove('hidden');
    }

    // Update active nav item
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    // Re-initialize icons only in the target screen (performance optimization)
    setTimeout(() => {
      if (window.lucide) {
        lucide.createIcons({ root: targetScreen });
      }
    }, 100);

    // Load dynamic data when navigating to certain screens
    handleScreenData(screenId);
  }

  /**
   * Load data from Supabase when specific screens are shown
   */
  async function handleScreenData(screenId) {
    switch (screenId) {
      case 'dashboard':
        await loadDashboardData();
        break;
      case 'commodity':
        if (selectedCommodityId) {
          await loadCommodityDetail(selectedCommodityId);
        }
        break;
      case 'finance':
        await loadTransactions();
        break;
      case 'profile':
        await loadAgentProfile();
        break;
    }
  }

  // --- Bottom Nav Click Handler ---
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      showScreen(screen);
    });
  });

  // --- Generic Screen Navigation Handler ---
  function attachScreenNavigation(selector) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen) showScreen(screen);
      });
    });
  }

  attachScreenNavigation('.quick-action');
  attachScreenNavigation('.see-all');
  attachScreenNavigation('.back-btn');

  // --- Auth Mode Toggle (Login ↔ Register) ---
  if (toggleAuthMode) {
    toggleAuthMode.addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;

      if (isRegisterMode) {
        // Switch to register mode
        loginCardTitle.textContent = 'Buat Akun Baru';
        nameGroup.style.display = 'block';
        formOptions.style.display = 'none';
        btnLogin.querySelector('span').textContent = 'Daftar';
        loginFooter.innerHTML = 'Sudah punya akun? <a href="#" id="toggle-auth-mode">Masuk</a>';
      } else {
        // Switch to login mode
        loginCardTitle.textContent = 'Masuk ke Akun Anda';
        nameGroup.style.display = 'none';
        formOptions.style.display = 'flex';
        btnLogin.querySelector('span').textContent = 'Masuk';
        loginFooter.innerHTML = 'Belum punya akun? <a href="#" id="toggle-auth-mode">Daftar Sekarang</a>';
      }

      // Re-attach event listener to the new toggle link
      const newToggle = document.getElementById('toggle-auth-mode');
      if (newToggle) {
        newToggle.addEventListener('click', (e2) => {
          e2.preventDefault();
          toggleAuthMode.click(); // Reuse the same handler
        });
      }

      // Re-initialize icons for the new elements
      if (window.lucide) lucide.createIcons();
    });
  }

  // --- Login Form Handler ---
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuth();
    });
  }

  /**
   * Handles both login and registration via Supabase Auth
   */
  async function handleAuth() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    // Validate input
    if (!email || !password) {
      showToast('Email dan kata sandi wajib diisi ⚠️');
      return;
    }

    if (password.length < 6) {
      showToast('Kata sandi minimal 6 karakter ⚠️');
      return;
    }

    // Show loading state
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;

    try {
      if (isRegisterMode) {
        // --- REGISTER ---
        const fullName = loginName.value.trim() || 'Agen Baru';
        const { data, error } = await window.signUp(email, password, fullName);

        if (error) {
          showToast(`Gagal daftar: ${error.message}`);
          return;
        }

        currentUser = data.user;
        showToast(`Selamat datang, ${fullName}! 🎉`);
        showScreen('dashboard');

      } else {
        // --- LOGIN ---
        const { data, error } = await window.signIn(email, password);

        if (error) {
          showToast(`Gagal masuk: ${error.message}`);
          return;
        }

        currentUser = data.user;
        const userName = data.user?.user_metadata?.full_name || 'Agen';
        showToast(`Selamat datang kembali, ${userName}! 👋`);
        showScreen('dashboard');
      }
    } catch (err) {
      showToast('Terjadi kesalahan, coba lagi');
      console.error('Auth error:', err);
    } finally {
      btnLogin.classList.remove('loading');
      btnLogin.disabled = false;
    }
  }

  // --- Password Toggle ---
  if (btnTogglePw) {
    btnTogglePw.addEventListener('click', () => {
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      
      // Toggle icon (eye / eye-off)
      const icon = btnTogglePw.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // --- Logout Handler ---
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await window.signOut();
      currentUser = null;
      isRegisterMode = false;

      // Reset login form
      loginCardTitle.textContent = 'Masuk ke Akun Anda';
      nameGroup.style.display = 'none';
      formOptions.style.display = 'flex';
      btnLogin.querySelector('span').textContent = 'Masuk';
      loginEmail.value = '';
      loginPassword.value = '';

      showScreen('login');
      showToast('Anda telah keluar dari aplikasi');
    });
  }

  // ================================================
  // DYNAMIC DATA LOADING
  // ================================================

  /**
   * Load dashboard data — commodities for the price card + greeting
   */
  async function loadDashboardData() {
    // Update greeting based on time
    const greetingLabel = document.querySelector('.greeting-label');
    const greetingName = document.querySelector('.greeting-name');
    
    if (greetingLabel) {
      const hour = new Date().getHours();
      let greeting = 'Selamat Pagi ☀️';
      if (hour >= 11 && hour < 15) greeting = 'Selamat Siang 🌤️';
      else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore 🌅';
      else if (hour >= 18) greeting = 'Selamat Malam 🌙';
      greetingLabel.textContent = greeting;
    }

    // Load user name
    if (greetingName && currentUser) {
      const name = currentUser.user_metadata?.full_name || 'Agen';
      greetingName.textContent = name;

      // Update avatar initials
      const avatar = document.getElementById('dashboard-avatar');
      if (avatar) {
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        avatar.querySelector('span').textContent = initials;
      }
    }

    // Load commodity price for the chart card
    if (cachedCommodities.length === 0) {
      cachedCommodities = await window.fetchCommodities();
    }

    if (cachedCommodities.length > 0) {
      const topCommodity = cachedCommodities[0]; // Highest priced
      const chartCommodity = document.querySelector('.chart-commodity');
      const chartPrice = document.querySelector('.chart-price');
      const chartChange = document.querySelector('.chart-change');

      if (chartCommodity) chartCommodity.textContent = topCommodity.name;
      if (chartPrice) chartPrice.innerHTML = `${window.formatRupiah(topCommodity.price_per_kg)}<small>/kg</small>`;
      if (chartChange) {
        const isPositive = topCommodity.price_change_pct >= 0;
        chartChange.className = `chart-change ${isPositive ? 'positive' : 'negative'}`;
        chartChange.textContent = `${isPositive ? '▲' : '▼'} ${Math.abs(topCommodity.price_change_pct)}%`;
      }

      // Update summary card count
      const commodityCount = document.querySelector('.card-commodity .summary-value');
      if (commodityCount) commodityCount.textContent = cachedCommodities.length;
    }
  }

  /**
   * Load commodity detail — price info, suppliers
   */
  async function loadCommodityDetail(commodityId) {
    const { commodity, suppliers } = await window.fetchCommodityDetail(commodityId);
    if (!commodity) return;

    // Update header
    const badge = document.querySelector('.commodity-badge');
    const name = document.querySelector('.commodity-name');
    const latin = document.querySelector('.commodity-latin');
    if (badge) badge.textContent = commodity.emoji || '🌿';
    if (name) name.textContent = commodity.name;
    if (latin) latin.textContent = commodity.latin_name || '';

    // Update price display
    const priceBig = document.querySelector('.price-big');
    const priceChange = document.querySelector('.price-change-badge span');
    const rangeLow = document.querySelector('.range-value.low');
    const rangeHigh = document.querySelector('.range-value.high');

    if (priceBig) priceBig.textContent = window.formatRupiah(commodity.price_per_kg);
    if (priceChange) {
      const pct = commodity.price_change_pct;
      priceChange.textContent = `${pct >= 0 ? '+' : ''}${pct}% dari kemarin`;
    }
    if (rangeLow) rangeLow.textContent = window.formatRupiah(commodity.price_low || 0);
    if (rangeHigh) rangeHigh.textContent = window.formatRupiah(commodity.price_high || 0);

    // Update supply info
    const infoValues = document.querySelectorAll('.info-card-value');
    if (infoValues.length >= 4) {
      infoValues[0].textContent = commodity.origin || '-';
      infoValues[1].textContent = `${(commodity.stock_kg || 0).toLocaleString('id-ID')} kg`;
      infoValues[2].textContent = commodity.grade || '-';
      infoValues[3].textContent = commodity.harvest_season || '-';
    }

    // Render suppliers
    const supplierList = document.querySelector('.supplier-list');
    if (supplierList && suppliers.length > 0) {
      supplierList.innerHTML = suppliers.map((s, i) => `
        <div class="supplier-item">
          <div class="supplier-avatar ${i > 0 ? 's' + (i + 1) : ''}"><span>${s.avatar_initials || '??'}</span></div>
          <div class="supplier-info">
            <span class="supplier-name">${s.name}</span>
            <span class="supplier-location">${s.location || '-'}</span>
          </div>
          <span class="supplier-price">${window.formatRupiah(s.price_per_kg)}/kg</span>
        </div>
      `).join('');
    }
  }

  /**
   * Load transactions for finance screen
   */
  async function loadTransactions() {
    const transactions = await window.fetchTransactions();
    
    // If no transactions from DB, keep the static HTML (demo data)
    if (transactions.length === 0) return;

    const txList = document.querySelector('.transaction-list');
    if (!txList) return;

    // Group transactions by date
    let currentDate = '';
    let html = '';

    transactions.forEach(tx => {
      const dateLabel = window.formatDateLabel(tx.created_at);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        html += `<div class="transaction-date">${dateLabel}</div>`;
      }

      const isIncome = tx.type === 'income';
      const isTransfer = tx.type === 'transfer';
      const iconClass = isIncome ? 'tx-in' : (isTransfer ? 'tx-transfer' : 'tx-out');
      const iconName = isIncome ? 'arrow-down-left' : (isTransfer ? 'repeat' : 'arrow-up-right');
      const amountClass = isIncome ? 'positive' : 'negative';
      const amountPrefix = isIncome ? '+' : '-';

      html += `
        <div class="transaction-item">
          <div class="tx-icon ${iconClass}"><i data-lucide="${iconName}"></i></div>
          <div class="tx-info">
            <span class="tx-name">${tx.description}</span>
            <span class="tx-time">${tx.time_label || ''} · ${tx.counterparty || ''}</span>
          </div>
          <span class="tx-amount ${amountClass}">${amountPrefix}${window.formatRupiah(Math.abs(tx.amount))}</span>
        </div>
      `;
    });

    txList.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: txList });
  }

  /**
   * Load agent profile from Supabase
   */
  async function loadAgentProfile() {
    const agent = await window.fetchAgentProfile();
    if (!agent) return;

    // Update profile header
    const profileName = document.querySelector('.profile-name');
    const profileRole = document.querySelector('.profile-role');
    const profileAvatar = document.querySelector('.profile-avatar span');

    if (profileName) profileName.textContent = agent.full_name || 'Agen';
    if (profileRole) profileRole.textContent = `Agen Lapangan · ${agent.region || 'Indonesia'}`;
    if (profileAvatar) profileAvatar.textContent = agent.avatar_initials || 'AG';

    // Update stats
    const stats = document.querySelectorAll('.pstat-value');
    if (stats.length >= 4) {
      stats[0].textContent = agent.years_active || '0';
      stats[1].textContent = agent.total_farmers || '0';
      stats[2].textContent = agent.rating || '5.0';
      stats[3].textContent = agent.total_transactions || '0';
    }

    // Update personal info
    const infoValues = document.querySelectorAll('.pinfo-value');
    if (infoValues.length >= 5) {
      infoValues[0].textContent = agent.full_name || '-';
      infoValues[1].textContent = agent.phone || '-';
      infoValues[2].textContent = agent.email || '-';
      infoValues[3].textContent = agent.region || '-';
      infoValues[4].textContent = agent.joined_date 
        ? new Date(agent.joined_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        : '-';
    }
  }

  // --- Dashboard Price Chart Click → Commodity Detail ---
  const priceChartCard = document.querySelector('.price-chart-card');
  if (priceChartCard) {
    priceChartCard.addEventListener('click', () => {
      // Navigate to commodity detail with the top commodity
      if (cachedCommodities.length > 0) {
        selectedCommodityId = cachedCommodities[0].id;
      }
      showScreen('commodity');
    });
    priceChartCard.style.cursor = 'pointer';
  }

  // --- Chart Tab Click Handler ---
  chartTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      chartTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const chartLine = document.querySelector('.full-chart .chart-line, .full-chart path[stroke="#10b981"]');
      if (chartLine) {
        chartLine.style.opacity = '0.3';
        setTimeout(() => {
          chartLine.style.opacity = '1';
        }, 200);
      }
    });
  });

  // --- Dashboard Avatar Click (go to profile) ---
  const dashboardAvatar = document.getElementById('dashboard-avatar');
  if (dashboardAvatar) {
    dashboardAvatar.addEventListener('click', () => {
      showScreen('profile');
    });
    dashboardAvatar.style.cursor = 'pointer';
  }

  // --- Summary Card Interactions ---
  const summaryCards = document.querySelectorAll('.summary-card');
  summaryCards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('card-revenue')) showScreen('finance');
      if (card.classList.contains('card-commodity')) showScreen('commodity');
      if (card.classList.contains('card-farmer')) showScreen('profile');
      if (card.classList.contains('card-transaction')) showScreen('finance');
    });
  });

  // --- Toast Notification System ---
  function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    Object.assign(toast.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%) translateY(-100%)',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(10px)',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '100px',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'var(--font-primary)',
      zIndex: '200',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      whiteSpace: 'nowrap',
      maxWidth: '90%',
      textAlign: 'center'
    });

    app.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-100%)';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // --- Haptic Feedback Simulation ---
  function addTapFeedback(element) {
    element.addEventListener('touchstart', () => {
      element.style.transform = 'scale(0.97)';
    }, { passive: true });
    
    element.addEventListener('touchend', () => {
      element.style.transform = '';
    }, { passive: true });
  }

  document.querySelectorAll('.supplier-item, .transaction-item, .activity-item, .nav-item').forEach(addTapFeedback);

  // --- Social Login Button Handlers ---
  const btnGoogle = document.getElementById('btn-google');
  const btnWhatsapp = document.getElementById('btn-whatsapp');

  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      showToast('Google Sign-In akan segera tersedia');
    });
  }

  if (btnWhatsapp) {
    btnWhatsapp.addEventListener('click', () => {
      showToast('Login WhatsApp akan segera tersedia');
    });
  }

  // --- Notification Button Handler ---
  const btnNotifications = document.getElementById('btn-notifications');
  if (btnNotifications) {
    btnNotifications.addEventListener('click', () => {
      showToast('3 notifikasi baru');
    });
  }

  // --- Wallet Actions Handler ---
  document.querySelectorAll('.wallet-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const span = btn.querySelector('span');
      const action = span ? span.textContent : 'Fitur';
      showToast(`${action} akan segera tersedia`);
    });
  });

  // --- Export Button Handler ---
  const btnExport = document.querySelector('.btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      btnExport.textContent = 'Mengunduh...';
      btnExport.disabled = true;
      
      setTimeout(() => {
        btnExport.innerHTML = '<i data-lucide="check"></i> Berhasil';
        if (window.lucide) lucide.createIcons();
        showToast('Laporan berhasil diunduh 📥');
        
        setTimeout(() => {
          btnExport.innerHTML = '<i data-lucide="download"></i> Unduh';
          btnExport.disabled = false;
          if (window.lucide) lucide.createIcons();
        }, 2000);
      }, 1500);
    });
  }

  // ================================================
  // APP INITIALIZATION
  // ================================================

  /**
   * Check if user has an existing session on page load
   * If yes, skip login and go straight to dashboard
   */
  async function initApp() {
    const session = await window.getSession();

    if (session && session.user) {
      // User already logged in — go to dashboard
      currentUser = session.user;
      showScreen('dashboard');
      const name = session.user.user_metadata?.full_name || 'Agen';
      showToast(`Selamat datang kembali, ${name}! 👋`);
    } else {
      // No session — show login screen
      showScreen('login');
    }
  }

  // Start the app
  initApp();

  console.log('🌱 Nandoor initialized with Supabase backend');
});
