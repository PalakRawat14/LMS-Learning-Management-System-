require('dotenv').config();
const { testEmailConfig } = require('./src/services/emailService');

async function quickTest() {
  console.log('\n📧 Testing Email Configuration...\n');
  
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Password:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not Set');
  console.log('');
  
  try {
    await testEmailConfig();
    console.log('\n✅ Email configuration is working!\n');
    console.log('You can now send teacher invitations from the Admin Dashboard.');
    console.log('Go to: http://localhost:5173/login\n');
  } catch (error) {
    console.error('\n❌ Email test failed:', error.message);
    console.log('\nPlease check your Gmail App Password.\n');
  }
}

quickTest();
