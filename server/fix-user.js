const mongoose = require('mongoose');
require('dotenv').config();

async function debugLogin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('./models/User');

  // Find user with password
  const user = await User.findOne({ username: 'varun' }).select('+password');
  if (!user) {
    console.log('ERROR: User "varun" NOT found in database!');
    await mongoose.disconnect();
    return;
  }

  console.log('User found:', user.username);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Password hash:', user.password);
  console.log('Hash starts with $2:', user.password?.startsWith('$2'));

  // Test password comparison
  const bcrypt = require('bcryptjs');

  const testPassword = '12345678';
  console.log('\nTesting password "' + testPassword + '"...');
  const isMatch = await bcrypt.compare(testPassword, user.password);
  console.log('bcrypt.compare result:', isMatch);

  // Also test with the comparePassword method
  const isMatch2 = await user.comparePassword(testPassword);
  console.log('user.comparePassword result:', isMatch2);

  await mongoose.disconnect();
}

debugLogin().catch(err => { console.error('Error:', err.message); process.exit(1); });
