/**
 * Librarian & Staff Circulation Workstation Module
 */

const LibrarianView = {
  async renderWorkstation() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-desktop text-primary me-2"></i>Circulation Desk Workstation</h2>
          <p class="text-muted mb-0">Issue books, process returns, compute overdue fines, and manage active loans.</p>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <!-- 1. Book Issue Workstation -->
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold text-primary mb-0"><i class="fas fa-arrow-circle-right me-2"></i>Issue Book to Member</h5>
            </div>
            <div class="card-body">
              <form id="issueBookForm" onsubmit="LibrarianView.handleIssueBook(event)">
                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Select Member</label>
                  <select class="form-select" id="issueMemberSelect" required onchange="LibrarianView.previewMemberInfo(this.value)">
                    <option value="">Choose a member...</option>
                  </select>
                  <div id="memberPreviewBox" class="mt-2 small text-muted"></div>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Select Book</label>
                  <select class="form-select" id="issueBookSelect" required onchange="LibrarianView.previewBookInfo(this.value)">
                    <option value="">Choose a book...</option>
                  </select>
                  <div id="bookPreviewBox" class="mt-2 small text-muted"></div>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Issue Notes (Optional)</label>
                  <input type="text" class="form-control" id="issueNotes" placeholder="e.g. Counter Issue, Semester Project...">
                </div>

                <button type="submit" class="btn btn-primary w-100" id="issueSubmitBtn">
                  <i class="fas fa-check-circle me-1"></i> Issue Book
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- 2. Book Return Workstation -->
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="fw-bold text-success mb-0"><i class="fas fa-undo-alt me-2"></i>Process Book Return</h5>
            </div>
            <div class="card-body">
              <form id="returnBookForm" onsubmit="LibrarianView.handleReturnBook(event)">
                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Select Active Loan</label>
                  <select class="form-select" id="returnLoanSelect" required onchange="LibrarianView.previewReturnInfo(this.value)">
                    <option value="">Choose active transaction to return...</option>
                  </select>
                  <div id="returnPreviewBox" class="mt-2 small text-muted"></div>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Book Condition on Inspection</label>
                  <select class="form-select" id="returnConditionSelect">
                    <option value="GOOD">Good Condition (Restock to Shelf)</option>
                    <option value="DAMAGED">Damaged (Move to Maintenance/Repair)</option>
                    <option value="LOST">Lost (Mark as Lost Copy)</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold text-muted">Staff Notes</label>
                  <input type="text" class="form-control" id="returnNotes" placeholder="Inspection remarks...">
                </div>

                <button type="submit" class="btn btn-success w-100" id="returnSubmitBtn">
                  <i class="fas fa-clipboard-check me-1"></i> Complete Return & Calculate Fine
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Active Loans List -->
      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
          <h5 class="fw-bold mb-0"><i class="fas fa-list text-primary me-2"></i>All Active Library Loans</h5>
          <button class="btn btn-sm btn-outline-primary" onclick="LibrarianView.loadActiveLoansTable()"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive" id="librarianActiveLoansTable">
            <div class="text-center py-4"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    await Promise.all([
      this.populateIssueDropdowns(),
      this.populateReturnDropdowns(),
      this.loadActiveLoansTable()
    ]);
  },

  async populateIssueDropdowns() {
    try {
      const [membersRes, booksRes] = await Promise.all([
        API.getUsers({ role: 'MEMBER', limit: 100 }),
        API.getBooks({ available: 'true', limit: 100 })
      ]);

      const memberSelect = document.getElementById('issueMemberSelect');
      const bookSelect = document.getElementById('issueBookSelect');

      if (memberSelect) {
        memberSelect.innerHTML = '<option value="">Choose a member...</option>' +
          (membersRes.data.items || []).map(m => `
            <option value="${m._id}">${escapeHtml(m.name)} (${m.membershipId}) - [${m.memberType}]</option>
          `).join('');
      }

      if (bookSelect) {
        bookSelect.innerHTML = '<option value="">Choose a book...</option>' +
          (booksRes.data.items || []).map(b => `
            <option value="${b._id}">${escapeHtml(b.title)} (${b.availableCopies} avail) - [${b.category}]</option>
          `).join('');
      }
    } catch (err) {
      console.error('Error populating issue dropdowns:', err);
    }
  },

  async populateReturnDropdowns() {
    try {
      const res = await API.getActiveLoans();
      const loans = res.data.loans || [];
      const returnSelect = document.getElementById('returnLoanSelect');

      if (returnSelect) {
        returnSelect.innerHTML = '<option value="">Choose active transaction to return...</option>' +
          loans.map(l => `
            <option value="${l._id}">
              ${escapeHtml(l.bookId ? l.bookId.title : 'Book')} - Issued to: ${escapeHtml(l.memberId ? l.memberId.name : 'Member')} (Due: ${new Date(l.dueDate).toLocaleDateString()})
            </option>
          `).join('');
      }
    } catch (err) {
      console.error('Error populating return dropdown:', err);
    }
  },

  async loadActiveLoansTable() {
    const target = document.getElementById('librarianActiveLoansTable');
    if (!target) return;

    try {
      const res = await API.getActiveLoans();
      const loans = res.data.loans || [];

      if (loans.length === 0) {
        target.innerHTML = `<div class="p-4 text-center text-muted">No active loans currently in circulation.</div>`;
        return;
      }

      const now = new Date();
      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Book</th>
              <th>Member</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${loans.map(l => {
              const isOverdue = new Date(l.dueDate) < now;
              return `
                <tr>
                  <td>
                    <div class="fw-bold">${escapeHtml(l.bookId ? l.bookId.title : 'Book')}</div>
                    <small class="text-muted">ISBN: ${l.bookId ? l.bookId.isbn : ''}</small>
                  </td>
                  <td>
                    <div class="fw-bold">${escapeHtml(l.memberId ? l.memberId.name : 'Member')}</div>
                    <small class="text-muted">${l.memberId ? l.memberId.membershipId : ''}</small>
                  </td>
                  <td>${new Date(l.issueDate).toLocaleDateString()}</td>
                  <td>
                    <span class="${isOverdue ? 'text-danger fw-bold' : ''}">
                      ${new Date(l.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${isOverdue ? 'bg-danger' : 'bg-success'}">${isOverdue ? 'OVERDUE' : 'ACTIVE'}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-success" onclick="LibrarianView.quickReturn('${l._id}')">
                      <i class="fas fa-undo me-1"></i> Return
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      target.innerHTML = `<div class="p-3 alert alert-danger">${err.message}</div>`;
    }
  },

  async handleIssueBook(event) {
    event.preventDefault();
    const bookId = document.getElementById('issueBookSelect').value;
    const memberId = document.getElementById('issueMemberSelect').value;
    const notes = document.getElementById('issueNotes').value;

    try {
      const res = await API.issueBook(bookId, memberId, notes);
      App.showToast('success', res.message);
      this.renderWorkstation();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async handleReturnBook(event) {
    event.preventDefault();
    const loanId = document.getElementById('returnLoanSelect').value;
    const condition = document.getElementById('returnConditionSelect').value;
    const notes = document.getElementById('returnNotes').value;

    try {
      const res = await API.returnBook(loanId, condition, notes);
      App.showToast('success', res.message);
      this.renderWorkstation();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async quickReturn(loanId) {
    if (!confirm('Confirm return of this book in Good condition?')) return;
    try {
      const res = await API.returnBook(loanId, 'GOOD');
      App.showToast('success', res.message);
      this.renderWorkstation();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  openIssueWorkstationForBook(bookId) {
    App.navigateTo('librarian-workstation');
    setTimeout(() => {
      const bookSelect = document.getElementById('issueBookSelect');
      if (bookSelect) bookSelect.value = bookId;
    }, 400);
  },

  async renderBooks() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-book text-primary me-2"></i>Manage Book Catalog</h2>
          <p class="text-muted mb-0">Add new titles, edit descriptions, adjust copy counts, or archive books.</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="LibrarianView.openAddBookModal()"><i class="fas fa-plus me-1"></i> Add New Book</button>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="librarianBooksTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getBooks({ limit: 50 });
      const books = res.data.items || [];
      const target = document.getElementById('librarianBooksTable');

      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Category</th>
              <th>Available / Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${books.map(b => `
              <tr>
                <td><strong>${escapeHtml(b.title)}</strong></td>
                <td>${escapeHtml(b.author)}</td>
                <td><code>${escapeHtml(b.isbn)}</code></td>
                <td><span class="badge bg-secondary">${escapeHtml(b.category)}</span></td>
                <td><strong>${b.availableCopies}</strong> / ${b.totalCopies}</td>
                <td><span class="badge ${b.status === 'AVAILABLE' ? 'bg-success' : 'bg-secondary'}">${b.status}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" onclick="LibrarianView.openEditBookModal('${b._id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-sm btn-outline-danger" onclick="LibrarianView.deleteBook('${b._id}')"><i class="fas fa-trash"></i></button>
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

  openAddBookModal() {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-plus-circle text-primary me-2"></i> Add New Academic Book`;
    modalBody.innerHTML = `
      <form id="addBookForm" onsubmit="LibrarianView.submitAddBook(event)">
        <div class="row g-3">
          <div class="col-md-12">
            <label class="form-label small fw-bold">Book Title</label>
            <input type="text" class="form-control" id="newBookTitle" required placeholder="e.g. Distributed Operating Systems">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Author(s)</label>
            <input type="text" class="form-control" id="newBookAuthor" required placeholder="e.g. Andrew S. Tanenbaum">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">ISBN-13</label>
            <input type="text" class="form-control" id="newBookIsbn" required placeholder="e.g. 9780133591620">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Category</label>
            <input type="text" class="form-control" id="newBookCategory" required placeholder="e.g. Computer Science">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Publisher</label>
            <input type="text" class="form-control" id="newBookPublisher" placeholder="e.g. Pearson">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Publication Year</label>
            <input type="number" class="form-control" id="newBookYear" value="2023">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Total Copies</label>
            <input type="number" class="form-control" id="newBookTotalCopies" min="1" value="3" required>
          </div>
          <div class="col-md-12">
            <label class="form-label small fw-bold">Cover Image URL (Optional)</label>
            <input type="url" class="form-control" id="newBookCover" placeholder="https://images.unsplash.com/...">
          </div>
          <div class="col-md-12">
            <label class="form-label small fw-bold">Description</label>
            <textarea class="form-control" id="newBookDesc" rows="3"></textarea>
          </div>
        </div>
        <div class="d-grid mt-4">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save me-1"></i> Save Book to Catalog</button>
        </div>
      </form>
    `;

    App.openGenericModal();
  },

  async submitAddBook(event) {
    event.preventDefault();
    const data = {
      title: document.getElementById('newBookTitle').value,
      author: document.getElementById('newBookAuthor').value,
      isbn: document.getElementById('newBookIsbn').value,
      category: document.getElementById('newBookCategory').value,
      publisher: document.getElementById('newBookPublisher').value,
      publicationYear: Number(document.getElementById('newBookYear').value),
      totalCopies: Number(document.getElementById('newBookTotalCopies').value),
      coverImage: document.getElementById('newBookCover').value,
      description: document.getElementById('newBookDesc').value
    };

    try {
      const res = await API.createBook(data);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderBooks();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async openEditBookModal(bookId) {
    try {
      const res = await API.getBookById(bookId);
      const { book } = res.data;

      const modalTitle = document.getElementById('genericModalTitle');
      const modalBody = document.getElementById('genericModalBody');

      modalTitle.innerHTML = `<i class="fas fa-edit text-primary me-2"></i> Edit Book Details`;
      modalBody.innerHTML = `
        <form id="editBookForm" onsubmit="LibrarianView.submitEditBook(event, '${book._id}')">
          <div class="row g-3">
            <div class="col-md-12">
              <label class="form-label small fw-bold">Book Title</label>
              <input type="text" class="form-control" id="editBookTitle" value="${escapeHtml(book.title)}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Author</label>
              <input type="text" class="form-control" id="editBookAuthor" value="${escapeHtml(book.author)}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Category</label>
              <input type="text" class="form-control" id="editBookCategory" value="${escapeHtml(book.category)}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Total Copies</label>
              <input type="number" class="form-control" id="editBookTotal" min="1" value="${book.totalCopies}" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Available Copies</label>
              <input type="number" class="form-control" id="editBookAvail" min="0" value="${book.availableCopies}" required>
            </div>
            <div class="col-md-12">
              <label class="form-label small fw-bold">Status</label>
              <select class="form-select" id="editBookStatus">
                <option value="AVAILABLE" ${book.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                <option value="ARCHIVED" ${book.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option>
                <option value="MAINTENANCE" ${book.status === 'MAINTENANCE' ? 'selected' : ''}>MAINTENANCE</option>
              </select>
            </div>
          </div>
          <div class="d-grid mt-4">
            <button type="submit" class="btn btn-primary"><i class="fas fa-save me-1"></i> Update Book</button>
          </div>
        </form>
      `;

      App.openGenericModal();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async submitEditBook(event, bookId) {
    event.preventDefault();
    const data = {
      title: document.getElementById('editBookTitle').value,
      author: document.getElementById('editBookAuthor').value,
      category: document.getElementById('editBookCategory').value,
      totalCopies: Number(document.getElementById('editBookTotal').value),
      availableCopies: Number(document.getElementById('editBookAvail').value),
      status: document.getElementById('editBookStatus').value
    };

    try {
      const res = await API.updateBook(bookId, data);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderBooks();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete or archive this book?')) return;
    try {
      const res = await API.deleteBook(bookId);
      App.showToast('success', res.message);
      this.renderBooks();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  },

  async renderInventory() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold mb-1"><i class="fas fa-boxes text-primary me-2"></i>Library Inventory Breakdown</h2>
          <p class="text-muted mb-0">Monitor total holdings, available copies, active loans, lost items, and damaged copies.</p>
        </div>
      </div>

      <div id="inventoryStatsRow" class="row g-3 mb-4"></div>

      <div class="card border-0 shadow-sm rounded-3">
        <div class="card-body p-0">
          <div class="table-responsive" id="inventoryTable">
            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await API.getInventory({ limit: 50 });
      const { summary, items } = res.data;

      const statsRow = document.getElementById('inventoryStatsRow');
      statsRow.innerHTML = `
        <div class="col-sm-6 col-md-3">
          <div class="stat-card">
            <span class="text-muted small text-uppercase fw-bold">Total Holdings</span>
            <h3 class="fw-bold my-1">${summary.totalCopies}</h3>
            <small class="text-muted">${summary.totalTitles} unique titles</small>
          </div>
        </div>
        <div class="col-sm-6 col-md-3">
          <div class="stat-card stat-success">
            <span class="text-muted small text-uppercase fw-bold">Available on Shelf</span>
            <h3 class="fw-bold my-1 text-success">${summary.availableCopies}</h3>
            <small class="text-muted">Ready for checkout</small>
          </div>
        </div>
        <div class="col-sm-6 col-md-3">
          <div class="stat-card stat-info">
            <span class="text-muted small text-uppercase fw-bold">Currently Issued</span>
            <h3 class="fw-bold my-1 text-info">${summary.issuedCopies}</h3>
            <small class="text-muted">In members' possession</small>
          </div>
        </div>
        <div class="col-sm-6 col-md-3">
          <div class="stat-card stat-danger">
            <span class="text-muted small text-uppercase fw-bold">Lost & Damaged</span>
            <h3 class="fw-bold my-1 text-danger">${summary.lostCopies + summary.damagedCopies}</h3>
            <small class="text-muted">${summary.lostCopies} lost, ${summary.damagedCopies} damaged</small>
          </div>
        </div>
      `;

      const target = document.getElementById('inventoryTable');
      target.innerHTML = `
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Total</th>
              <th>Available</th>
              <th>Issued</th>
              <th>Lost</th>
              <th>Damaged</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(b => `
              <tr>
                <td>
                  <strong>${escapeHtml(b.title)}</strong><br>
                  <small class="text-muted">ISBN: ${escapeHtml(b.isbn)}</small>
                </td>
                <td><strong>${b.totalCopies}</strong></td>
                <td><span class="badge bg-success">${b.availableCopies}</span></td>
                <td><span class="badge bg-primary">${b.issuedCopies}</span></td>
                <td><span class="badge bg-danger">${b.lostCopies}</span></td>
                <td><span class="badge bg-warning text-dark">${b.damagedCopies}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" onclick="LibrarianView.openAdjustInventoryModal('${b._id}', ${b.totalCopies}, ${b.availableCopies}, ${b.lostCopies}, ${b.damagedCopies})">
                    <i class="fas fa-sliders-h"></i>
                  </button>
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

  openAdjustInventoryModal(bookId, total, avail, lost, damaged) {
    const modalTitle = document.getElementById('genericModalTitle');
    const modalBody = document.getElementById('genericModalBody');

    modalTitle.innerHTML = `<i class="fas fa-sliders-h text-primary me-2"></i> Adjust Inventory Copies`;
    modalBody.innerHTML = `
      <form onsubmit="LibrarianView.submitAdjustInventory(event, '${bookId}')">
        <div class="row g-3">
          <div class="col-6">
            <label class="form-label small fw-bold">Total Copies</label>
            <input type="number" class="form-control" id="adjTotal" value="${total}" min="1" required>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold">Available On Shelf</label>
            <input type="number" class="form-control" id="adjAvail" value="${avail}" min="0" required>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold">Lost Copies</label>
            <input type="number" class="form-control" id="adjLost" value="${lost}" min="0" required>
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold">Damaged Copies</label>
            <input type="number" class="form-control" id="adjDamaged" value="${damaged}" min="0" required>
          </div>
        </div>
        <div class="d-grid mt-4">
          <button type="submit" class="btn btn-primary">Save Adjustments</button>
        </div>
      </form>
    `;

    App.openGenericModal();
  },

  async submitAdjustInventory(event, bookId) {
    event.preventDefault();
    const data = {
      totalCopies: Number(document.getElementById('adjTotal').value),
      availableCopies: Number(document.getElementById('adjAvail').value),
      lostCopies: Number(document.getElementById('adjLost').value),
      damagedCopies: Number(document.getElementById('adjDamaged').value)
    };

    try {
      const res = await API.updateInventory(bookId, data);
      App.showToast('success', res.message);
      App.closeGenericModal();
      this.renderInventory();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  }
};
