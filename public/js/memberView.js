/**
 * Member Portal View & Dashboard Module
 */

const MemberView = {
  async renderDashboard() {
    const user = Auth.currentUser;
    if (!user) return App.navigateTo('catalog');

    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-tachometer-alt text-primary me-2"></i>Member Dashboard</h2>
          <p class="text-muted mb-0">Welcome, <strong>${escapeHtml(user.name)}</strong> (${user.membershipId}) | Plan: <span class="badge bg-primary">${user.membershipPlanId ? user.membershipPlanId.name : 'STUDENT'}</span></p>
        </div>
        <div>
          <button class="btn btn-outline-primary btn-sm" onclick="Catalog.render()"><i class="fas fa-search me-1"></i> Browse Catalog</button>
        </div>
      </div>

      <!-- Quick KPI Metric Cards -->
      <div class="row g-3 mb-4" id="memberStatsCards">
        <div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div>
      </div>

      <!-- Active Loans & Reservations Sections -->
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm rounded-3 mb-4">
            <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <h5 class="fw-bold mb-0"><i class="fas fa-book-reader text-primary me-2"></i>My Currently Borrowed Books</h5>
              <button class="btn btn-sm btn-light" onclick="MemberView.renderLoans()"><i class="fas fa-external-link-alt me-1"></i> View Full Details</button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive" id="memberActiveLoansTable">
                <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card border-0 shadow-sm rounded-3 mb-4">
            <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <h5 class="fw-bold mb-0"><i class="fas fa-bookmark text-warning me-2"></i>My Reservations</h5>
              <button class="btn btn-sm btn-light" onclick="MemberView.renderHolds()"><i class="fas fa-external-link-alt me-1"></i> Manage</button>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="memberHoldsList">
                <div class="text-center py-4"><div class="spinner-border text-warning"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadDashboardData();
  },

  async loadDashboardData() {
    try {
      const [loansRes, holdsRes, finesRes, notifsRes] = await Promise.all([
        API.getActiveLoans(),
        API.getHolds({ status: 'WAITING,READY' }),
        API.getMemberFines(Auth.currentUser._id),
        API.getNotifications()
      ]);

      const activeLoans = loansRes.data.loans || [];
      const activeHolds = holdsRes.data.items || [];
      const totalOutstandingFines = finesRes.data.totalOutstanding || 0;
      const unreadNotifs = notifsRes.data.unreadCount || 0;

      const now = new Date();
      const overdueLoans = activeLoans.filter(l => new Date(l.dueDate) < now);

      // Render Metric Cards
      const statsContainer = document.getElementById('memberStatsCards');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="col-xl-3 col-sm-6">
            <div class="stat-card">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-bold">Active Loans</span>
                  <h3 class="fw-bold my-1">${activeLoans.length}</h3>
                  <small class="text-muted">Limit: ${Auth.currentUser.membershipPlanId ? Auth.currentUser.membershipPlanId.maximumBooks : 3} books</small>
                </div>
                <div class="stat-icon bg-primary-subtle text-primary"><i class="fas fa-book-reader"></i></div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-sm-6">
            <div class="stat-card ${overdueLoans.length > 0 ? 'stat-danger' : 'stat-success'}">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-bold">Overdue Books</span>
                  <h3 class="fw-bold my-1 ${overdueLoans.length > 0 ? 'text-danger' : 'text-success'}">${overdueLoans.length}</h3>
                  <small class="text-muted">${overdueLoans.length > 0 ? 'Fines accumulating' : 'All loans in good standing'}</small>
                </div>
                <div class="stat-icon ${overdueLoans.length > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}">
                  <i class="fas fa-exclamation-circle"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-sm-6">
            <div class="stat-card ${totalOutstandingFines > 0 ? 'stat-warning' : 'stat-success'}">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-bold">Outstanding Fines</span>
                  <h3 class="fw-bold my-1 ${totalOutstandingFines > 0 ? 'text-danger' : 'text-success'}">$${totalOutstandingFines.toFixed(2)}</h3>
                  <small><a href="#" onclick="MemberView.renderFines()" class="text-decoration-none">${totalOutstandingFines > 0 ? 'Pay Fine Now' : 'Zero Fines'}</a></small>
                </div>
                <div class="stat-icon ${totalOutstandingFines > 0 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}">
                  <i class="fas fa-receipt"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="col-xl-3 col-sm-6">
            <div class="stat-card stat-info">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-bold">Active Holds</span>
                  <h3 class="fw-bold my-1">${activeHolds.length}</h3>
                  <small class="text-muted">In waitlist queue</small>
                </div>
                <div class="stat-icon bg-info-subtle text-info"><i class="fas fa-bookmark"></i></div>
              </div>
            </div>
          </div>
        `;
      }

      // Render Active Loans Table
      const loansTableContainer = document.getElementById('memberActiveLoansTable');
      if (loansTableContainer) {
        if (activeLoans.length === 0) {
          loansTableContainer.innerHTML = `<div class="text-center py-4 text-muted"><p>You have no active loans. Browse our catalog to borrow books!</p></div>`;
        } else {
          loansTableContainer.innerHTML = `
            <table class="table custom-table mb-0">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${activeLoans.map(loan => {
                  const isOverdue = new Date(loan.dueDate) < now;
                  return `
                    <tr>
                      <td>
                        <div class="fw-bold">${escapeHtml(loan.bookId ? loan.bookId.title : 'Book')}</div>
                        <small class="text-muted">ISBN: ${loan.bookId ? loan.bookId.isbn : ''}</small>
                      </td>
                      <td>${new Date(loan.issueDate).toLocaleDateString()}</td>
                      <td>
                        <span class="${isOverdue ? 'text-danger fw-bold' : ''}">
                          ${new Date(loan.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <span class="badge ${isOverdue ? 'bg-danger' : 'bg-success'}">
                          ${isOverdue ? 'OVERDUE' : 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-outline-primary btn-sm" onclick="MemberView.requestReturnNotice('${loan._id}')">
                          <i class="fas fa-undo me-1"></i> Return Info
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `;
        }
      }

      // Render Holds List
      const holdsListContainer = document.getElementById('memberHoldsList');
      if (holdsListContainer) {
        if (activeHolds.length === 0) {
          holdsListContainer.innerHTML = `<div class="p-3 text-center text-muted small">No active reservations.</div>`;
        } else {
          holdsListContainer.innerHTML = activeHolds.map(hold => `
            <div class="list-group-item py-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge ${hold.status === 'READY' ? 'bg-success' : 'bg-warning text-dark'}">${hold.status}</span>
                <small class="text-muted">${new Date(hold.requestedAt).toLocaleDateString()}</small>
              </div>
              <h6 class="fw-bold mb-1 text-truncate">${escapeHtml(hold.bookId ? hold.bookId.title : 'Book')}</h6>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">${hold.status === 'READY' ? 'Ready for desk pickup!' : 'In waitlist queue'}</small>
                <button class="btn btn-outline-danger btn-xs py-0 px-2" style="font-size:0.75rem;" onclick="MemberView.cancelHold('${hold._id}')">Cancel</button>
              </div>
            </div>
          `).join('');
        }
      }

    } catch (err) {
      console.error('Failed to load member dashboard:', err);
    }
  },

  async renderLoans() {
    const user = Auth.currentUser;
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-exchange-alt text-primary me-2"></i>My Borrowing History & Active Loans</h2>
          <p class="text-muted mb-0">Track all active and past completed borrowing transactions.</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="fullHistoryTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getMemberHistory(user._id);
      const items = res.data.items || [];
      const target = document.getElementById('fullHistoryTable');

      if (items.length === 0) {
        target.innerHTML = `<div class="p-5 text-center text-muted"><h5>No borrowing history found.</h5></div>`;
        return;
      }

      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Book</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Fine Accrued</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(tx => `
              <tr>
                <td>
                  <div class="fw-bold">${escapeHtml(tx.bookId ? tx.bookId.title : 'Deleted Book')}</div>
                  <small class="text-muted">ISBN: ${tx.bookId ? tx.bookId.isbn : 'N/A'}</small>
                </td>
                <td>${new Date(tx.issueDate).toLocaleDateString()}</td>
                <td>${new Date(tx.dueDate).toLocaleDateString()}</td>
                <td>${tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : '<span class="text-muted">Not Returned</span>'}</td>
                <td>
                  ${tx.fine > 0 ? `<span class="text-danger fw-bold">$${tx.fine.toFixed(2)}</span> <small>(${tx.fineStatus})</small>` : '$0.00'}
                </td>
                <td>
                  <span class="badge ${
                    tx.status === 'ACTIVE' ? 'bg-primary' : (tx.status === 'RETURNED' ? 'bg-success' : 'bg-danger')
                  }">${tx.status}</span>
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

  async renderHolds() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-bookmark text-warning me-2"></i>My Book Reservations</h2>
          <p class="text-muted mb-0">Manage your active waitlists for currently checked-out library books.</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="holdsFullTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getHolds();
      const items = res.data.items || [];
      const target = document.getElementById('holdsFullTable');

      if (items.length === 0) {
        target.innerHTML = `<div class="p-5 text-center text-muted"><h5>No reservation holds found.</h5></div>`;
        return;
      }

      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Book</th>
              <th>Requested On</th>
              <th>Status</th>
              <th>Ready Until</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(hold => `
              <tr>
                <td>
                  <div class="fw-bold">${escapeHtml(hold.bookId ? hold.bookId.title : 'Book')}</div>
                  <small class="text-muted">Category: ${hold.bookId ? hold.bookId.category : ''}</small>
                </td>
                <td>${new Date(hold.requestedAt).toLocaleDateString()}</td>
                <td>
                  <span class="badge ${
                    hold.status === 'READY' ? 'bg-success' : (hold.status === 'WAITING' ? 'bg-warning text-dark' : 'bg-secondary')
                  }">${hold.status}</span>
                </td>
                <td>
                  ${hold.expiresAt ? `<span class="text-danger fw-bold">${new Date(hold.expiresAt).toLocaleString()}</span>` : '<span class="text-muted">—</span>'}
                </td>
                <td>
                  ${['WAITING', 'READY'].includes(hold.status) ? `
                    <button class="btn btn-outline-danger btn-sm" onclick="MemberView.cancelHold('${hold._id}')">Cancel Hold</button>
                  ` : '<span class="text-muted">Settled</span>'}
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

  async renderFines() {
    const user = Auth.currentUser;
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-receipt text-danger me-2"></i>My Fines & Payment Portal</h2>
          <p class="text-muted mb-0">Review outstanding overdue fines and record simulated payments.</p>
        </div>
      </div>

      <div id="finesContainer">
        <div class="text-center py-5"><div class="spinner-border text-danger"></div></div>
      </div>
    `;

    try {
      const res = await API.getMemberFines(user._id);
      const { totalOutstanding, unpaidLoans, allFineHistory } = res.data;
      const target = document.getElementById('finesContainer');

      target.innerHTML = `
        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="stat-card ${totalOutstanding > 0 ? 'stat-danger' : 'stat-success'}">
              <span class="text-muted small text-uppercase fw-bold">Current Outstanding Balance</span>
              <h2 class="fw-bold my-2 ${totalOutstanding > 0 ? 'text-danger' : 'text-success'}">$${totalOutstanding.toFixed(2)}</h2>
              <p class="text-muted small mb-0">${totalOutstanding > 0 ? 'Please settle unpaid fines to prevent borrowing blocks.' : 'All clear! No pending fines.'}</p>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm rounded-3 mb-4">
          <div class="card-header bg-white py-3 border-0">
            <h5 class="fw-bold mb-0">Outstanding Unpaid Loans</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table custom-table mb-0">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Due Date</th>
                    <th>Total Fine</th>
                    <th>Paid Amount</th>
                    <th>Balance Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${unpaidLoans && unpaidLoans.length > 0 ? unpaidLoans.map(tx => {
                    const balance = Math.max(0, tx.fine - tx.finePaid);
                    return `
                      <tr>
                        <td>
                          <div class="fw-bold">${escapeHtml(tx.bookId ? tx.bookId.title : 'Book')}</div>
                          <small class="text-muted">ISBN: ${tx.bookId ? tx.bookId.isbn : ''}</small>
                        </td>
                        <td>${new Date(tx.dueDate).toLocaleDateString()}</td>
                        <td>$${tx.fine.toFixed(2)}</td>
                        <td>$${tx.finePaid.toFixed(2)}</td>
                        <td class="text-danger fw-bold">$${balance.toFixed(2)}</td>
                        <td>
                          <button class="btn btn-success btn-sm" onclick="MemberView.openPayFineModal('${tx._id}', ${balance})">
                            <i class="fas fa-credit-card me-1"></i> Pay Fine
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="6" class="text-center py-4 text-muted">No outstanding fines found.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async placeReservation(bookId) {
    try {
      const res = await API.placeHold(bookId);
      App.showToast('success', res.message);
      Catalog.fetchBooks();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async cancelHold(holdId) {
    if (!confirm('Are you sure you want to cancel this reservation hold?')) return;
    try {
      await API.cancelHold(holdId);
      App.showToast('success', 'Reservation hold cancelled.');
      if (App.currentView === 'member-holds') this.renderHolds();
      else if (App.currentView === 'member-dashboard') this.renderDashboard();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  requestBorrowModal(bookId) {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-book-reader me-2 text-primary"></i> University Library Loan Process`;
    modalBody.innerHTML = `
      <div class="text-center p-3">
        <i class="fas fa-university fa-3x text-primary mb-3"></i>
        <h5>How to Borrow This Book</h5>
        <p class="text-muted">Under the university library regulations, physical copies are checked out and verified at the Circulation Desk by a librarian.</p>
        <div class="alert alert-info text-start small">
          <strong>Instructions for Member:</strong>
          <ol class="mb-0 mt-1 ps-3">
            <li>Visit the library desk and present your Membership ID: <code>${Auth.currentUser.membershipId}</code></li>
            <li>The librarian will scan the book barcode and issue the book to your account instantly.</li>
          </ol>
        </div>
        <p class="small text-secondary mb-0">Alternatively, if you are testing the system, click <strong>"Login as Librarian"</strong> in the top switcher bar to access the librarian issue workstation.</p>
      </div>
    `;

    App.openGenericModal();
  },

  requestReturnNotice(loanId) {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-undo me-2 text-primary"></i> Book Return Process`;
    modalBody.innerHTML = `
      <div class="text-center p-3">
        <i class="fas fa-clipboard-check fa-3x text-success mb-3"></i>
        <h5>Returning Your Borrowed Book</h5>
        <p class="text-muted">Return the physical book to the circulation desk. The librarian will inspect the condition, compute any overdue days, and mark the transaction as returned.</p>
        <p class="small text-secondary mb-0">Tip for Evaluator: Switch to <strong>Librarian Workstation</strong> using the top bar to process this return immediately!</p>
      </div>
    `;
    App.openGenericModal();
  },

  openPayFineModal(transactionId, outstandingBalance) {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-credit-card me-2 text-success"></i> Pay Overdue Fine`;
    modalBody.innerHTML = `
      <form id="payFineForm" onsubmit="MemberView.submitFinePayment(event, '${transactionId}')">
        <div class="mb-3">
          <label class="form-label text-muted small fw-bold">Outstanding Balance Due</label>
          <input type="text" class="form-control fw-bold" value="$${outstandingBalance.toFixed(2)}" readonly>
        </div>
        <div class="mb-3">
          <label class="form-label text-muted small fw-bold">Payment Amount ($)</label>
          <input type="number" step="0.01" min="0.01" max="${outstandingBalance}" class="form-control" id="finePayAmount" value="${outstandingBalance}" required>
          <small class="text-muted">Supports full or partial installment payments.</small>
        </div>
        <div class="mb-3">
          <label class="form-label text-muted small fw-bold">Simulated Payment Method</label>
          <select class="form-select" id="finePayMethod">
            <option value="ONLINE_SIMULATED">Campus Online Student Portal</option>
            <option value="CARD">Credit/Debit Card</option>
            <option value="CASH">Circulation Desk Cash</option>
          </select>
        </div>
        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-success"><i class="fas fa-check-circle me-1"></i> Confirm Payment</button>
        </div>
      </form>
    `;

    App.openGenericModal();
  },

  async submitFinePayment(event, transactionId) {
    event.preventDefault();
    const amount = document.getElementById('finePayAmount').value;
    const paymentMethod = document.getElementById('finePayMethod').value;

    try {
      const res = await API.payFine(transactionId, amount, paymentMethod);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderFines();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  }
};
