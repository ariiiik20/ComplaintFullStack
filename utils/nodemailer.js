const nodemailer = require('nodemailer');

/**
 * Create Nodemailer Transporter using environment variables.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  });
};

/**
 * Send complaint submission confirmation email to user.
 */
const sendSubmissionConfirmation = async (user, complaint) => {
  try {
    if (!user || !user.email) return;

    // Log mock email if email settings are default/placeholder
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
      console.log(`✉️ [Mock Email] Submission confirmation sent to: ${user.email} (Complaint ID: ${complaint._id})`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Complaint Desk" <${process.env.EMAIL_FROM || 'noreply@complaintsystem.com'}>`,
      to: user.email,
      subject: `Complaint Submitted: ${complaint.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6C63FF;">Complaint Received</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your complaint "<strong>${complaint.title}</strong>" has been registered successfully.</p>
          <ul>
            <li><strong>Category:</strong> ${complaint.category}</li>
            <li><strong>Priority:</strong> ${complaint.priority}</li>
            <li><strong>Status:</strong> ${complaint.status}</li>
          </ul>
          <p>Our team will investigate and keep you updated.</p>
        </div>
      `,
    });
    console.log(`✉️ Email sent to ${user.email}`);
  } catch (error) {
    console.error('⚠️ Nodemailer error (submission confirmation):', error.message);
  }
};

/**
 * Send complaint assignment alert email to assigned agent.
 */
const sendAssignmentAlert = async (agent, complaint) => {
  try {
    if (!agent || !agent.email) return;

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
      console.log(`✉️ [Mock Email] Assignment alert sent to Agent: ${agent.email} (Complaint ID: ${complaint._id})`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Complaint Desk" <${process.env.EMAIL_FROM || 'noreply@complaintsystem.com'}>`,
      to: agent.email,
      subject: `New Ticket Assigned: ${complaint.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #00D9A6;">New Ticket Assigned</h2>
          <p>Dear Agent <strong>${agent.name}</strong>,</p>
          <p>You have been assigned to handle complaint "<strong>${complaint.title}</strong>".</p>
          <ul>
            <li><strong>Category:</strong> ${complaint.category}</li>
            <li><strong>Priority:</strong> ${complaint.priority}</li>
            <li><strong>Status:</strong> ${complaint.status}</li>
          </ul>
          <p>Please log in to review the details and update the status.</p>
        </div>
      `,
    });
    console.log(`✉️ Email sent to Agent ${agent.email}`);
  } catch (error) {
    console.error('⚠️ Nodemailer error (assignment alert):', error.message);
  }
};

/**
 * Send status update alert email to complaint creator.
 */
const sendStatusUpdateAlert = async (user, complaint, oldStatus, newStatus) => {
  try {
    if (!user || !user.email) return;

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
      console.log(`✉️ [Mock Email] Status update sent to ${user.email}: ${oldStatus} -> ${newStatus} (Complaint ID: ${complaint._id})`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Complaint Desk" <${process.env.EMAIL_FROM || 'noreply@complaintsystem.com'}>`,
      to: user.email,
      subject: `Complaint Status Updated: ${complaint.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6C63FF;">Complaint Status Updated</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>The status of your complaint "<strong>${complaint.title}</strong>" has been updated from <span style="color: #FFB020;">${oldStatus}</span> to <strong style="color: #00D9A6;">${newStatus}</strong>.</p>
          <p>Thank you for your patience.</p>
        </div>
      `,
    });
    console.log(`✉️ Email sent to ${user.email}`);
  } catch (error) {
    console.error('⚠️ Nodemailer error (status update):', error.message);
  }
};

/**
 * Send password reset email with tokenized link to user.
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  try {
    if (!user || !user.email) return;

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
      console.log(`✉️ [Mock Email] Password reset link sent to ${user.email}: ${resetUrl}`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Complaint Desk" <${process.env.EMAIL_FROM || 'noreply@complaintsystem.com'}>`,
      to: user.email,
      subject: `Password Reset Request - ComplaintDesk`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6C63FF;">Password Reset Request</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>You requested a password reset. Please click the link below to set a new password:</p>
          <p><a href="${resetUrl}" style="background-color: #6C63FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p>This link is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`✉️ Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error('⚠️ Nodemailer error (password reset):', error.message);
  }
};

module.exports = {
  sendSubmissionConfirmation,
  sendAssignmentAlert,
  sendStatusUpdateAlert,
  sendPasswordResetEmail,
};
