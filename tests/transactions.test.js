const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const MembershipPlan = require('../models/MembershipPlan');
const { generateToken } = require('../utils/generateToken');
const { ROLES, TRANSACTION_STATUSES } = require('../constants');

describe('Module 4 & 5: Book Issue & Return Workflow Tests', () => {
  let librarianToken;
  let memberToken;
  let member;
  let book;
  let outOfStockBook;
  let issuedTransaction;

  beforeAll(async () => {
    await connectDB();
    await Transaction.deleteMany({});
    await Book.deleteMany({});
    await User.deleteMany({});
    await MembershipPlan.deleteMany({});

    const plan = await MembershipPlan.create({
      name: 'STUDENT',
      maximumBooks: 2,
      loanDurationDays: 14,
      finePerDay: 5,
      fineThreshold: 20,
      borrowingEnabled: true,
      isDefault: true
    });

    const librarian = await User.create({
      name: 'Librarian Staff',
      email: 'staff@library.edu',
      passwordHash: 'dummy',
      role: ROLES.LIBRARIAN,
      membershipId: 'LIB-STAFF-99'
    });
    librarianToken = generateToken({ userId: librarian._id, role: librarian.role, email: librarian.email });

    member = await User.create({
      name: 'Student Borrower',
      email: 'borrower@library.edu',
      passwordHash: 'dummy',
      role: ROLES.MEMBER,
      membershipId: 'LIB-2026-999',
      membershipPlanId: plan._id,
      status: 'ACTIVE',
      outstandingFines: 0
    });
    memberToken = generateToken({ userId: member._id, role: member.role, email: member.email });

    book = await Book.create({
      title: 'Introduction to Algorithms',
      author: 'Cormen',
      isbn: '9780262046305',
      category: 'Computer Science',
      totalCopies: 2,
      availableCopies: 2
    });

    outOfStockBook = await Book.create({
      title: 'Rare Manuscript',
      author: 'Historian',
      isbn: '9780000000001',
      category: 'History',
      totalCopies: 1,
      availableCopies: 0
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test('1. Issue book to eligible member -> 201 Created & availableCopies decremented', async () => {
    const res = await request(app)
      .post('/api/transactions/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        bookId: book._id,
        memberId: member._id
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.status).toBe(TRANSACTION_STATUSES.ACTIVE);
    expect(res.body.data.transaction.dueDate).toBeDefined();

    issuedTransaction = res.body.data.transaction;

    const updatedBook = await Book.findById(book._id);
    expect(updatedBook.availableCopies).toBe(1);
  });

  test('2. Prevent issuing unavailable / out of stock book -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/transactions/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        bookId: outOfStockBook._id,
        memberId: member._id
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('BOOK_UNAVAILABLE');
  });

  test('3. Prevent duplicate active borrowing of same book -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/transactions/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        bookId: book._id,
        memberId: member._id
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('DUPLICATE_LOAN');
  });

  test('4. Return active loan -> 200 OK & availableCopies incremented', async () => {
    const res = await request(app)
      .put(`/api/transactions/${issuedTransaction._id}/return`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ condition: 'GOOD' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.status).toBe(TRANSACTION_STATUSES.RETURNED);

    const updatedBook = await Book.findById(book._id);
    expect(updatedBook.availableCopies).toBe(2);
  });

  test('5. Prevent returning an already returned transaction -> 409 Conflict', async () => {
    const res = await request(app)
      .put(`/api/transactions/${issuedTransaction._id}/return`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ condition: 'GOOD' });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('TRANSACTION_NOT_ACTIVE');
  });
});
