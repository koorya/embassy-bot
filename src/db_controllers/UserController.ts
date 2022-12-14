import { Collection, Db, WithId } from 'mongodb';
import { UserData } from '../requester/EmbassyRequester';

export type ExtendedUserData = UserData &
  (
    | { isRegistered: true; date: string; proxy?: string }
    | { isRegistered: false }
  );

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
    const user: ExtendedUserData = { ...data, isRegistered: false };
    await this._collection.insertOne(user);
    return user;
  }
  async removeUser(data: WithId<Partial<ExtendedUserData>>) {
    await this._collection.deleteOne({ _id: data._id });
  }
  async setRegistered(data: WithId<ExtendedUserData>, date: string) {
    await this._collection.updateOne(data, {
      $set: { isRegistered: true, date },
    });
  }
  async setRegisteredByPhone(
    phone: UserData['phone'],
    date: string,
    proxy?: string
  ) {
    await this._collection.updateOne(
      { phone },
      {
        $set: { isRegistered: true, date, proxy },
      }
    );
  }
}
