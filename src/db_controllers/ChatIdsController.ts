import { Collection, Db } from 'mongodb';

export type ChatId = { chatId: number; username: string };

export class ChatIdController {
  private _chatCollection: Collection<ChatId>;

  constructor(db: Db) {
    this._chatCollection = db.collection<ChatId>('chatId');
  }
  async getChatUsers() {
    return await this._chatCollection.find().toArray();
  }
  async getChatIds() {
    return (await this.getChatUsers()).map(({ chatId }) => chatId);
  }
  async getChatUserById(id: number) {
    return (await this.getChatUsers()).find(({ chatId }) => chatId == id)
      ?.username;
  }

  async addId(id: number, username: string) {
    await this._chatCollection.insertOne({
      chatId: id,
      username: username,
    });
  }
}
