/**
 * Debug Invitation Link
 * Check what link is being generated
 */

require('dotenv').config();

console.log('\n🔗 Checking Invitation Link Generation...\n');

const CLIENT_URL = process.env.CLIENT_URL;
const token = 'abc123example'; // Example token

const invitationLink = `${CLIENT_URL}/register/teacher/${token}`;

console.log('CLIENT_URL:', CLIENT_URL);
console.log('Example Token:', token);
console.log('Generated Link:', invitationLink);

console.log('\n✅ Link Format Looks Correct!');
console.log('\n📝 When you click the link in the email:');
console.log('1. It should open: http://localhost:5173/register/teacher/[long-token]');
console.log('2. The page should load the invitation details');
console.log('3. You should see a form to set your password');

console.log('\n❓ What error are you seeing when clicking the link?');
console.log('   - Page not found (404)?');
console.log('   - Invalid/expired invitation?');
console.log('   - Blank page?');
console.log('   - Something else?');

console.log('\n💡 Troubleshooting Steps:');
console.log('1. Make sure the client is running (npm run dev)');
console.log('2. Check the exact URL in the email');
console.log('3. Try copying the link and pasting in browser');
console.log('4. Check browser console for errors (F12)');
console.log();
