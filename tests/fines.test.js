const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const FinePayment = require('../models/FinePayment');
const { generateToken } = require('../utils/generateToken');
const { ROLES, FINE_STATUSES } = require('../constants');

describe('Module 8: Fine Calculation, Payment & Waiver Tests', () => {
  let memberToken;
  let librarianToken;
  let member;
  let transactionWithFine;

  beforeAll(async () => {
    await connectDB();
    await FinePayment.deleteMany({});
    await Transaction.deleteMany({});
    await Book.deleteMany({});
    await User.deleteMany({});

    const librarian = await User.create({
      name: 'Librarian Finance',
      email: 'lib.finance@library.edu',
      passwordHash: 'dummy',
      role: ROLES.LIBRARIAN,
      membershipId: 'LIB-FIN-001'
    });
    librarianToken = generateToken({ userId: librarian._id, role: librarian.role, email: librarian.email });

    member = await User.create({
      name: 'Fine Member',
      email: 'fine.member@library.edu',
      passwordHash: 'dummy',
      role: ROLES.MEMBER,
      membershipId: 'LIB-2026-FINE1',
      status: 'ACTIVE',
      outstandingFines: 50
    });
    memberToken = generateToken({ userId: member._id, role: member.role, email: member.email });

    const book = await Book.create({
      title: 'Compilers: Principles, Techniques, and Tools',
      author: 'Aho, Ullman',
      isbn: '9780321486813',
      category: 'Computer Science',
      totalCopies: 3,
      availableCopies: 3
    });

    // Transaction with $50 overdue fine
    transactionWithFine = await Transaction.create({
      bookId: book._id,
      memberId: member._id,
      issueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fine: 50,
      finePaid: 0,
      fineStatus: FINE_STATUSES.UNPAID,
      status: 'RETURNED'
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test('1. Record partial fine payment -> 201 Created & status becomes PARTIALLY_PAID', async () => {
    const res = await request(app)
      .post('/api/fine-payments')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        transactionId: transactionWithFine._id,
        amount: 20,
        paymentMethod: 'ONLINE_SIMULATED'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.finePaid).toBe(20);
    expect(res.body.data.transaction.fineStatus).toBe(FINE_STATUSES.PARTIALLY_PAID);
    expect(res.body.data.memberOutstandingFines).toBe(30);
  });

  test('2. Reject payment exceeding outstanding fine amount -> 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/fine-payments')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        transactionId: transactionWithFine._id,
        amount: 100, // Remaining is only 30
        paymentMethod: 'ONLINE_SIMULATED'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('EXCEEDS_OUTSTANDING_FINE');
  });

  test('3. Pay remaining balance -> status becomes PAID', async () => {
    const res = await request(app)
      .post('/api/fine-payments')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        transactionId: transactionWithFine._id,
        amount: 30,
        paymentMethod: 'ONLINE_SIMULATED'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.finePaid).toBe(50);
    expect(res.body.data.transaction.fineStatus).toBe(FINE_STATUSES.PAID);
    expect(res.body.data.memberOutstandingFines).toBe(0);
  });

  test('4. Reject paying an already fully settled fine -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/fine-payments')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        transactionId: transactionWithFine._id,
        amount: 10,
        paymentMethod: 'ONLINE_SIMULATED'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('FINE_ALREADY_PAID');
  });
});
