const request = require('supertest');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const { generateToken } = require('../utils/generateToken');
const { ROLES } = require('../constants');

describe('Module 2 & 3: Book Catalog & Search API Tests', () => {
  let librarianToken;
  let memberToken;
  let sampleBook;

  beforeAll(async () => {
    await connectDB();
    await Book.deleteMany({});
    await User.deleteMany({});

    // Create librarian & member for testing RBAC
    const librarian = await User.create({
      name: 'Librarian Test',
      email: 'lib.test@library.edu',
      passwordHash: 'dummyHash',
      role: ROLES.LIBRARIAN,
      membershipId: 'LIB-TEST-001'
    });
    librarianToken = generateToken({ userId: librarian._id, role: librarian.role, email: librarian.email });

    const member = await User.create({
      name: 'Member Test',
      email: 'mem.test@library.edu',
      passwordHash: 'dummyHash',
      role: ROLES.MEMBER,
      membershipId: 'LIB-TEST-002'
    });
    memberToken = generateToken({ userId: member._id, role: member.role, email: member.email });

    sampleBook = await Book.create({
      title: 'Database System Concepts',
      author: 'Silberschatz',
      isbn: '9780078022159',
      category: 'Computer Science',
      totalCopies: 5,
      availableCopies: 5,
      publicationYear: 2019
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test('1. Public catalog retrieval with pagination -> 200 OK', async () => {
    const res = await request(app).get('/api/books?page=1&limit=5');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  test('2. Public catalog search by keyword -> 200 OK', async () => {
    const res = await request(app).get('/api/books/search?q=Database');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].title).toContain('Database');
  });

  test('3. Get single book by ID -> 200 OK with stats', async () => {
    const res = await request(app).get(`/api/books/${sampleBook._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.book._id).toBe(sampleBook._id.toString());
    expect(res.body.data.stats).toBeDefined();
  });

  test('4. Create book by Librarian -> 201 Created', async () => {
    const newBookData = {
      title: 'Operating System Concepts',
      author: 'Silberschatz, Galvin',
      isbn: '9781119456339',
      category: 'Computer Science',
      totalCopies: 4,
      availableCopies: 4,
      publicationYear: 2018
    };

    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send(newBookData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.book.isbn).toBe(newBookData.isbn);
  });

  test('5. Prevent Member from creating books (RBAC) -> 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Unauthorized Book',
        author: 'Hacker',
        isbn: '9781234567890',
        category: 'General',
        totalCopies: 1
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  test('6. Reject duplicate ISBN on book creation -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: 'Duplicate ISBN Book',
        author: 'Test Author',
        isbn: sampleBook.isbn,
        category: 'Computer Science',
        totalCopies: 2
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('7. Update book copies by Librarian -> 200 OK', async () => {
    const res = await request(app)
      .put(`/api/books/${sampleBook._id}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        totalCopies: 7,
        availableCopies: 7
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.book.totalCopies).toBe(7);
  });
});
