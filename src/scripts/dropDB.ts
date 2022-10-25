import { MongoClient } from 'mongodb';

const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT;

(async () => {
  const uri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}`;
  const client = new MongoClient(uri);
  const db = client.db('botSubscribers');
  const chatCollection = db.collection('chatId');
  const messageCollection = db.collection('messages');

  await chatCollection.drop();
  await messageCollection.drop();
  console.log('dropped');
  return;
})();
