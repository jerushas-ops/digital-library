/**
 * Core Application Controller & UI Router
 */

const App = {
  currentView: 'catalog',

  async init() {
    console.log('[App] Initializing Digital Library Management System...');
    await Auth.init();
    this.navigateTo('catalog');
  },

  navigateTo(viewName) {
    this.currentView = viewName;
    Auth.updateUI();
    this.loadCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  loadCurrentView() {
    switch (this.currentView) {
      case 'catalog':
        Catalog.render();
        break;
      case 'member-dashboard':
        MemberView.renderDashboard();
        break;
      case 'member-loans':
        MemberView.renderLoans();
        break;
      case 'member-holds':
        MemberView.renderHolds();
        break;
      case 'member-fines':
        MemberView.renderFines();
        break;
      case 'librarian-workstation':
        LibrarianView.renderWorkstation();
        break;
      case 'librarian-books':
        LibrarianView.renderBooks();
        break;
      case 'librarian-inventory':
        LibrarianView.renderInventory();
        break;
      case 'admin-dashboard':
        AdminView.renderDashboard();
        break;
      case 'admin-users':
        AdminView.renderUsers();
        break;
      case 'admin-plans':
        AdminView.renderPlans();
        break;
      case 'admin-settings':
        AdminView.renderSettings();
        break;
      case 'reports':
        AdminView.renderReports();
        break;
      default:
        Catalog.render();
    }
  },

  showToast(type, message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success text-white' : (type === 'danger' ? 'bg-danger text-white' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white'));

    const html = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body py-3">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle')} me-2"></i>
            ${escapeHtml(message)}
          </div>
          <button type="button" class="btn-close ${type === 'warning' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(toastId);
    const toast = new bootstrap.Toast(el, { delay: 4500 });
    toast.show();

    el.addEventListener('hidden.bs.toast', () => el.remove());
  },

  openAuthModal(mode = 'login') {
    const modalEl = document.getElementById('authModal');
    if (!modalEl) return;

    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');

    const loginForm = document.getElementById('modalLoginForm');
    if (loginForm) loginForm.reset();

    const registerForm = document.getElementById('modalRegisterForm');
    if (registerForm) registerForm.reset();

    if (mode === 'login' && loginTab) {
      new bootstrap.Tab(loginTab).show();
    } else if (mode === 'register' && registerTab) {
      new bootstrap.Tab(registerTab).show();
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  openGenericModal() {
    const modalEl = document.getElementById('genericModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  },

  closeGenericModal() {
    const modalEl = document.getElementById('genericModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  },

  async loadNotifications() {
    if (!Auth.currentUser) return;
    try {
      const res = await API.getNotifications();
      const notifs = res.data.notifications || [];
      const unreadCount = res.data.unreadCount || 0;

      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }

      const listContainer = document.getElementById('notifListDropdown');
      if (listContainer) {
        if (notifs.length === 0) {
          listContainer.innerHTML = '<li class="p-3 text-center text-muted small">No notifications</li>';
        } else {
          listContainer.innerHTML = notifs.slice(0, 6).map(n => `
            <li>
              <a class="dropdown-item py-2 border-bottom ${!n.isRead ? 'bg-light' : ''}" href="#" onclick="App.markNotifRead('${n._id}')">
                <div class="fw-bold small ${!n.isRead ? 'text-primary' : 'text-dark'}">${escapeHtml(n.title)}</div>
                <div class="small text-secondary text-truncate" style="max-width: 260px;">${escapeHtml(n.message)}</div>
                <small class="text-muted" style="font-size: 0.7rem;">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
              </a>
            </li>
          `).join('');
        }
      }
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }
  },

  async markNotifRead(notifId) {
    try {
      await API.markNotificationRead(notifId);
      this.loadNotifications();
    } catch (err) {
      console.warn(err);
    }
  },

  async markAllNotifsRead() {
    try {
      await API.markAllNotificationsRead();
      this.loadNotifications();
      this.showToast('info', 'All notifications marked as read.');
    } catch (err) {
      console.warn(err);
    }
  }
};

// Start application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Attach auth forms listeners
  const loginForm = document.getElementById('modalLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      Auth.login(email, pass);
    });
  }

  const registerForm = document.getElementById('modalRegisterForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const userData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        memberType: document.getElementById('regMemberType').value,
        phone: document.getElementById('regPhone').value
      };
      Auth.register(userData);
    });
  }
});
