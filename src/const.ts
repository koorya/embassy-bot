import { ServiceIds, UserData } from './requester/EmbassyRequester';

export const userData = (): UserData => ({
  phone: '+998546218739',
  firstName: 'Aali',
  lastName: 'Lallni',
  email: 'hallos99s@gmail.com',
  serviceIds: [ServiceIds.WORKER],
});
