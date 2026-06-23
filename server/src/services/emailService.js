const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });
};

// Send teacher invitation email
const sendTeacherInvitation = async ({ email, firstName, lastName, invitationLink, expiresAt }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 Email not configured. Invitation link:', invitationLink);
    return { success: false, message: 'Email not configured' };
  }

  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: {
      name: 'LMS Admin',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Teacher Invitation - Complete Your Registration',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background: #5568d3;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎓 Welcome to Our LMS!</h1>
          <p>Teacher Invitation</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName} ${lastName},</h2>
          
          <p>You've been invited to join our Learning Management System as a <strong>Teacher</strong>!</p>
          
          <p>We're excited to have you on board. To complete your registration and set up your teacher account, please click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${invitationLink}" class="button">Complete Registration</a>
          </div>
          
          <div class="info-box">
            <strong>📧 Your Email:</strong> ${email}<br>
            <strong>👤 Role:</strong> Teacher<br>
            <strong>⏰ Expires:</strong> ${expirationDate}
          </div>
          
          <h3>What's Next?</h3>
          <ol>
            <li>Click the "Complete Registration" button above</li>
            <li>Verify your information</li>
            <li>Create a secure password</li>
            <li>Start accessing your teacher dashboard!</li>
          </ol>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 5px 0;">
              <li>This invitation link expires on <strong>${expirationDate}</strong></li>
              <li>The link can only be used once</li>
              <li>If you didn't expect this invitation, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you have any questions or need assistance, please contact the administrator.</p>
          
          <p>Best regards,<br>
          <strong>LMS Admin Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>If the button doesn't work, copy and paste this link into your browser:<br>
          <small>${invitationLink}</small></p>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${firstName} ${lastName},

You've been invited to join our Learning Management System as a Teacher!

To complete your registration, please visit:
${invitationLink}

Your Details:
- Email: ${email}
- Role: Teacher
- Invitation Expires: ${expirationDate}

What's Next?
1. Click the registration link above
2. Verify your information
3. Create a secure password
4. Start accessing your teacher dashboard!

Important:
- This invitation link expires on ${expirationDate}
- The link can only be used once
- If you didn't expect this invitation, please ignore this email

Best regards,
LMS Admin Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send password reset email (for future use)
const sendPasswordResetEmail = async ({ email, resetLink }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 Email not configured. Reset link:', resetLink);
    return { success: false, message: 'Email not configured' };
  }

  const mailOptions = {
    from: {
      name: 'LMS Admin',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'LMS Password Reset',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #667eea;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested to reset your password for your LMS account. Click the button below to proceed:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>⏰ This link expires in 1 hour.</strong>
            </div>
            
            <p><strong>Didn't request this?</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
            
            <p>Best regards,<br><strong>LMS Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Password Reset Request

You requested to reset your password. Visit this link to proceed:
${resetLink}

This link will expire in 1 hour.
If you didn't request this, please ignore this email.

Best regards,
LMS Team`
  };

  try {
    console.log('📧 Sending password reset email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent. MessageID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  const transporter = createTransporter();
  
  if (!transporter) {
    return { success: false, message: 'Email credentials not configured' };
  }

  try {
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return { success: true };
  } catch (error) {
    console.error('❌ Email server error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTeacherInvitation,
  sendPasswordResetEmail,
  testEmailConfig
};
