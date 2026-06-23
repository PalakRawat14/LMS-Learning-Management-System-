const { User } = require('./src/models');

async function checkAdminUser() {
  console.log('\n🔍 Checking Admin User\n');
  console.log('='.repeat(60));

  try {
    const admin = await User.findOne({
      where: { email: 'admin@lms.com' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive']
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('\nSearching for all admin roles...\n');
      
      const admins = await User.findAll({
        where: { role: 'admin' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive']
      });

      if (admins.length > 0) {
        console.log(`✅ Found ${admins.length} user(s) with admin role:\n`);
        admins.forEach(a => {
          console.log(`   ID: ${a.id}`);
          console.log(`   Name: ${a.firstName} ${a.lastName}`);
          console.log(`   Email: ${a.email}`);
          console.log(`   Role: ${a.role}`);
          console.log(`   Active: ${a.isActive ? '✅ Yes' : '❌ No'}`);
          console.log('');
        });
      } else {
        console.log('❌ No users with admin role found in database!');
      }
    } else {
      console.log('✅ Admin user found:\n');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`\n   Role matches 'admin'?: ${admin.role === 'admin' ? '✅ YES' : '❌ NO (value is: "' + admin.role + '")'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 All Users:\n');

    const allUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      order: [['id', 'ASC']]
    });

    allUsers.forEach(user => {
      console.log(`   ID ${user.id}: ${user.email} - Role: "${user.role}"`);
    });

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkAdminUser();
