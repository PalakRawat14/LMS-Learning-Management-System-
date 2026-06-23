require('dotenv').config();
const sequelize = require('./src/config/database');
const { TeacherInvitation } = require('./src/models');

async function clearInvitations() {
  try {
    console.log('\n🔍 Checking teacher invitations...\n');
    
    const invitations = await TeacherInvitation.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'createdAt']
    });
    
    console.log('Current invitations:');
    invitations.forEach(inv => {
      console.log(`  - ${inv.email} (${inv.status}) - ${inv.firstName} ${inv.lastName}`);
    });
    console.log(`\nTotal invitations: ${invitations.length}\n`);
    
    if (invitations.length === 0) {
      console.log('✅ No invitations to clear.');
      await sequelize.close();
      process.exit(0);
    }
    
    // Delete all invitations
    const deletedCount = await TeacherInvitation.destroy({
      where: {},
      truncate: true
    });
    
    console.log(`✅ Successfully cleared ${deletedCount} invitation(s)\n`);
    console.log('You can now send fresh invitations!');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error clearing invitations:', error);
    await sequelize.close();
    process.exit(1);
  }
}

clearInvitations();
