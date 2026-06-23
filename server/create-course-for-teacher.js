const { User, Course } = require('./src/models');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createCourseForTeacher() {
  try {
    console.log('\n🎓 Course Creation Helper\n');
    
    // Get all teachers
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    if (teachers.length === 0) {
      console.log('❌ No teachers found in database!');
      console.log('💡 Create a teacher account first using: node create-test-teacher.js');
      process.exit(0);
    }

    console.log('📋 Available Teachers:\n');
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.firstName} ${teacher.lastName} (${teacher.email}) - ID: ${teacher.id}`);
    });

    const teacherChoice = await question('\nSelect teacher number: ');
    const selectedTeacher = teachers[parseInt(teacherChoice) - 1];

    if (!selectedTeacher) {
      console.log('❌ Invalid selection');
      process.exit(0);
    }

    console.log(`\n✅ Selected: ${selectedTeacher.firstName} ${selectedTeacher.lastName}\n`);

    const title = await question('Course Title: ');
    const code = await question('Course Code (e.g., CS101): ');
    const description = await question('Course Description: ');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // 6 months from now

    const course = await Course.create({
      title,
      code,
      description,
      teacherId: selectedTeacher.id,
      startDate,
      endDate,
      isPublished: true,
      enrollmentLimit: 50
    });

    console.log('\n✅ Course created successfully!');
    console.log(`   Course ID: ${course.id}`);
    console.log(`   Title: ${course.title}`);
    console.log(`   Code: ${course.code}`);
    console.log(`   Teacher: ${selectedTeacher.firstName} ${selectedTeacher.lastName}`);
    console.log(`   Teacher ID: ${selectedTeacher.id}`);
    console.log(`\n💡 You can now upload materials to this course as ${selectedTeacher.email}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createCourseForTeacher();
