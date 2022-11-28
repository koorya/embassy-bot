import { getStepFiveParamsWorker } from './step_five';

it('', () => {
  const t = getStepFiveParamsWorker({
    invitationNumber: 'my_invite',
    orgName: 'my orgname',
  });
  const { options, url } = t({
    reCaptcha: 'recaptca',
    schedulerCookie: 'schCoo',
    sessionCookie: 'sessiCoo',
    step4Code: 'step4code',
  });
  expect(options.body).toBe(
    '_csrf-mfa-scheduler=step4code&Persons%5B0%5D%5Bservice_field_ids%5D%5B7%5D=my_invite&Persons%5B0%5D%5Bservice_field_ids%5D%5B23%5D=my%20orgname&notes_public=&reCaptcha=recaptca&personal-data='
  );
});
