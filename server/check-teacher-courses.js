require('dotenv').config();
const { User, Course, Enrollment } = require('./src/models');

async function checkTeacherCourses() {
  try {
    console.log('\n=== Checking Teacher Courses ===\n');

    // Find all teachers
    const teachers = await User.findAll({
      where: { role: 'teacher' }
    });

    console.log(`Found ${teachers.length} teacher(s):\n`);

    for (const teacher of teachers) {
      console.log(`Teacher: ${teacher.firstName} ${teacher.lastName} (ID: ${teacher.id})`);
      console.log(`Email: ${teacher.email}`);
      
      // Find courses taught by this teacher
      const courses = await Course.findAll({
        where: { teacherId: teacher.id }
      });

      if (courses.length === 0) {
        console.log('❌ No courses assigned to this teacher\n');
        console.log('To assign courses, update the Course table:');
        console.log(`UPDATE Courses SET teacherId = ${teacher.id} WHERE id = <course_id>;\n`);
      } else {
        console.log(`✅ Teaching ${courses.length} course(s):`);
        courses.forEach(course => {
          console.log(`   - ${course.title} (${course.code}) - ID: ${course.id}`);
        });
        console.log('');
      }
    }

    // Show all courses and their teachers
    console.log('\n=== All Courses ===\n');
    const allCourses = await Course.findAll({
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    allCourses.forEach(course => {
      console.log(`Course: ${course.title} (${course.code})`);
      if (course.teacher) {
        console.log(`  Teacher: ${course.teacher.firstName} ${course.teacher.lastName} (ID: ${course.teacher.id})`);
      } else {
        console.log(`  ❌ No teacher assigned (teacherId: ${course.teacherId})`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTeacherCourses();
