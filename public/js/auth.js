/**
 * Authentication & Session Management Module
 */

const Auth = {
  currentUser: null,

  async init() {
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.getMe();
        this.currentUser = res.data.user;
        API.setUser(this.currentUser);
      } catch (err) {
        console.warn('Session expired or invalid. Clearing tokens.');
        this.logout(false);
      }
    }
    this.updateUI();
  },

  async login(email, password) {
    try {
      const res = await API.login(email, password);
      API.setToken(res.data.token);
      this.currentUser = res.data.user;
      API.setUser(this.currentUser);

      App.showToast('success', `Welcome back, ${this.currentUser.name}! (${this.currentUser.role})`);
      this.updateUI();

      // Close modal if open
      const modalEl = document.getElementById('authModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }

      App.loadCurrentView();
      return res;
    } catch (err) {
      App.showToast('danger', err.message || 'Login failed');
      throw err;
    }
  },

  async register(userData) {
    try {
      const res = await API.register(userData);
      API.setToken(res.data.token);
      this.currentUser = res.data.user;
      API.setUser(this.currentUser);

      App.showToast('success', `Registration successful! Your Membership ID is ${this.currentUser.membershipId}`);
      this.updateUI();

      const modalEl = document.getElementById('authModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }

      App.loadCurrentView();
      return res;
    } catch (err) {
      App.showToast('danger', err.message || 'Registration failed');
      throw err;
    }
  },

  logout(showNotice = true) {
    API.clearAuth();
    this.currentUser = null;
    this.updateUI();
    if (showNotice) {
      App.showToast('info', 'You have been logged out.');
    }
    App.navigateTo('catalog');
  },

  updateUI() {
    const authActions = document.getElementById('authActions');
    const userProfileMenu = document.getElementById('userProfileMenu');
    const userDisplayName = document.getElementById('userDisplayName');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const roleNavTabs = document.getElementById('roleNavTabs');

    if (this.currentUser) {
      if (authActions) authActions.classList.add('d-none');
      if (userProfileMenu) userProfileMenu.classList.remove('d-none');
      if (userDisplayName) userDisplayName.innerText = this.currentUser.name;

      if (userRoleBadge) {
        userRoleBadge.innerText = this.currentUser.role;
        userRoleBadge.className = `badge ${
          this.currentUser.role === 'ADMIN'
            ? 'bg-danger'
            : this.currentUser.role === 'LIBRARIAN'
            ? 'bg-info text-dark'
            : 'bg-primary'
        }`;
      }

      this.renderNavTabs();
      App.loadNotifications();
    } else {
      if (authActions) authActions.classList.remove('d-none');
      if (userProfileMenu) userProfileMenu.classList.add('d-none');
      if (roleNavTabs) {
        roleNavTabs.innerHTML = `
          <li class="nav-item">
            <a class="nav-link active" href="#" onclick="App.navigateTo('catalog')">
              <i class="fas fa-book-open me-1"></i> Book Catalog
            </a>
          </li>
        `;
      }
    }
  },

  renderNavTabs() {
    const roleNavTabs = document.getElementById('roleNavTabs');
    if (!roleNavTabs || !this.currentUser) return;

    let tabs = `
      <li class="nav-item">
        <a class="nav-link ${App.currentView === 'catalog' ? 'active' : ''}" href="#" onclick="App.navigateTo('catalog')">
          <i class="fas fa-book-open me-1"></i> Catalog
        </a>
      </li>
    `;

    if (this.currentUser.role === 'MEMBER') {
      tabs += `
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'member-dashboard' ? 'active' : ''}" href="#" onclick="App.navigateTo('member-dashboard')">
            <i class="fas fa-tachometer-alt me-1"></i> My Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'member-loans' ? 'active' : ''}" href="#" onclick="App.navigateTo('member-loans')">
            <i class="fas fa-exchange-alt me-1"></i> My Loans
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'member-holds' ? 'active' : ''}" href="#" onclick="App.navigateTo('member-holds')">
            <i class="fas fa-bookmark me-1"></i> Reservations
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'member-fines' ? 'active' : ''}" href="#" onclick="App.navigateTo('member-fines')">
            <i class="fas fa-receipt me-1"></i> Fines
          </a>
        </li>
      `;
    } else if (this.currentUser.role === 'LIBRARIAN') {
      tabs += `
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'librarian-workstation' ? 'active' : ''}" href="#" onclick="App.navigateTo('librarian-workstation')">
            <i class="fas fa-desktop me-1"></i> Circulation Workstation
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'librarian-books' ? 'active' : ''}" href="#" onclick="App.navigateTo('librarian-books')">
            <i class="fas fa-book me-1"></i> Manage Catalog
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'librarian-inventory' ? 'active' : ''}" href="#" onclick="App.navigateTo('librarian-inventory')">
            <i class="fas fa-boxes me-1"></i> Inventory Health
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'reports' ? 'active' : ''}" href="#" onclick="App.navigateTo('reports')">
            <i class="fas fa-chart-line me-1"></i> Analytics & Reports
          </a>
        </li>
      `;
    } else if (this.currentUser.role === 'ADMIN') {
      tabs += `
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'admin-dashboard' ? 'active' : ''}" href="#" onclick="App.navigateTo('admin-dashboard')">
            <i class="fas fa-shield-alt me-1"></i> Admin Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'admin-users' ? 'active' : ''}" href="#" onclick="App.navigateTo('admin-users')">
            <i class="fas fa-users-cog me-1"></i> User Management
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'admin-plans' ? 'active' : ''}" href="#" onclick="App.navigateTo('admin-plans')">
            <i class="fas fa-id-card me-1"></i> Membership Plans
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'librarian-workstation' ? 'active' : ''}" href="#" onclick="App.navigateTo('librarian-workstation')">
            <i class="fas fa-desktop me-1"></i> Circulation Workstation
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'reports' ? 'active' : ''}" href="#" onclick="App.navigateTo('reports')">
            <i class="fas fa-chart-pie me-1"></i> Analytics Reports
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${App.currentView === 'admin-settings' ? 'active' : ''}" href="#" onclick="App.navigateTo('admin-settings')">
            <i class="fas fa-cog me-1"></i> Settings & Audits
          </a>
        </li>
      `;
    }

    roleNavTabs.innerHTML = tabs;
  }
};
