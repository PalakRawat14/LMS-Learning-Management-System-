const nodemailer = require('nodemailer').default || require('nodemailer');
const OTP = require('../models/OTP');

// Create transporter dynamically with validation
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTP = async (email) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Email not configured. OTP generation skipped for:', email);
      return { success: false, message: 'Email not configured' };
    }

    // Generate OTP
    const otpCode = generateOTP();
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // Delete any existing unused OTPs for this email
    await OTP.destroy({
      where: { email, isUsed: false }
    });
    
    // Save OTP to database
    await OTP.create({
      email,
      otp: otpCode,
      expiresAt,
      isUsed: false
    });
    
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login OTP - LMS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Login Verification Code</h2>
          <p>Your OTP for logging into the Learning Management System is:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #4F46E5; font-size: 36px; margin: 0; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          <p style="color: #6B7280;">This code will expire in <strong>5 minutes</strong>.</p>
          <p style="color: #6B7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #9CA3AF; font-size: 12px;">LMS - Learning Management System</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

// Verify OTP
const verifyOTP = async (email, otpCode) => {
  try {
    // Find the OTP
    const otpRecord = await OTP.findOne({
      where: {
        email,
        otp: otpCode,
        isUsed: false
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (!otpRecord) {
      return { success: false, message: 'Invalid OTP' };
    }
    
    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      return { success: false, message: 'OTP has expired' };
    }
    
    // Mark as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
