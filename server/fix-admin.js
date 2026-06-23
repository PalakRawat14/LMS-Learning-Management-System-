/**
 * Check Admin User Status
 */

require('dotenv').config();
const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function checkAdminUser() {
  console.log('\n🔍 Checking Admin User...\n');

  try {
    // Find admin user
    const admin = await User.findOne({ where: { email: 'admin@lms.com' } });

    if (!admin) {
      console.log('❌ Admin user NOT found!');
      console.log('\n📝 Creating admin user...\n');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@lms.com',
        password: hashedPassword,
        role: 'admin'
      });

      console.log('✅ Admin user created successfully!');
      console.log('\nCredentials:');
      console.log('   Email: admin@lms.com');
      console.log('   Password: admin123');
      console.log('   Role:', newAdmin.role);
    } else {
      console.log('✅ Admin user found!');
      console.log('\nDetails:');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.firstName, admin.lastName);
      console.log('   Role:', admin.role);
      
      // Test password
      console.log('\n🔐 Testing password "admin123"...');
      const isPasswordValid = await bcrypt.compare('admin123', admin.password);
      
      if (isPasswordValid) {
        console.log('✅ Password is correct!');
      } else {
        console.log('❌ Password is WRONG! Resetting...');
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await admin.update({ password: hashedPassword });
        
        console.log('✅ Password reset to: admin123');
      }
    }

    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@lms.com');
    console.log('   Password: admin123');
    console.log('\n✅ You can now login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminUser();
