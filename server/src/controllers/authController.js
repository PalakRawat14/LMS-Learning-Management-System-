const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendOTP, verifyOTP } = require('../services/otpService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Prevent users from self-registering as teacher or admin
    if (role && (role === 'teacher' || role === 'admin')) {
      return res.status(403).json({ 
        message: 'Cannot self-register as teacher or admin. Please contact an administrator for teacher access.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user with student role only
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Password will be hashed by model hook
      role: 'student' // Force student role for public registration
    });

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Logged in successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Remove password from response
    const userResponse = req.user.toJSON();
    delete userResponse.password;

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (password) updates.password = password;

    await req.user.update(updates);

    // Remove password from response
    const userResponse = req.user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Send OTP for registration
const sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Send OTP
    await sendOTP(email);

    res.json({
      message: 'OTP sent to your email',
      email
    });
  } catch (error) {
    console.error('Send registration OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// Register with OTP verification
const registerWithOTP = async (req, res) => {
  try {
    const { firstName, lastName, email, password, otp, courseField } = req.body;

    // Verify the OTP first
    const otpResult = await verifyOTP(email, otp);

    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Validate courseField
    if (!courseField) {
      return res.status(400).json({ message: 'Course field is required' });
    }

    // Create new user with student role only
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Password will be hashed by model hook
      role: 'student', // Force student role for public registration
      courseField // Add courseField to user
    });

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration with OTP error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Check user role (for determining if OTP is needed)
const checkRole = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user role
    res.json({
      role: user.role,
      email: user.email
    });
  } catch (error) {
    console.error('Check role error:', error);
    res.status(500).json({ message: 'Error checking user role' });
  }
};

// Send OTP to email
const sendOTPCode = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password first
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Send OTP
    await sendOTP(email);

    res.json({
      message: 'OTP sent to your email',
      email
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// Verify OTP and login
const verifyOTPCode = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Verify the OTP
    const otpResult = await verifyOTP(email, otp);

    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Get user details
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'OTP verified successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// Forgot Password - Request reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link will be sent' 
      });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Create password reset record
    const { PasswordReset } = require('../models');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiry

    await PasswordReset.create({
      userId: user.id,
      email: user.email,
      token: resetToken,
      expiresAt
    });

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send email
    const { sendPasswordResetEmail } = require('../services/emailService');
    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      resetLink
    });

    if (emailResult.success) {
      res.json({ 
        message: 'Password reset link sent to your email',
        success: true 
      });
    } else {
      console.error('Failed to send email:', emailResult.error);
      res.status(500).json({ 
        message: 'Error sending password reset email',
        success: false 
      });
    }
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { PasswordReset } = require('../models');
    const resetRecord = await PasswordReset.findOne({
      where: { token, isUsed: false }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (new Date() > new Date(resetRecord.expiresAt)) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    res.json({ 
      message: 'Token is valid',
      email: resetRecord.email,
      valid: true 
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Error verifying reset token' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const { PasswordReset } = require('../models');
    const resetRecord = await PasswordReset.findOne({
      where: { token, isUsed: false }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (new Date() > new Date(resetRecord.expiresAt)) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Find user and update password
    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark reset token as used
    resetRecord.isUsed = true;
    await resetRecord.save();

    res.json({ 
      message: 'Password reset successfully',
      success: true 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  checkRole,
  sendOTPCode,
  verifyOTPCode,
  sendRegistrationOTP,
  registerWithOTP,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
};