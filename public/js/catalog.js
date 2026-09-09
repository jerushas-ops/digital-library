/**
 * Book Catalog & Search Module
 */

const Catalog = {
  currentCategory: '',
  searchQuery: '',
  availableOnly: false,
  currentPage: 1,

  async render() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="row mb-4 align-items-center">
        <div class="col-md-6">
          <h2 class="fw-bold mb-1"><i class="fas fa-book-open text-primary me-2"></i>University Book Catalog</h2>
          <p class="text-muted mb-0">Search, discover, check real-time availability, and borrow or reserve books.</p>
        </div>
        <div class="col-md-6 text-md-end mt-3 mt-md-0">
          <div class="btn-group" role="group">
            <input type="checkbox" class="btn-check" id="availableFilterToggle" autocomplete="off" onchange="Catalog.toggleAvailability(this.checked)">
            <label class="btn btn-outline-success btn-sm" for="availableFilterToggle">
              <i class="fas fa-check-circle me-1"></i> Available On Shelf Only
            </label>
          </div>
        </div>
      </div>

      <!-- Search & Filters Bar -->
      <div class="card border-0 shadow-sm rounded-3 mb-4">
        <div class="card-body p-3">
          <div class="row g-2">
            <div class="col-lg-7 col-md-6">
              <div class="input-group">
                <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                <input type="text" id="catalogSearchInput" class="form-control border-start-0" 
                  placeholder="Search by title, author, ISBN, or subject..." 
                  value="${this.searchQuery}"
                  oninput="Catalog.handleSearch(this.value)">
              </div>
            </div>
            <div class="col-lg-5 col-md-6">
              <select id="categoryFilterSelect" class="form-select" onchange="Catalog.filterCategory(this.value)">
                <option value="">All Academic Categories</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Biology">Biology</option>
                <option value="Economics">Economics</option>
                <option value="History">History</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Books Grid Container -->
      <div id="booksGridContainer" class="row g-4 mb-4">
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted mt-2">Loading library catalog...</p>
        </div>
      </div>

      <!-- Pagination -->
      <nav id="catalogPagination" class="d-flex justify-content-center mb-5"></nav>
    `;

    if (this.currentCategory) {
      const select = document.getElementById('categoryFilterSelect');
      if (select) select.value = this.currentCategory;
    }

    const availToggle = document.getElementById('availableFilterToggle');
    if (availToggle) availToggle.checked = this.availableOnly;

    await this.fetchBooks();
  },

  handleSearch: debounce(function (query) {
    Catalog.searchQuery = query.trim();
    Catalog.currentPage = 1;
    Catalog.fetchBooks();
  }, 300),

  filterCategory(category) {
    this.currentCategory = category;
    this.currentPage = 1;
    this.fetchBooks();
  },

  toggleAvailability(isAvailable) {
    this.availableOnly = isAvailable;
    this.currentPage = 1;
    this.fetchBooks();
  },

  async fetchBooks() {
    const grid = document.getElementById('booksGridContainer');
    if (!grid) return;

    try {
      const params = {
        page: this.currentPage,
        limit: 8
      };

      if (this.searchQuery) params.q = this.searchQuery;
      if (this.currentCategory) params.category = this.currentCategory;
      if (this.availableOnly) params.available = 'true';

      const res = this.searchQuery ? await API.searchBooks(params) : await API.getBooks(params);
      const { items, pagination } = res.data;

      if (!items || items.length === 0) {
        grid.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="fas fa-book-reader fa-3x text-muted mb-3"></i>
            <h5 class="text-secondary">No books found matching your criteria.</h5>
            <p class="text-muted">Try adjusting your search terms or clearing the category filter.</p>
          </div>
        `;
        document.getElementById('catalogPagination').innerHTML = '';
        return;
      }

      grid.innerHTML = items.map((book) => this.renderBookCard(book)).join('');
      this.renderPagination(pagination);
    } catch (err) {
      grid.innerHTML = `
        <div class="col-12 alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i> Failed to load catalog: ${err.message}
        </div>
      `;
    }
  },

  renderBookCard(book) {
    const isAvailable = book.availableCopies > 0 && book.status === 'AVAILABLE';
    const user = Auth.currentUser;

    let actionButton = '';
    if (!user) {
      actionButton = `
        <button class="btn btn-outline-primary btn-sm w-100" onclick="App.openAuthModal('login')">
          <i class="fas fa-sign-in-alt me-1"></i> Login to Borrow
        </button>
      `;
    } else if (user.role === 'MEMBER') {
      if (isAvailable) {
        actionButton = `
          <button class="btn btn-primary btn-sm w-100" onclick="MemberView.requestBorrowModal('${book._id}')">
            <i class="fas fa-book-reader me-1"></i> Borrow Book
          </button>
        `;
      } else {
        actionButton = `
          <button class="btn btn-warning btn-sm w-100 text-dark" onclick="MemberView.placeReservation('${book._id}')">
            <i class="fas fa-bookmark me-1"></i> Place Reservation Hold
          </button>
        `;
      }
    } else if (user.role === 'LIBRARIAN' || user.role === 'ADMIN') {
      actionButton = `
        <button class="btn btn-indigo btn-sm w-100" style="background:#4f46e5; color:white;" onclick="LibrarianView.openIssueWorkstationForBook('${book._id}')">
          <i class="fas fa-exchange-alt me-1"></i> Issue to Member
        </button>
      `;
    }

    return `
      <div class="col-xl-3 col-lg-4 col-md-6">
        <div class="book-card shadow-sm">
          <div class="book-cover" style="background-image: linear-gradient(rgba(15,23,42,0.4), rgba(15,23,42,0.8)), url('${book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}');">
            <div class="book-cover-overlay">
              <span class="badge ${isAvailable ? 'bg-success' : 'bg-danger'} book-badge-avail">
                ${isAvailable ? `${book.availableCopies} Available` : 'Out of Stock'}
              </span>
            </div>
            <div class="position-absolute bottom-0 start-0 p-3 text-white">
              <span class="badge bg-secondary mb-1" style="font-size:0.7rem;">${escapeHtml(book.category)}</span>
            </div>
          </div>
          <div class="card-body p-3 d-flex flex-column">
            <h6 class="card-title fw-bold text-truncate mb-1" title="${escapeHtml(book.title)}">
              ${escapeHtml(book.title)}
            </h6>
            <p class="text-muted small mb-2 text-truncate" title="${escapeHtml(book.author)}">
              <i class="fas fa-pen-nib me-1"></i> ${escapeHtml(book.author)}
            </p>
            <p class="small text-muted mb-3 line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px;">
              ${escapeHtml(book.description || 'No description provided.')}
            </p>
            <div class="mt-auto pt-2 border-top">
              <div class="d-flex justify-content-between text-muted small mb-2">
                <span>ISBN: <code>${escapeHtml(book.isbn)}</code></span>
                <span>Copies: <strong>${book.availableCopies}/${book.totalCopies}</strong></span>
              </div>
              <div class="d-grid gap-2">
                ${actionButton}
                <button class="btn btn-light btn-sm text-secondary" onclick="Catalog.showBookDetails('${book._id}')">
                  <i class="fas fa-info-circle me-1"></i> View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderPagination(pagination) {
    const nav = document.getElementById('catalogPagination');
    if (!nav || pagination.totalPages <= 1) {
      if (nav) nav.innerHTML = '';
      return;
    }

    let html = '<ul class="pagination pagination-sm">';
    html += `
      <li class="page-item ${!pagination.hasPrevPage ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="Catalog.goToPage(${pagination.page - 1})">Previous</a>
      </li>
    `;

    for (let i = 1; i <= pagination.totalPages; i++) {
      html += `
        <li class="page-item ${i === pagination.page ? 'active' : ''}">
          <a class="page-link" href="#" onclick="Catalog.goToPage(${i})">${i}</a>
        </li>
      `;
    }

    html += `
      <li class="page-item ${!pagination.hasNextPage ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="Catalog.goToPage(${pagination.page + 1})">Next</a>
      </li>
    </ul>`;

    nav.innerHTML = html;
  },

  goToPage(pageNum) {
    this.currentPage = pageNum;
    this.fetchBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async showBookDetails(bookId) {
    try {
      const res = await API.getBookById(bookId);
      const { book, stats } = res.data;

      const modalBody = document.getElementById('genericModalBody');
      const modalTitle = document.getElementById('genericModalTitle');

      modalTitle.innerHTML = `<i class="fas fa-book me-2"></i> ${escapeHtml(book.title)}`;
      modalBody.innerHTML = `
        <div class="row g-4">
          <div class="col-md-4 text-center">
            <img src="${book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}" 
                 class="img-fluid rounded-3 shadow-sm mb-3" alt="Cover" style="max-height: 250px;">
            <div class="badge ${book.availableCopies > 0 ? 'bg-success' : 'bg-danger'} px-3 py-2 w-100">
              ${book.availableCopies > 0 ? `${book.availableCopies} Available on Shelf` : 'Currently Out of Stock'}
            </div>
          </div>
          <div class="col-md-8">
            <h5 class="fw-bold mb-1">${escapeHtml(book.title)}</h5>
            <p class="text-muted mb-2">By <strong>${escapeHtml(book.author)}</strong></p>
            
            <div class="row g-2 mb-3 bg-light p-3 rounded-3">
              <div class="col-6"><strong>ISBN:</strong> ${escapeHtml(book.isbn)}</div>
              <div class="col-6"><strong>Category:</strong> ${escapeHtml(book.category)}</div>
              <div class="col-6"><strong>Publisher:</strong> ${escapeHtml(book.publisher || 'N/A')}</div>
              <div class="col-6"><strong>Publication Year:</strong> ${book.publicationYear || 'N/A'}</div>
              <div class="col-6"><strong>Total Inventory:</strong> ${book.totalCopies} copies</div>
              <div class="col-6"><strong>Times Borrowed:</strong> ${book.borrowCount || 0} times</div>
            </div>

            <h6 class="fw-bold">Description</h6>
            <p class="text-secondary small mb-3">${escapeHtml(book.description || 'No detailed description available.')}</p>

            <div class="d-flex gap-2">
              <span class="badge bg-primary-subtle text-primary p-2"><i class="fas fa-hand-holding me-1"></i> Active Loans: ${stats.activeLoansCount || 0}</span>
              <span class="badge bg-warning-subtle text-warning p-2"><i class="fas fa-clock me-1"></i> Waitlist Holds: ${stats.waitingHoldsCount || 0}</span>
            </div>
          </div>
        </div>
      `;

      App.openGenericModal();
    } catch (err) {
      App.showToast('danger', err.message);
    }
  }
};

// Utility debounce helper
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
