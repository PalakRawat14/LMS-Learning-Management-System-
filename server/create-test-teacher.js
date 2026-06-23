const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createTestTeacher() {
  try {
    // Check if test teacher already exists
    const existing = await User.findOne({ where: { email: 'teacher@test.com' } });
    
    if (existing) {
      console.log('✅ Test teacher already exists:');
      console.log('   Email: teacher@test.com');
      console.log('   Password: teacher123');
      console.log('   Role: teacher');
      return;
    }

    // Create new teacher
    const teacher = await User.create({
      firstName: 'Test',
      lastName: 'Teacher',
      email: 'teacher@test.com',
      password: 'teacher123', // Will be hashed by the model hook
      role: 'teacher',
      isActive: true
    });

    console.log('✅ Test teacher created successfully!');
    console.log('   Email: teacher@test.com');
    console.log('   Password: teacher123');
    console.log('   Role: teacher');
    console.log('\n📝 You can now login with these credentials to upload materials.');
    
  } catch (error) {
    console.error('❌ Error creating test teacher:', error);
  } finally {
    process.exit(0);
  }
}

createTestTeacher();
