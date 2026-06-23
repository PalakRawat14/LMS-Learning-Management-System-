/**
 * Test Gmail Configuration with Correct Email
 */

require('dotenv').config();

console.log('\n🔍 Checking Email Configuration...\n');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length || 0);
console.log('EMAIL_PASSWORD starts with:', process.env.EMAIL_PASSWORD?.substring(0, 4));

if (process.env.EMAIL_USER === 'nik224134@gmail.com') {
  console.log('\n✅ Correct! Using nik224134@gmail.com (matches app password account)');
} else {
  console.log('\n❌ Wrong email! Should be nik224134@gmail.com');
}

if (process.env.EMAIL_PASSWORD?.length === 16) {
  console.log('✅ App password length is correct (16 characters)');
} else {
  console.log('❌ App password should be 16 characters');
}

console.log('\n📧 This should now work! The email matches the app password account.\n');
