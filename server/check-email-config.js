require('dotenv').config();

console.log('\n📧 Email Configuration Check:\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD);
console.log('\nExpected password length: 16 characters (without spaces)\n');

if (process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.length !== 16) {
  console.log('⚠️  WARNING: App password should be exactly 16 characters!');
  console.log('Current length:', process.env.EMAIL_PASSWORD.length);
}
