/**
 * Frontend REST API Client
 */

const API = {
  getToken() {
    return localStorage.getItem('jwt_token') || '';
  },

  setToken(token) {
    localStorage.setItem('jwt_token', token);
  },

  getUser() {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();

      if (!response.ok) {
        // Build descriptive error message
        let errorMsg = data.message || `Request failed with status ${response.status}`;
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          errorMsg += ' - ' + data.errors.map(e => e.message).join(', ');
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        error.errorCode = data.errorCode;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  getMe() {
    return this.request('/api/auth/me');
  },

  // Books
  getBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/books?${query}`);
  },

  searchBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/books/search?${query}`);
  },

  getBookById(id) {
    return this.request(`/api/books/${id}`);
  },

  createBook(bookData) {
    return this.request('/api/books', {
      method: 'POST',
      body: bookData
    });
  },

  updateBook(id, bookData) {
    return this.request(`/api/books/${id}`, {
      method: 'PUT',
      body: bookData
    });
  },

  deleteBook(id) {
    return this.request(`/api/books/${id}`, {
      method: 'DELETE'
    });
  },

  // Transactions
  issueBook(bookId, memberId, notes = '') {
    return this.request('/api/transactions/issue', {
      method: 'POST',
      body: { bookId, memberId, notes }
    });
  },

  returnBook(transactionId, condition = 'GOOD', notes = '') {
    return this.request(`/api/transactions/${transactionId}/return`, {
      method: 'PUT',
      body: { condition, notes }
    });
  },

  getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/transactions?${query}`);
  },

  getActiveLoans() {
    return this.request('/api/transactions/active');
  },

  getOverdueLoans() {
    return this.request('/api/transactions/overdue');
  },

  // Holds
  placeHold(bookId) {
    return this.request('/api/holds', {
      method: 'POST',
      body: { bookId }
    });
  },

  getHolds(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/holds?${query}`);
  },

  cancelHold(holdId) {
    return this.request(`/api/holds/${holdId}/cancel`, {
      method: 'PUT'
    });
  },

  // Fines
  getMemberFines(memberId) {
    return this.request(`/api/members/${memberId}/fines`);
  },

  payFine(transactionId, amount, paymentMethod = 'ONLINE_SIMULATED', notes = '') {
    return this.request('/api/fine-payments', {
      method: 'POST',
      body: { transactionId, amount: Number(amount), paymentMethod, notes }
    });
  },

  waiveFine(transactionId, notes = '') {
    return this.request(`/api/fine-payments/${transactionId}/waive`, {
      method: 'PUT',
      body: { notes }
    });
  },

  // Notifications
  getNotifications() {
    return this.request('/api/notifications');
  },

  markNotificationRead(id) {
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'PUT' });
  },

  // Member History
  getMemberHistory(memberId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/members/${memberId}/history?${query}`);
  },

  // Inventory
  getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/inventory?${query}`);
  },

  updateInventory(bookId, data) {
    return this.request(`/api/inventory/${bookId}`, {
      method: 'PUT',
      body: data
    });
  },

  // Membership Plans
  getPlans() {
    return this.request('/api/membership-plans');
  },

  createPlan(planData) {
    return this.request('/api/membership-plans', {
      method: 'POST',
      body: planData
    });
  },

  updatePlan(id, planData) {
    return this.request(`/api/membership-plans/${id}`, {
      method: 'PUT',
      body: planData
    });
  },

  // Reports
  getReportsOverdue() {
    return this.request('/api/admin/reports/overdue');
  },

  getReportsMostBorrowed() {
    return this.request('/api/admin/reports/most-borrowed');
  },

  getReportsInventory() {
    return this.request('/api/admin/reports/inventory');
  },

  getReportsFines() {
    return this.request('/api/admin/reports/fines');
  },

  getReportsMembers() {
    return this.request('/api/admin/reports/members');
  },

  getReportsCategories() {
    return this.request('/api/admin/reports/categories');
  },

  // Admin
  getAdminOverview() {
    return this.request('/api/admin/overview');
  },

  getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/admin/users?${query}`);
  },

  updateUserStatus(userId, status) {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: { status }
    });
  },

  updateUserRole(userId, role) {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role }
    });
  },

  updateUserPlan(userId, membershipPlanId) {
    return this.request(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      body: { membershipPlanId }
    });
  },

  createLibrarian(data) {
    return this.request('/api/admin/librarians', {
      method: 'POST',
      body: data
    });
  },

  getSettings() {
    return this.request('/api/admin/settings');
  },

  updateSetting(key, value, description) {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: { key, value, description }
    });
  },

  getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/admin/audit-logs?${query}`);
  }
};
