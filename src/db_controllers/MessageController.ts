import { Collection, Db } from 'mongodb';
import winston from 'winston';
import { scrapLog } from '../loggers/logger';

export type MessType = { message: string; recipients: number[] };

export class MessageController {
  private _messageCollection: Collection<MessType>;
  private _logger: winston.Logger;
  constructor(db: Db) {
    this._messageCollection = db.collection<MessType>('messages');
    this._logger = scrapLog.child({ service: 'MessageController' });
  }
  async setAsSended(mess: MessType, id: number) {
    await this._messageCollection.updateOne(mess, {
      $push: { recipients: id },
    });
  }
  async getMessagesToSend(recip_cnt: number) {
    const messages = (
      await this._messageCollection
        .find({
          $expr: {
            $lt: [
              {
                $size: '$recipients',
              },
              recip_cnt,
            ],
          },
        })
        .toArray()
    ).map((mess) => mess);
    return messages;
  }

  async addMessage(text: string) {
    this._messageCollection
      .insertOne({
        recipients: [],
        message: text,
      })
      .then((r) => {
        this._logger.info(`message added ${text}`);
      });
  }
}
