const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

describe('Module 1: Member Registration & Authentication API Tests', () => {
  let studentPlan;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await MembershipPlan.deleteMany({});

    studentPlan = await MembershipPlan.create({
      name: 'STUDENT',
      maximumBooks: 3,
      loanDurationDays: 14,
      finePerDay: 5,
      isDefault: true
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  const testUser = {
    name: 'Jane Doe',
    email: 'jane.doe@university.edu',
    password: 'Password123!',
    memberType: 'STUDENT',
    phone: '+15551234567'
  };

  let token = '';

  test('1. Successful member registration -> 201 Created', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.membershipId).toMatch(/^LIB-/);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Security check
  });

  test('2. Duplicate registration with same email -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('USER_EXISTS');
  });

  test('3. Registration validation failure (short password) -> 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid User',
        email: 'invalid@example.com',
        password: '123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toBeDefined();
  });

  test('4. Successful login -> 200 OK with valid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  test('5. Login with wrong password -> 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  test('6. Access protected profile route without token -> 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  test('7. Access protected profile route with valid JWT -> 200 OK', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
  });

  test('8. Update profile with authenticated user -> 200 OK', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Doe Updated',
        phone: '+15559876543'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('Jane Doe Updated');
    expect(res.body.data.user.phone).toBe('+15559876543');
  });
});
