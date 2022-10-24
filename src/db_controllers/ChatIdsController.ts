import { Collection, Db } from 'mongodb';

export type ChatId = { chatId: number; username: string };

export class ChatIdController {
  private _chatCollection: Collection<ChatId>;

  constructor(db: Db) {
    this._chatCollection = db.collection<ChatId>('chatId');
  }
  async getChatIds() {
    return (await this._chatCollection.find().toArray()).map(
      ({ chatId }) => chatId
    );
  }
  async addId(id: number, username: string) {
    await this._chatCollection.insertOne({
      chatId: id,
      username: username,
    });
  }
}
