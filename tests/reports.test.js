const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const { generateToken } = require('../utils/generateToken');
const { ROLES } = require('../constants');

describe('Module 12: Librarian/Admin Analytical Reports (MongoDB Aggregation Pipelines)', () => {
  let adminToken;

  beforeAll(async () => {
    await connectDB();
    await Transaction.deleteMany({});
    await Book.deleteMany({});
    await User.deleteMany({});

    const admin = await User.create({
      name: 'Admin Reports',
      email: 'admin.rep@library.edu',
      passwordHash: 'dummy',
      role: ROLES.ADMIN,
      membershipId: 'LIB-ADM-REP'
    });
    adminToken = generateToken({ userId: admin._id, role: admin.role, email: admin.email });

    const member = await User.create({
      name: 'Report Member',
      email: 'member.rep@library.edu',
      passwordHash: 'dummy',
      role: ROLES.MEMBER,
      membershipId: 'LIB-2026-REP'
    });

    const book = await Book.create({
      title: 'Deep Learning',
      author: 'Goodfellow',
      isbn: '9780262035613',
      category: 'Artificial Intelligence',
      totalCopies: 5,
      availableCopies: 4
    });

    // Create overdue transaction
    await Transaction.create({
      bookId: book._id,
      memberId: member._id,
      issueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test('1. Overdue Books Report -> 200 OK with aggregated overdue details', async () => {
    const res = await request(app)
      .get('/api/admin/reports/overdue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.report[0].overdueDays).toBeGreaterThan(0);
    expect(res.body.data.report[0].book.title).toBe('Deep Learning');
  });

  test('2. Most Borrowed Books Report -> 200 OK', async () => {
    const res = await request(app)
      .get('/api/admin/reports/most-borrowed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report).toBeDefined();
  });

  test('3. Inventory Health Report -> 200 OK', async () => {
    const res = await request(app)
      .get('/api/admin/reports/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report.totalCopies).toBe(5);
    expect(res.body.data.report.availableCopies).toBe(4);
    expect(res.body.data.report.issuedCopies).toBe(1);
  });

  test('4. Fine Summary Report -> 200 OK', async () => {
    const res = await request(app)
      .get('/api/admin/reports/fines')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report).toBeDefined();
  });
});
