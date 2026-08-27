const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');

// Load Mongoose models
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Message = require('./models/Message');
const Feedback = require('./models/Feedback');

/**
 * Import Seed Data into MongoDB
 */
const importData = async () => {
  try {
    await connectDB();

    console.log('🧹 Wiping existing database collections...');
    await User.deleteMany();
    await Complaint.deleteMany();
    await Message.deleteMany();
    await Feedback.deleteMany();

    console.log('👤 Seeding Users (1 Admin, 2 Agents, 3 Users)...');
    
    // Hash password explicitly for reliable seed insertion
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersData = [
      {
        name: 'System Admin',
        email: 'admin@complaint.com',
        password: hashedPassword,
        role: 'ADMIN',
        department: 'Administration',
        phone: '9876543210',
        contactNumber: '9876543210',
      },
      {
        name: 'Alex IT Support',
        email: 'agent.it@complaint.com',
        password: hashedPassword,
        role: 'AGENT',
        department: 'IT',
        phone: '9876543211',
        contactNumber: '9876543211',
      },
      {
        name: 'Morgan Maintenance',
        email: 'agent.maint@complaint.com',
        password: hashedPassword,
        role: 'AGENT',
        department: 'Maintenance',
        phone: '9876543212',
        contactNumber: '9876543212',
      },
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        role: 'USER',
        department: 'Computer Engineering',
        phone: '9876543213',
        contactNumber: '9876543213',
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        role: 'USER',
        department: 'Electrical Engineering',
        phone: '9876543214',
        contactNumber: '9876543214',
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        password: hashedPassword,
        role: 'USER',
        department: 'Mechanical Engineering',
        phone: '9876543215',
        contactNumber: '9876543215',
      },
    ];

    const createdUsers = await User.insertMany(usersData);
    
    const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
    const agentIt = createdUsers.find((u) => u.email === 'agent.it@complaint.com');
    const agentMaint = createdUsers.find((u) => u.email === 'agent.maint@complaint.com');
    const userJohn = createdUsers.find((u) => u.email === 'john.doe@example.com');
    const userJane = createdUsers.find((u) => u.email === 'jane.smith@example.com');
    const userBob = createdUsers.find((u) => u.email === 'bob.johnson@example.com');

    console.log('🎫 Seeding 6 Realistic Complaints...');
    
    const complaintsData = [
      {
        title: 'Wi-Fi connection failing in CS Lab 3',
        description: 'Computers in rows 2 and 3 cannot connect to the campus network or internet.',
        category: 'IT',
        priority: 'High',
        status: 'Pending',
        creator: userJohn._id,
        user: userJohn._id,
        assignedAgent: null,
        attachments: [],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userJohn._id,
            remark: 'Complaint submitted',
          },
        ],
      },
      {
        title: 'Projector not displaying colors correctly in Room 204',
        description: 'Screen output is heavily tinting yellow/green during lectures.',
        category: 'IT',
        priority: 'Medium',
        status: 'In Progress',
        creator: userJane._id,
        user: userJane._id,
        assignedAgent: agentIt._id,
        attachments: ['https://example.com/attachments/projector_screen.jpg'],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userJane._id,
            remark: 'Complaint submitted',
          },
          {
            status: 'In Progress',
            updatedBy: agentIt._id,
            remark: 'Assigned to IT agent. Inspected display cable and ordered replacement adapter.',
          },
        ],
      },
      {
        title: 'Water leakage in 2nd floor restrooms',
        description: 'Water leaking from pipe valve beneath sink #2 causing slippery floor hazard.',
        category: 'Maintenance',
        priority: 'Critical',
        status: 'In Progress',
        creator: userBob._id,
        user: userBob._id,
        assignedAgent: agentMaint._id,
        attachments: [],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userBob._id,
            remark: 'Emergency complaint submitted',
          },
          {
            status: 'In Progress',
            updatedBy: agentMaint._id,
            remark: 'Plumbing response team dispatched to isolate valve.',
          },
        ],
      },
      {
        title: 'Duplicate lab fee charged on student portal',
        description: 'Fee portal shows double charge of $150 for semester lab access.',
        category: 'Billing',
        priority: 'Low',
        status: 'Resolved',
        creator: userJohn._id,
        user: userJohn._id,
        assignedAgent: agentIt._id,
        attachments: [],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userJohn._id,
            remark: 'Billing discrepancy reported',
          },
          {
            status: 'In Progress',
            updatedBy: agentIt._id,
            remark: 'Verified transaction history with finance team.',
          },
          {
            status: 'Resolved',
            updatedBy: agentIt._id,
            remark: 'Duplicate charge refunded and statement updated.',
          },
        ],
      },
      {
        title: 'Air conditioner making loud noise in Seminar Hall',
        description: 'AC unit #3 makes rattling noise when compressor kicks in.',
        category: 'Maintenance',
        priority: 'High',
        status: 'Closed',
        creator: userJane._id,
        user: userJane._id,
        assignedAgent: agentMaint._id,
        attachments: [],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userJane._id,
            remark: 'AC noise reported',
          },
          {
            status: 'In Progress',
            updatedBy: agentMaint._id,
            remark: 'Replaced loose fan belt and tightened mounting bracket.',
          },
          {
            status: 'Resolved',
            updatedBy: agentMaint._id,
            remark: 'Service completed. Tested for 30 minutes with zero noise.',
          },
          {
            status: 'Closed',
            updatedBy: userJane._id,
            remark: 'User confirmed issue is fully fixed.',
          },
        ],
      },
      {
        title: 'Software license expired on Graphics Workstation',
        description: 'AutoCAD software fails to launch due to license check error.',
        category: 'IT',
        priority: 'Medium',
        status: 'Pending',
        creator: userBob._id,
        user: userBob._id,
        assignedAgent: null,
        attachments: [],
        auditTrail: [
          {
            status: 'Pending',
            updatedBy: userBob._id,
            remark: 'License renewal requested',
          },
        ],
      },
    ];

    const createdComplaints = await Complaint.insertMany(complaintsData);

    const inProgressItComplaint = createdComplaints.find(
      (c) => c.title === 'Projector not displaying colors correctly in Room 204'
    );
    const inProgressMaintComplaint = createdComplaints.find(
      (c) => c.title === 'Water leakage in 2nd floor restrooms'
    );
    const resolvedBillingComplaint = createdComplaints.find(
      (c) => c.title === 'Duplicate lab fee charged on student portal'
    );
    const closedMaintComplaint = createdComplaints.find(
      (c) => c.title === 'Air conditioner making loud noise in Seminar Hall'
    );

    console.log('💬 Seeding Sample Messages / Chat Exchanges...');

    const messagesData = [
      {
        complaintRef: inProgressItComplaint._id,
        sender: userJane._id,
        text: 'Hi Alex, any update on the projector? We have a lab presentation at 2 PM.',
      },
      {
        complaintRef: inProgressItComplaint._id,
        sender: agentIt._id,
        text: 'Hello Jane, I have brought a replacement HDMI adapter. I will finish setup by 1:30 PM.',
      },
      {
        complaintRef: inProgressItComplaint._id,
        sender: userJane._id,
        text: 'Awesome, thanks for the quick turnaround!',
      },
      {
        complaintRef: inProgressMaintComplaint._id,
        sender: userBob._id,
        text: 'Water is starting to puddle into the corridor floor.',
      },
      {
        complaintRef: inProgressMaintComplaint._id,
        sender: agentMaint._id,
        text: 'Main supply shutoff valve engaged. Plumber is working on pipe replacement now.',
      },
    ];

    await Message.insertMany(messagesData);

    console.log('⭐ Seeding 5-Star & 4-Star Feedback Records...');

    const feedbackData = [
      {
        complaintRef: resolvedBillingComplaint._id,
        complaint: resolvedBillingComplaint._id,
        user: userJohn._id,
        rating: 5,
        comments: 'Prompt response and accurate refund handling. Excellent service!',
      },
      {
        complaintRef: closedMaintComplaint._id,
        complaint: closedMaintComplaint._id,
        user: userJane._id,
        rating: 4,
        comments: 'AC is running quietly now. Appreciate fixing it before our seminar!',
      },
    ];

    await Feedback.insertMany(feedbackData);

    console.log('✅ Database Seeded Successfully!');
    console.log('------------------------------------');
    console.log('🔑 Seeded Credentials:');
    console.log('   Admin: admin@complaint.com | password123');
    console.log('   Agent (IT): agent.it@complaint.com | password123');
    console.log('   Agent (Maint): agent.maint@complaint.com | password123');
    console.log('   User: john.doe@example.com | password123');
    console.log('------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error with data import: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

/**
 * Destroy Seed Data from MongoDB
 */
const destroyData = async () => {
  try {
    await connectDB();

    console.log('🗑️ Flushing all database collections...');
    await User.deleteMany();
    await Complaint.deleteMany();
    await Message.deleteMany();
    await Feedback.deleteMany();

    console.log('✅ Database Collections Cleared!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error with data destruction: ${error.message}`);
    process.exit(1);
  }
};

// Check execution flag
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
