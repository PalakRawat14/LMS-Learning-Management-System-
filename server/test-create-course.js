const axios = require('axios');

async function testCreateCourse() {
  try {
    console.log('Testing course creation...\n');
    
    // Step 1: Login as teacher
    console.log('1. Logging in as teacher...');
    const loginResponse = await axios.post('http://127.0.0.1:5001/api/auth/login', {
      email: 'teacher@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful. Token:', token.substring(0, 20) + '...\n');
    
    // Step 2: Create a course
    console.log('2. Creating a course...');
    const courseData = {
      title: 'Test Course ' + Date.now(),
      code: 'TEST' + Date.now(),
      description: 'This is a test course created via API',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
      enrollmentLimit: 30
    };
    
    console.log('Course data:', JSON.stringify(courseData, null, 2));
    
    const createResponse = await axios.post('http://127.0.0.1:5001/api/courses', courseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Course created successfully!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
  process.exit(0);
}

testCreateCourse();
