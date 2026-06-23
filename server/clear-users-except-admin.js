require('dotenv').config();
const sequelize = require('./src/config/database');
const { User } = require('./src/models');

async function clearUsersExceptAdmin() {
  try {
    console.log('\n🔍 Checking current users in database...\n');
    
    // Get all users
    const allUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    });
    
    console.log('Current users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });
    console.log(`\nTotal users: ${allUsers.length}\n`);
    
    // Find admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@lms.com' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user (admin@lms.com) not found!');
      console.log('Cannot proceed with deletion to avoid losing all access.');
      await sequelize.close();
      process.exit(1);
    }
    
    console.log(`✅ Admin user found: ${adminUser.email} (ID: ${adminUser.id})\n`);
    
    // Count users to be deleted
    const usersToDelete = await User.count({
      where: {
        email: { [sequelize.Sequelize.Op.ne]: 'admin@lms.com' }
      }
    });
    
    if (usersToDelete === 0) {
      console.log('ℹ️  No users to delete. Only admin exists in the database.');
      await sequelize.close();
      process.exit(0);
    }
    
    console.log(`⚠️  WARNING: About to delete ${usersToDelete} user(s) (keeping only admin)\n`);
    
    // Delete all users except admin
    const deletedCount = await User.destroy({
      where: {
        email: { [sequelize.Sequelize.Op.ne]: 'admin@lms.com' }
      }
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} user(s)\n`);
    
    // Verify remaining users
    const remainingUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    });
    
    console.log('Remaining users in database:');
    remainingUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });
    console.log(`\nTotal remaining users: ${remainingUsers.length}\n`);
    
    console.log('✅ Database cleanup completed successfully!');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the cleanup
clearUsersExceptAdmin();
