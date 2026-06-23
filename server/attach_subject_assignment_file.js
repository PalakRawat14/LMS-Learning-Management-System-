#!/usr/bin/env node
require('dotenv').config();
const path = require('path');

async function main() {
  const { SubjectAssignment, sequelize } = require('./src/models');

  const assignmentId = process.argv[2];
  const filename = process.argv[3];
  const displayName = process.argv[4] || filename;

  if (!assignmentId || !filename) {
    console.error('Usage: node attach_subject_assignment_file.js <assignmentId> <filename> [displayName]');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const assignment = await SubjectAssignment.findByPk(assignmentId);
    if (!assignment) {
      console.error('SubjectAssignment not found:', assignmentId);
      process.exit(1);
    }

    const uploadsPath = path.join(__dirname, 'uploads', filename);

    const attachments = [
      {
        fileName: filename,
        originalName: displayName,
        filePath: uploadsPath,
        fileSize: null,
        mimeType: 'application/pdf'
      }
    ];

    await assignment.update({ attachments });
    console.log(`Attached ${filename} to SubjectAssignment ${assignmentId}`);
    process.exit(0);
  } catch (err) {
    console.error('Error attaching file:', err);
    process.exit(1);
  }
}

main();
