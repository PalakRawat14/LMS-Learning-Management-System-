require('dotenv').config();
const axios = require('axios');

async function testLogin() {
  console.log('\n🔍 Testing Login Endpoint...\n');
  
  const API_URL = process.env.CLIENT_URL?.includes('192.168.1.13') 
    ? 'http://192.168.1.13:5000' 
    : 'http://localhost:5000';
  
  console.log(`API URL: ${API_URL}/api/auth/login\n`);
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@lms.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('\nResponse:', {
      status: response.status,
      user: response.data.user,
      hasToken: !!response.data.token
    });
    
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('\nServer responded with error:');
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
    } else if (error.request) {
      console.error('\n❌ No response from server');
      console.error('Server might be down or unreachable');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

testLogin();
