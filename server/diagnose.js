#!/usr/bin/env node

/**
 * LMS Invitation Link Diagnostic Tool
 * Run this to check if everything is configured correctly
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('\n🔍 LMS Invitation System Diagnostics\n');
console.log('='.repeat(50));

async function checkPort(port) {
  try {
    const { stdout } = await execPromise(`lsof -iTCP:${port} -sTCP:LISTEN -P`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function runDiagnostics() {
  console.log('\n1️⃣ Checking Servers...\n');
  
  const backendRunning = await checkPort(5000);
  const frontendRunning = await checkPort(5173);
  
  console.log(`   Backend (Port 5000):  ${backendRunning ? '✅ Running' : '❌ Not Running'}`);
  console.log(`   Frontend (Port 5173): ${frontendRunning ? '✅ Running' : '❌ Not Running'}`);
  
  if (!backendRunning || !frontendRunning) {
    console.log('\n   ⚠️  Fix: Run `npm run dev` from the project root');
  }

  console.log('\n2️⃣ Checking Environment Variables...\n');
  
  require('dotenv').config();
  
  const config = {
    CLIENT_URL: process.env.CLIENT_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    PORT: process.env.PORT
  };
  
  console.log(`   CLIENT_URL: ${config.CLIENT_URL || '❌ Not Set'}`);
  console.log(`   EMAIL_USER: ${config.EMAIL_USER || '❌ Not Set'}`);
  console.log(`   PORT:       ${config.PORT || '❌ Not Set'}`);
  
  const clientUrlCorrect = config.CLIENT_URL === 'http://localhost:5173';
  console.log(`\n   Client URL: ${clientUrlCorrect ? '✅ Correct' : '⚠️  Should be http://localhost:5173'}`);

  console.log('\n3️⃣ Checking Database...\n');
  
  const fs = require('fs');
  const dbPath = './dev.sqlite';
  const dbExists = fs.existsSync(dbPath);
  
  console.log(`   Database File: ${dbExists ? '✅ Found' : '❌ Not Found'}`);
  
  if (dbExists) {
    const stats = fs.statSync(dbPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  }

  console.log('\n4️⃣ Testing Email Configuration...\n');
  
  if (config.EMAIL_USER === 'nik224134@gmail.com') {
    console.log('   ✅ Email configured correctly (nik224134@gmail.com)');
  } else {
    console.log(`   ⚠️  Email: ${config.EMAIL_USER}`);
    console.log('   Should be: nik224134@gmail.com (matches app password)');
  }

  console.log('\n5️⃣ Invitation Link Format...\n');
  
  const exampleToken = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234';
  const invitationLink = `${config.CLIENT_URL}/register/teacher/${exampleToken}`;
  
  console.log('   Example Link:');
  console.log(`   ${invitationLink}`);
  
  console.log('\n6️⃣ Route Configuration...\n');
  
  console.log('   Expected Routes:');
  console.log('   GET  /api/auth/register/teacher/:token  (fetch invitation)');
  console.log('   POST /api/auth/register/teacher/:token  (complete registration)');
  console.log('   Frontend: /register/teacher/:token');

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Diagnostic Complete!\n');

  console.log('📋 Summary:\n');
  
  const issues = [];
  if (!backendRunning) issues.push('Backend server not running');
  if (!frontendRunning) issues.push('Frontend server not running');
  if (!clientUrlCorrect) issues.push('CLIENT_URL incorrect in .env');
  if (config.EMAIL_USER !== 'nik224134@gmail.com') issues.push('EMAIL_USER should be nik224134@gmail.com');
  
  if (issues.length === 0) {
    console.log('   🎉 Everything looks good!');
    console.log('\n   Next steps:');
    console.log('   1. Login as admin (admin@lms.com / admin123)');
    console.log('   2. Send a teacher invitation');
    console.log('   3. Check your email');
    console.log('   4. Click the link in the email');
    console.log('\n   If the link still doesn\'t work:');
    console.log('   - Check browser console (F12) for errors');
    console.log('   - Try opening link in incognito window');
    console.log('   - Verify the exact URL in the email');
  } else {
    console.log('   ⚠️  Issues Found:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  console.log('\n📚 For detailed troubleshooting, see: LINK_TROUBLESHOOTING.md\n');
}

runDiagnostics().catch(console.error);
