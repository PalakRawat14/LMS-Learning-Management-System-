const bcrypt = require('bcryptjs');
const { User } = require('./src/models');
const sequelize = require('./src/config/database');

async function testAdminLogin() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Find admin user
    const admin = await User.findOne({ where: { email: 'admin@lms.com' } });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('\n✅ Admin user found:');
    console.log('ID:', admin.id);
    console.log('Name:', admin.firstName, admin.lastName);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Active:', admin.isActive);

    // Test password
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    
    console.log('\n🔐 Password Test:');
    console.log('Testing password:', testPassword);
    console.log('Password matches:', isMatch ? '✅ YES' : '❌ NO');

    if (!isMatch) {
      console.log('\n🔄 Resetting password to "admin123"...');
      // Use update method to trigger the beforeUpdate hook
      await admin.update({ password: testPassword });
      console.log('✅ Password reset successfully!');
      
      // Verify the reset worked
      const adminRefresh = await User.findOne({ where: { email: 'admin@lms.com' } });
      const verifyMatch = await bcrypt.compare(testPassword, adminRefresh.password);
      
      if (verifyMatch) {
        console.log('✅ Password verification: SUCCESS');
        console.log('\nYou can now login with:');
        console.log('📧 Email: admin@lms.com');
        console.log('🔑 Password: admin123');
      } else {
        console.log('❌ Password verification: FAILED');
        console.log('Something went wrong with the password hash.');
      }
    } else {
      console.log('\n✅ Password is correct. You should be able to login.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAdminLogin();
