
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter a temporary test password: ', async (password) => {
  rl.close();

  try {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    await mongoose.connect(process.env.MONGO_URL);

    const orgId = new mongoose.Types.ObjectId(process.env.ORG_ID);
    const hash = await bcrypt.hash(password, 12);
    const collection = mongoose.connection.collection('users');

    for (const role of ['viewer', 'editor']) {
      const username = `s1_test_${role}`;

      await collection.updateOne(
        { username, org: orgId },
        {
          $set: {
            password: hash,
            role
          },
          $setOnInsert: {
            _id: new mongoose.Types.ObjectId(),
            username,
            org: orgId
          }
        },
        { upsert: true }
      );

      console.log(`Ready: ${username} (${role})`);
    }

    console.log('Both test accounts are ready.');
  } catch (error) {
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
  }
});

