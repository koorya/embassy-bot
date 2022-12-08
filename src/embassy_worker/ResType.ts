import { UserData } from '../requester/EmbassyRequester';

export type ResType = {
  userData: UserData;
} & (
  | {
      isRegistered: true;
      date: {
        date: string;
        time: string;
      };
      proxy?: string;
    }
  | { isRegistered: false }
);
