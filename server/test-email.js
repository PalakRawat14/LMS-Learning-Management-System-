const { testEmailConfig, sendTeacherInvitation } = require('./src/services/emailService');
require('dotenv').config();

async function testEmail() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email Configuration Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if email is configured
  console.log('🔍 Checking email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ Not set');
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('\n❌ Email not configured!');
    console.log('\n📋 To configure:');
    console.log('1. Open /server/.env');
    console.log('2. Set EMAIL_USER=your-email@gmail.com');
    console.log('3. Set EMAIL_PASSWORD=your-app-password');
    console.log('4. Restart this script\n');
    console.log('📖 See EMAIL_SETUP_GUIDE.md for detailed instructions');
    process.exit(1);
  }

  console.log('\n🧪 Testing SMTP connection...');
  const configResult = await testEmailConfig();
  
  if (!configResult.success) {
    console.log('\n❌ Email configuration test failed!');
    console.log('Error:', configResult.error || configResult.message);
    console.log('\n💡 Common issues:');
    console.log('- Using regular password instead of App Password');
    console.log('- 2-Factor Authentication not enabled');
    console.log('- Spaces in the App Password');
    console.log('- Incorrect email address');
    console.log('\n📖 See EMAIL_SETUP_GUIDE.md for help');
    process.exit(1);
  }

  console.log('✅ SMTP connection successful!\n');

  // Ask if user wants to send test email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 Send Test Invitation Email?');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('⚠️  Warning: This will send a real email!');
  console.log('Enter the recipient email address (or press Ctrl+C to cancel):');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Test email address: ', async (testEmail) => {
    if (!testEmail || !testEmail.includes('@')) {
      console.log('\n❌ Invalid email address');
      readline.close();
      process.exit(1);
    }

    console.log(`\n📤 Sending test invitation to: ${testEmail}...`);

    const emailResult = await sendTeacherInvitation({
      email: testEmail,
      firstName: 'Test',
      lastName: 'Teacher',
      invitationLink: 'http://localhost:5173/register/teacher/test-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (emailResult.success) {
      console.log('✅ Test email sent successfully!');
      console.log('\n📬 Next steps:');
      console.log('1. Check your inbox:', testEmail);
      console.log('2. Look in spam folder if not in inbox');
      console.log('3. Verify the email looks correct');
      console.log('4. Try clicking the registration link');
    } else {
      console.log('❌ Failed to send test email');
      console.log('Error:', emailResult.error);
      console.log('\n📖 See EMAIL_SETUP_GUIDE.md for troubleshooting');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    readline.close();
    process.exit(0);
  });
}

testEmail().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
