import { Collection, Db, WithId } from 'mongodb';
import { UserData } from '../requester/EmbassyRequester';

type ExtendedUserData = UserData &
  ({ isRegistered: true; date: string } | { isRegistered: false });

export class UserController {
  private _collection: Collection<ExtendedUserData>;

  constructor(db: Db) {
    this._collection = db.collection<ExtendedUserData>('UsedData');
  }

  async listAll() {
    return await this._collection.find().toArray();
  }
  async listRegistered() {
    return await this._collection.find({ isRegistered: true }).toArray();
  }
  async listNotRegistered() {
    return await this._collection.find({ isRegistered: false }).toArray();
  }
  async addUser(data: UserData) {
    await this._collection.insertOne({ ...data, isRegistered: false });
  }
  async removeUser(data: WithId<Partial<ExtendedUserData>>) {
    await this._collection.deleteOne({ _id: data._id });
  }
  async setRegistered(data: WithId<ExtendedUserData>, date: string) {
    await this._collection.updateOne(data, {
      $set: { isRegistered: true, date },
    });
  }
}
