require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();

// --------------- GLOBAL MIDDLEWARE ---------------

// Gzip Compression
app.use(compression());

// Security headers
app.use(helmet());

// CORS — allow frontend origin
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static directory for uploaded attachments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// HTTP request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --------------- ROUTES ---------------

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// --------------- SOCKET.IO SETUP ---------------

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  // Join scoped ticket room
  socket.on('join_ticket', (ticketId) => {
    if (ticketId) {
      socket.join(ticketId.toString());
    }
  });

  socket.on('leave_ticket', (ticketId) => {
    if (ticketId) {
      socket.leave(ticketId.toString());
    }
  });

  // Direct message broadcast to ticket room
  socket.on('send_message', (data) => {
    if (data && data.complaint) {
      const room = data.complaint.toString();
      io.to(room).emit('receive_message', data);
      io.emit('new_notification', {
        type: 'MESSAGE',
        ticketId: room,
        senderName: data.sender?.name || 'Someone',
        text: data.text,
        createdAt: data.createdAt || new Date(),
      });
    }
  });

  // Real-time typing indicators
  socket.on('typing', (data) => {
    if (data && data.ticketId) {
      socket.to(data.ticketId.toString()).emit('user_typing', data);
    }
  });

  socket.on('stop_typing', (data) => {
    if (data && data.ticketId) {
      socket.to(data.ticketId.toString()).emit('user_stop_typing', data);
    }
  });

  // Ticket status changes
  socket.on('status_changed', (data) => {
    if (data && data.ticketId) {
      const room = data.ticketId.toString();
      io.to(room).emit('ticket_status_updated', data);
      io.emit('new_notification', {
        type: 'STATUS_UPDATE',
        ticketId: room,
        status: data.status,
        createdAt: new Date(),
      });
    }
  });
});

// --------------- START SERVER ---------------

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
