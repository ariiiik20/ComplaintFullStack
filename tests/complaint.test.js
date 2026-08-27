const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';

const app = require('../server');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

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

describe('🎫 Complaint Lifecycle API Integration Tests', () => {
  it('should complete full complaint lifecycle: creation, agent assignment, and status resolution', async () => {
    // 1. Register User, Agent, Admin
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User One', email: 'user1@example.com', password: 'password123', role: 'USER' });

    const agentRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Agent One', email: 'agent1@example.com', password: 'password123', role: 'AGENT' });

    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin One', email: 'admin1@example.com', password: 'password123', role: 'ADMIN' });

    const userToken = userRes.body.token;
    const agentId = agentRes.body.user._id;
    const agentToken = agentRes.body.token;
    const adminToken = adminRes.body.token;

    // 2. User creates a complaint
    const createRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Broken desk chair',
        description: 'Chair wheel snapped during lab hours.',
        category: 'Maintenance',
        priority: 'Medium',
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    const complaintId = createRes.body.complaint._id;
    expect(complaintId).toBeDefined();

    // 3. Admin assigns agent to complaint
    const assignRes = await request(app)
      .put(`/api/complaints/${complaintId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agentId });

    expect(assignRes.statusCode).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.complaint.status).toBe('In Progress');

    // 4. Agent transitions status to 'Resolved'
    const statusRes = await request(app)
      .put(`/api/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        status: 'Resolved',
        remark: 'Replaced broken chair wheel with spare part.',
      });

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.complaint.status).toBe('Resolved');
  });

  it('should allow Admin to provision new Agent accounts via POST /api/admin/agents', async () => {
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Two', email: 'admin2@example.com', password: 'password123', role: 'ADMIN' });

    const adminToken = adminRes.body.token;

    const createAgentRes = await request(app)
      .post('/api/admin/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Agent',
        email: 'newagent@example.com',
        password: 'password123',
        department: 'IT',
        phone: '9876543210',
      });

    expect(createAgentRes.statusCode).toBe(201);
    expect(createAgentRes.body.success).toBe(true);
    expect(createAgentRes.body.agent.role).toBe('AGENT');
    expect(createAgentRes.body.agent.department).toBe('IT');
  });

  it('should allow Admin to fetch all feedback reviews via GET /api/feedback', async () => {
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Three', email: 'admin3@example.com', password: 'password123', role: 'ADMIN' });

    const adminToken = adminRes.body.token;

    const feedbackRes = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(feedbackRes.statusCode).toBe(200);
    expect(feedbackRes.body.success).toBe(true);
    expect(Array.isArray(feedbackRes.body.feedbacks)).toBe(true);
  });
});
