import { ServiceIds, UserData } from './requester/EmbassyRequester';

export const userData = (): UserData => ({
  phone: '+998981628743',
  firstName: 'Quisque',
  lastName: 'Fermentum',
  email: 'vestibulum22@gmail.com',
  serviceIds: [ServiceIds.WORKER],
  notes: 'nubmer',
});
