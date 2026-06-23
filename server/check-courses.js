const { User, Course } = require('./src/models');

async function checkUserCourses() {
  try {
    console.log('\n🔍 Checking all users and their courses...\n');
    
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    });

    for (const user of users) {
      console.log(`\n👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      
      if (user.role === 'teacher' || user.role === 'admin') {
        const courses = await Course.findAll({
          where: { teacherId: user.id },
          attributes: ['id', 'title', 'code', 'teacherId']
        });
        
        if (courses.length > 0) {
          console.log(`   📚 Teaching ${courses.length} course(s):`);
          courses.forEach(course => {
            console.log(`      - Course ID: ${course.id}, Title: "${course.title}", Code: ${course.code}`);
          });
        } else {
          console.log(`   📚 Not teaching any courses yet`);
        }
      }
    }

    console.log('\n\n📋 All Courses in Database:\n');
    const allCourses = await Course.findAll({
      attributes: ['id', 'title', 'code', 'teacherId'],
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (allCourses.length === 0) {
      console.log('   ⚠️  No courses found in database!');
      console.log('   💡 You need to create a course first.');
    } else {
      allCourses.forEach(course => {
        const teacherName = course.teacher 
          ? `${course.teacher.firstName} ${course.teacher.lastName} (${course.teacher.email})`
          : 'No teacher assigned';
        console.log(`   📖 Course ID: ${course.id}`);
        console.log(`      Title: "${course.title}"`);
        console.log(`      Code: ${course.code}`);
        console.log(`      Teacher ID: ${course.teacherId}`);
        console.log(`      Teacher: ${teacherName}`);
        console.log('');
      });
    }

    console.log('\n💡 To upload materials:');
    console.log('   1. You must be logged in as a teacher or admin');
    console.log('   2. You must be the teacher of the course (course.teacherId === your user.id)');
    console.log('   3. Use the course ID from the list above\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserCourses();
