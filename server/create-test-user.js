const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function createTestUser() {
  try {
    // Delete existing users first
    await User.destroy({ where: { email: ['teacher@example.com', 'student@example.com'] } });
    
    // Create test teacher (password will be auto-hashed by model hook)
    const teacher = await User.create({
      email: 'teacher@example.com',
      password: 'password123',  // This will be hashed by the model hook
      firstName: 'Test',
      lastName: 'Teacher',
      role: 'teacher'
    });
    
    // Create test student  
    const student = await User.create({
      email: 'student@example.com',
      password: 'password123',  // This will be hashed by the model hook
      firstName: 'Test',
      lastName: 'Student',
      role: 'student'
    });
    
    console.log('Test users created successfully!');
    console.log('Teacher - Email: teacher@example.com, Password: password123');
    console.log('Student - Email: student@example.com, Password: password123');
    
    // Test the password immediately
    const testLogin = await teacher.validatePassword('password123');
    console.log('Password validation test:', testLogin ? '✅ PASS' : '❌ FAIL');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();