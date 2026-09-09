const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Hold = require('../models/Hold');
const Transaction = require('../models/Transaction');
const MembershipPlan = require('../models/MembershipPlan');
const { generateToken } = require('../utils/generateToken');
const { ROLES, HOLD_STATUSES } = require('../constants');

describe('Module 6: Reservation / Hold Queue Workflow Tests', () => {
  let memberToken;
  let librarianToken;
  let member;
  let librarian;
  let book;
  let activeLoan;

  beforeAll(async () => {
    await connectDB();
    await Hold.deleteMany({});
    await Transaction.deleteMany({});
    await Book.deleteMany({});
    await User.deleteMany({});
    await MembershipPlan.deleteMany({});

    const plan = await MembershipPlan.create({
      name: 'STUDENT',
      maximumBooks: 3,
      loanDurationDays: 14,
      reservationLimit: 3,
      isDefault: true
    });

    librarian = await User.create({
      name: 'Librarian Queue Manager',
      email: 'librarian.queue@library.edu',
      passwordHash: 'dummy',
      role: ROLES.LIBRARIAN,
      membershipId: 'LIB-QUEUE-STAFF'
    });
    librarianToken = generateToken({ userId: librarian._id, role: librarian.role, email: librarian.email });

    member = await User.create({
      name: 'Waiting Member',
      email: 'waiting.member@library.edu',
      passwordHash: 'dummy',
      role: ROLES.MEMBER,
      membershipId: 'LIB-2026-HOLD1',
      membershipPlanId: plan._id,
      status: 'ACTIVE'
    });
    memberToken = generateToken({ userId: member._id, role: member.role, email: member.email });

    // Out of stock book with 1 copy issued
    book = await Book.create({
      title: 'Distributed Systems',
      author: 'Tanenbaum',
      isbn: '9780132392273',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 0
    });

    activeLoan = await Transaction.create({
      bookId: book._id,
      memberId: librarian._id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  let createdHoldId;

  test('1. Member places hold on unavailable book -> 201 Created & Position #1', async () => {
    const res = await request(app)
      .post('/api/holds')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId: book._id });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hold.status).toBe(HOLD_STATUSES.WAITING);
    expect(res.body.data.queuePosition).toBe(1);

    createdHoldId = res.body.data.hold._id;
  });

  test('2. Prevent duplicate active hold by same member -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/holds')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId: book._id });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('DUPLICATE_HOLD');
  });

  test('3. View book queue by Librarian -> 200 OK', async () => {
    const res = await request(app)
      .get(`/api/holds/queue/${book._id}`)
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queue.length).toBe(1);
  });

  test('4. Auto-trigger on book return: hold transitions from WAITING to READY', async () => {
    // Return the active loan
    const res = await request(app)
      .put(`/api/transactions/${activeLoan._id}/return`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ condition: 'GOOD' });

    expect(res.statusCode).toBe(200);

    // Verify hold transitioned to READY with expiration time
    const updatedHold = await Hold.findById(createdHoldId);
    expect(updatedHold.status).toBe(HOLD_STATUSES.READY);
    expect(updatedHold.readyAt).toBeDefined();
    expect(updatedHold.expiresAt).toBeDefined();
  });

  test('5. Cancel hold by member -> 200 OK', async () => {
    const res = await request(app)
      .put(`/api/holds/${createdHoldId}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hold.status).toBe(HOLD_STATUSES.CANCELLED);
  });
});
