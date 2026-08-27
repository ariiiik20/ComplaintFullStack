const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';

const app = require('../server');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('🔐 Auth API Integration Tests', () => {
  it('should register a new user successfully and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Student',
        email: 'student@example.com',
        password: 'password123',
        role: 'USER',
        department: 'Computer Science',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('student@example.com');
  });

  it('should reject login with an invalid password', async () => {
    // Create user first
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Student',
        email: 'student@example.com',
        password: 'correct_password',
      });

    // Attempt login with wrong password
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'wrong_password',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('should enforce role protection and deny USER access to ADMIN routes (403 Forbidden)', async () => {
    // Register standard user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Standard User',
        email: 'user@example.com',
        password: 'password123',
        role: 'USER',
      });

    const userToken = regRes.body.token;

    // Attempt to access admin analytics
    const adminRes = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(adminRes.statusCode).toBe(403);
    expect(adminRes.body.success).toBe(false);
  });

  it('should update user profile details successfully', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Original Name',
        email: 'profile@example.com',
        password: 'password123',
        role: 'USER',
      });

    const token = regRes.body.token;

    const profileRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        phone: '9876543210',
        department: 'Information Technology',
      });

    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.user.name).toBe('Updated Name');
    expect(profileRes.body.user.phone).toBe('9876543210');
    expect(profileRes.body.user.department).toBe('Information Technology');
  });

  it('should change user password successfully and allow login with new password', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Password User',
        email: 'pass@example.com',
        password: 'oldpassword123',
        role: 'USER',
      });

    const token = regRes.body.token;

    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
      });

    expect(changeRes.statusCode).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Verify login with new password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pass@example.com',
        password: 'newpassword456',
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it('should generate password reset token and allow password reset via reset-password endpoint', async () => {
    // 1. Register user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Forgot User',
        email: 'forgot@example.com',
        password: 'initialpassword123',
        role: 'USER',
      });

    // 2. Request forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@example.com' });

    expect(forgotRes.statusCode).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.resetToken).toBeDefined();

    const resetToken = forgotRes.body.resetToken;

    // 3. Reset password using token
    const resetRes = await request(app)
      .post(`/api/auth/reset-password/${resetToken}`)
      .send({ password: 'brandnewpassword789' });

    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 4. Verify login with reset password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'forgot@example.com',
        password: 'brandnewpassword789',
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });
});
