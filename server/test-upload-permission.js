const { User, Course } = require('./src/models');

async function testUploadPermission() {
  console.log('\n🔍 Testing Material Upload Permissions\n');
  console.log('='.repeat(60));

  try {
    // Get all teachers
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    });

    console.log(`\n📚 Found ${teachers.length} teacher(s):\n`);

    for (const teacher of teachers) {
      console.log(`\n👨‍🏫 Teacher: ${teacher.firstName} ${teacher.lastName}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   User ID: ${teacher.id}`);

      // Get courses taught by this teacher
      const courses = await Course.findAll({
        where: { teacherId: teacher.id },
        attributes: ['id', 'title', 'code', 'teacherId']
      });

      if (courses.length > 0) {
        console.log(`   ✅ Teaches ${courses.length} course(s):`);
        courses.forEach(course => {
          console.log(`      - Course ID ${course.id}: "${course.title}" (${course.code})`);
          console.log(`        Teacher ID: ${course.teacherId} ${course.teacherId === teacher.id ? '✅ MATCH' : '❌ MISMATCH'}`);
          console.log(`        Can Upload: ${course.teacherId === teacher.id ? '✅ YES' : '❌ NO'}`);
        });
      } else {
        console.log(`   ❌ No courses assigned`);
      }
    }

    // Check all courses and their teachers
    console.log('\n' + '='.repeat(60));
    console.log('\n📖 All Courses:\n');
    
    const allCourses = await Course.findAll({
      attributes: ['id', 'title', 'code', 'teacherId']
    });

    for (const course of allCourses) {
      const teacher = await User.findByPk(course.teacherId, {
        attributes: ['id', 'firstName', 'lastName', 'email']
      });

      console.log(`\n📚 Course ID ${course.id}: "${course.title}" (${course.code})`);
      console.log(`   Teacher ID: ${course.teacherId}`);
      if (teacher) {
        console.log(`   Teacher: ${teacher.firstName} ${teacher.lastName} (${teacher.email})`);
      } else {
        console.log(`   ⚠️  Teacher not found`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test Complete!\n');

    console.log('📋 Upload Permission Summary:');
    console.log('   - Teachers can ONLY upload to courses where teacherId === userId');
    console.log('   - Check the Course ID in the URL when uploading');
    console.log('   - Make sure you\'re logged in with the correct teacher account\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testUploadPermission();
