require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateOne(
    { username: 'varun' },
    { $set: { role: 'admin' } }
  );
  console.log('Updated:', result.modifiedCount, 'user(s)');
  const user = await mongoose.connection.db.collection('users').findOne({ username: 'varun' });
  console.log('Varun role is now:', user?.role);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
