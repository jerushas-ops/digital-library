/**
 * Admin Control Center & Analytics Dashboard Module
 */

const AdminView = {
  async renderDashboard() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-shield-alt text-danger me-2"></i>Executive Administration Portal</h2>
          <p class="text-muted mb-0">System-wide monitoring, aggregated metrics, real-time analytics, and library governance.</p>
        </div>
      </div>

      <!-- Metric KPI Cards -->
      <div class="row g-3 mb-4" id="adminKpiCards">
        <div class="col-12 text-center py-4"><div class="spinner-border text-danger"></div></div>
      </div>

      <!-- Charts Section -->
      <div class="row g-4 mb-4">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold mb-0"><i class="fas fa-chart-bar text-primary me-2"></i>Most Borrowed Academic Books (Top 5)</h5>
            </div>
            <div class="card-body">
              <canvas id="mostBorrowedChart" height="220"></canvas>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold mb-0"><i class="fas fa-chart-pie text-info me-2"></i>Category Borrowing Share</h5>
            </div>
            <div class="card-body">
              <canvas id="categoryShareChart" height="220"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadDashboardMetricsAndCharts();
  },

  async loadDashboardMetricsAndCharts() {
    try {
      const [overviewRes, mostBorrowedRes, categoriesRes, finesRes] = await Promise.all([
        API.getAdminOverview(),
        API.getReportsMostBorrowed(),
        API.getReportsCategories(),
        API.getReportsFines()
      ]);

      const overview = overviewRes.data;
      const fines = finesRes.data.report || {};

      // 1. KPI Cards
      const kpiContainer = document.getElementById('adminKpiCards');
      if (kpiContainer) {
        kpiContainer.innerHTML = `
          <div class="col-xl-3 col-sm-6">
            <div class="stat-card">
              <span class="text-muted small text-uppercase fw-bold">Total Members</span>
              <h3 class="fw-bold my-1">${overview.totalMembers}</h3>
              <small class="text-muted">${overview.totalLibrarians} Staff Librarians</small>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="stat-card stat-info">
              <span class="text-muted small text-uppercase fw-bold">Catalog Titles</span>
              <h3 class="fw-bold my-1 text-info">${overview.totalBooks}</h3>
              <small class="text-muted">${overview.activeTransactions} Currently Checked Out</small>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="stat-card stat-danger">
              <span class="text-muted small text-uppercase fw-bold">Overdue Violations</span>
              <h3 class="fw-bold my-1 text-danger">${overview.overdueTransactions}</h3>
              <small class="text-muted">Accumulating daily fines</small>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="stat-card stat-success">
              <span class="text-muted small text-uppercase fw-bold">Total Fines Collected</span>
              <h3 class="fw-bold my-1 text-success">$${(fines.totalPaidCollected || 0).toFixed(2)}</h3>
              <small class="text-muted">$${(fines.totalOutstanding || 0).toFixed(2)} outstanding</small>
            </div>
          </div>
        `;
      }

      // 2. Bar Chart (Most Borrowed)
      const mostBorrowedData = mostBorrowedRes.data.report || [];
      const barCtx = document.getElementById('mostBorrowedChart');
      if (barCtx && typeof Chart !== 'undefined') {
        const top5 = mostBorrowedData.slice(0, 5);
        new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: top5.map(b => b.title.length > 25 ? b.title.substring(0, 25) + '...' : b.title),
            datasets: [{
              label: 'Total Borrows',
              data: top5.map(b => b.borrowCount),
              backgroundColor: 'rgba(79, 70, 229, 0.8)',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
      }

      // 3. Doughnut Chart (Categories)
      const categoriesData = categoriesRes.data.report || [];
      const pieCtx = document.getElementById('categoryShareChart');
      if (pieCtx && typeof Chart !== 'undefined') {
        new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: categoriesData.map(c => c.category),
            datasets: [{
              data: categoriesData.map(c => c.totalBorrows),
              backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  },

  async renderUsers() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-users-cog text-primary me-2"></i>User & Role Management</h2>
          <p class="text-muted mb-0">View members, change account status, promote roles, and create librarian staff.</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="AdminView.openCreateLibrarianModal()"><i class="fas fa-user-plus me-1"></i> Add Librarian</button>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="adminUsersTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getUsers({ limit: 50 });
      const users = res.data.items || [];
      const target = document.getElementById('adminUsersTable');

      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Membership ID</th>
              <th>Role</th>
              <th>Type / Plan</th>
              <th>Status</th>
              <th>Fines</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <strong>${escapeHtml(u.name)}</strong><br>
                  <small class="text-muted">${escapeHtml(u.email)}</small>
                </td>
                <td><code>${u.membershipId}</code></td>
                <td>
                  <span class="badge ${u.role === 'ADMIN' ? 'bg-danger' : (u.role === 'LIBRARIAN' ? 'bg-info text-dark' : 'bg-primary')}">${u.role}</span>
                </td>
                <td>
                  <span class="badge bg-secondary">${u.memberType || 'STAFF'}</span><br>
                  <small class="text-muted">${u.membershipPlanId ? u.membershipPlanId.name : 'N/A'}</small>
                </td>
                <td>
                  <span class="badge ${u.status === 'ACTIVE' ? 'bg-success' : (u.status === 'SUSPENDED' ? 'bg-danger' : 'bg-secondary')}">${u.status}</span>
                </td>
                <td>
                  ${(u.outstandingFines || 0) > 0 ? `<span class="text-danger fw-bold">$${u.outstandingFines.toFixed(2)}</span>` : '$0.00'}
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Action</button>
                    <ul class="dropdown-menu">
                      <li><a class="dropdown-item" href="#" onclick="AdminView.updateStatus('${u._id}', 'ACTIVE')"><i class="fas fa-check text-success me-2"></i>Set ACTIVE</a></li>
                      <li><a class="dropdown-item" href="#" onclick="AdminView.updateStatus('${u._id}', 'SUSPENDED')"><i class="fas fa-ban text-danger me-2"></i>Set SUSPENDED</a></li>
                      <li><a class="dropdown-item" href="#" onclick="AdminView.updateStatus('${u._id}', 'INACTIVE')"><i class="fas fa-pause text-secondary me-2"></i>Set INACTIVE</a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item" href="#" onclick="AdminView.updateRole('${u._id}', 'LIBRARIAN')"><i class="fas fa-user-shield text-info me-2"></i>Promote to Librarian</a></li>
                      <li><a class="dropdown-item" href="#" onclick="AdminView.updateRole('${u._id}', 'MEMBER')"><i class="fas fa-user text-primary me-2"></i>Set as Member</a></li>
                    </ul>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async updateStatus(userId, status) {
    try {
      const res = await API.updateUserStatus(userId, status);
      App.showToast('success', res.message);
      this.renderUsers();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async updateRole(userId, role) {
    if (!confirm(`Are you sure you want to change this user's role to ${role}?`)) return;
    try {
      const res = await API.updateUserRole(userId, role);
      App.showToast('success', res.message);
      this.renderUsers();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  openCreateLibrarianModal() {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-user-shield text-primary me-2"></i> Create Librarian Account`;
    modalBody.innerHTML = `
      <form onsubmit="AdminView.submitCreateLibrarian(event)">
        <div class="mb-3">
          <label class="form-label small fw-bold">Full Name</label>
          <input type="text" class="form-control" id="libName" required>
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">University Staff Email</label>
          <input type="email" class="form-control" id="libEmail" required>
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">Password</label>
          <input type="password" class="form-control" id="libPassword" required minlength="6">
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">Phone Number</label>
          <input type="text" class="form-control" id="libPhone">
        </div>
        <div class="d-grid mt-4">
          <button type="submit" class="btn btn-primary">Create Librarian Account</button>
        </div>
      </form>
    `;

    App.openGenericModal();
  },

  async submitCreateLibrarian(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('libName').value,
      email: document.getElementById('libEmail').value,
      password: document.getElementById('libPassword').value,
      phone: document.getElementById('libPhone').value
    };

    try {
      const res = await API.createLibrarian(data);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderUsers();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async renderPlans() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-id-card text-primary me-2"></i>Membership Plans & Limits</h2>
          <p class="text-muted mb-0">Configure maximum borrowing quantities, loan term duration, daily fine rates, and thresholds.</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="AdminView.openCreatePlanModal()"><i class="fas fa-plus me-1"></i> New Plan</button>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="adminPlansTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getPlans();
      const plans = res.data.plans || [];
      const target = document.getElementById('adminPlansTable');

      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Plan Name</th>
              <th>Max Books</th>
              <th>Loan Duration</th>
              <th>Fine Per Day</th>
              <th>Fine Threshold</th>
              <th>Reservations</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            ${plans.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${p.maximumBooks} books</td>
                <td>${p.loanDurationDays} days</td>
                <td>$${p.finePerDay}/day</td>
                <td>$${p.fineThreshold}</td>
                <td>${p.reservationLimit} holds</td>
                <td>${p.isDefault ? '<span class="badge bg-success">DEFAULT</span>' : '<span class="text-muted">No</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  openCreatePlanModal() {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-id-card text-primary me-2"></i> Create Membership Plan`;
    modalBody.innerHTML = `
      <form onsubmit="AdminView.submitCreatePlan(event)">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">Plan Name</label>
            <input type="text" class="form-control" id="planName" required placeholder="e.g. POSTGRADUATE">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Max Borrow Limit (Books)</label>
            <input type="number" class="form-control" id="planMaxBooks" min="1" value="4" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Loan Duration (Days)</label>
            <input type="number" class="form-control" id="planDays" min="1" value="21" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Fine Per Day ($)</label>
            <input type="number" class="form-control" id="planFine" min="0" value="3" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Fine Threshold ($)</label>
            <input type="number" class="form-control" id="planThreshold" min="0" value="25" required>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Max Active Holds</label>
            <input type="number" class="form-control" id="planHolds" min="0" value="4">
          </div>
          <div class="col-md-12">
            <label class="form-label small fw-bold">Description</label>
            <textarea class="form-control" id="planDesc" rows="2"></textarea>
          </div>
        </div>
        <div class="d-grid mt-4">
          <button type="submit" class="btn btn-primary">Create Plan</button>
        </div>
      </form>
    `;

    App.openGenericModal();
  },

  async submitCreatePlan(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('planName').value,
      maximumBooks: Number(document.getElementById('planMaxBooks').value),
      loanDurationDays: Number(document.getElementById('planDays').value),
      finePerDay: Number(document.getElementById('planFine').value),
      fineThreshold: Number(document.getElementById('planThreshold').value),
      reservationLimit: Number(document.getElementById('planHolds').value),
      description: document.getElementById('planDesc').value
    };

    try {
      const res = await API.createPlan(data);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderPlans();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async renderSettings() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-cog text-primary me-2"></i>System Settings & Audit Log Trail</h2>
          <p class="text-muted mb-0">System configuration and live immutable audit trail of actions.</p>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm rounded-3">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold mb-0">Global Library Settings</h5>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="settingsList">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="card border-0 shadow-sm rounded-3">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold mb-0">Recent Administrative Audit Logs</h5>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive" id="auditLogsTable">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      const [settingsRes, auditRes] = await Promise.all([
        API.getSettings(),
        API.getAuditLogs({ limit: 20 })
      ]);

      const settings = settingsRes.data.settings || [];
      const logs = auditRes.data.items || [];

      // Render Settings List
      const settingsContainer = document.getElementById('settingsList');
      settingsContainer.innerHTML = settings.map(s => `
        <div class="list-group-item py-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong><code>${s.key}</code></strong>
            <span class="badge bg-primary fs-6">${s.value}</span>
          </div>
          <small class="text-muted">${s.description || 'System setting'}</small>
        </div>
      `).join('');

      // Render Audit Logs Table
      const auditContainer = document.getElementById('auditLogsTable');
      auditContainer.innerHTML = `
        <table class="table custom-table mb-0 small">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${new Date(l.timestamp).toLocaleString()}</td>
                <td><span class="badge bg-dark">${l.action}</span></td>
                <td>${l.resource}</td>
                <td>${l.actorId ? escapeHtml(l.actorId.name || l.actorId.email) : 'System'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async renderReports() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-chart-line text-primary me-2"></i>Analytical Reports Hub</h2>
          <p class="text-muted mb-0">High-performance MongoDB aggregation reports for library administration.</p>
        </div>
      </div>

      <ul class="nav nav-pills mb-4" id="reportTabs">
        <li class="nav-item"><a class="nav-link active" href="#" onclick="AdminView.loadReport('overdue', this)"><i class="fas fa-clock me-1"></i> Overdue Books</a></li>
        <li class="nav-item"><a class="nav-link" href="#" onclick="AdminView.loadReport('most-borrowed', this)"><i class="fas fa-trophy me-1"></i> Most Borrowed</a></li>
        <li class="nav-item"><a class="nav-link" href="#" onclick="AdminView.loadReport('fines', this)"><i class="fas fa-dollar-sign me-1"></i> Fine Summary</a></li>
        <li class="nav-item"><a class="nav-link" href="#" onclick="AdminView.loadReport('members', this)"><i class="fas fa-users me-1"></i> Member Stats</a></li>
      </ul>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="activeReportContainer">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    this.loadReport('overdue');
  },

  async loadReport(type, el) {
    if (el) {
      document.querySelectorAll('#reportTabs .nav-link').forEach(l => l.classList.remove('active'));
      el.classList.add('active');
    }

    const target = document.getElementById('activeReportContainer');
    target.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`;

    try {
      if (type === 'overdue') {
        const res = await API.getReportsOverdue();
        const list = res.data.report || [];
        if (list.length === 0) {
          target.innerHTML = `<div class="p-5 text-center text-success"><h5>No books are currently overdue!</h5></div>`;
          return;
        }
        target.innerHTML = `
          <table class="table custom-table mb-0">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Member</th>
                <th>Due Date</th>
                <th>Overdue Days</th>
                <th>Accrued Fine</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => `
                <tr>
                  <td><strong>${escapeHtml(r.book.title)}</strong><br><small class="text-muted">ISBN: ${r.book.isbn}</small></td>
                  <td>${escapeHtml(r.member.name)} (${r.member.membershipId})</td>
                  <td>${new Date(r.dueDate).toLocaleDateString()}</td>
                  <td><span class="badge bg-danger">${r.overdueDays} days late</span></td>
                  <td class="text-danger fw-bold">$${(r.overdueDays * 5).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else if (type === 'most-borrowed') {
        const res = await API.getReportsMostBorrowed();
        const list = res.data.report || [];
        target.innerHTML = `
          <table class="table custom-table mb-0">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Book Title</th>
                <th>Category</th>
                <th>Total Times Borrowed</th>
                <th>Active Loans</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((r, i) => `
                <tr>
                  <td><span class="badge bg-primary">#${i + 1}</span></td>
                  <td><strong>${escapeHtml(r.title)}</strong><br><small class="text-muted">${escapeHtml(r.author)}</small></td>
                  <td><span class="badge bg-secondary">${escapeHtml(r.category)}</span></td>
                  <td><strong class="fs-6">${r.borrowCount}</strong></td>
                  <td>${r.activeBorrowCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else if (type === 'fines') {
        const res = await API.getReportsFines();
        const r = res.data.report || {};
        target.innerHTML = `
          <div class="p-4">
            <div class="row g-3">
              <div class="col-md-3">
                <div class="p-3 bg-light rounded-3 text-center">
                  <span class="text-muted small">Total Accrued</span>
                  <h3 class="fw-bold text-dark my-1">$${(r.totalFinesAccrued || 0).toFixed(2)}</h3>
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-light rounded-3 text-center">
                  <span class="text-muted small">Paid / Collected</span>
                  <h3 class="fw-bold text-success my-1">$${(r.totalPaidCollected || 0).toFixed(2)}</h3>
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-light rounded-3 text-center">
                  <span class="text-muted small">Waived</span>
                  <h3 class="fw-bold text-secondary my-1">$${(r.totalWaived || 0).toFixed(2)}</h3>
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 bg-light rounded-3 text-center">
                  <span class="text-muted small">Outstanding Due</span>
                  <h3 class="fw-bold text-danger my-1">$${(r.totalOutstanding || 0).toFixed(2)}</h3>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (type === 'members') {
        const res = await API.getReportsMembers();
        const list = res.data.report || [];
        target.innerHTML = `
          <table class="table custom-table mb-0">
            <thead>
              <tr>
                <th>Member</th>
                <th>Membership ID</th>
                <th>Total Borrowings</th>
                <th>Active Loans</th>
                <th>Outstanding Fines</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(m => `
                <tr>
                  <td><strong>${escapeHtml(m.name)}</strong><br><small class="text-muted">${escapeHtml(m.email)}</small></td>
                  <td><code>${m.membershipId}</code></td>
                  <td><strong>${m.totalBorrowCount}</strong></td>
                  <td>${m.activeLoanCount}</td>
                  <td>${m.outstandingFines > 0 ? `<span class="text-danger fw-bold">$${m.outstandingFines.toFixed(2)}</span>` : '$0.00'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      target.innerHTML = `<div class="p-4 alert alert-danger">${err.message}</div>`;
    }
  }
};
