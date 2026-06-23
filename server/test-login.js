const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    // Find the teacher user
    const user = await User.findOne({ where: { email: 'teacher@example.com' } });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    });
    
    // Test password validation
    const isValid = await user.validatePassword('password123');
    console.log('Password validation result:', isValid);
    
    // Test direct bcrypt comparison
    const directCompare = await bcrypt.compare('password123', user.password);
    console.log('Direct bcrypt compare:', directCompare);
    
    console.log('Stored password hash:', user.password);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testLogin();