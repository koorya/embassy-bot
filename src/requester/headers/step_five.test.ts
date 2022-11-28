import { getStepFiveParamsWorker } from './step_five';

describe('request correct', () => {
  const invitationNumber = 'my_invite';
  const orgName = 'my orgname';
  const reCaptcha = 'recaptca';
  const step4Code = 'step4code';
  const schedulerCookie = 'schCoo';
  const sessionCookie = 'sessiCoo';

  const t = getStepFiveParamsWorker({
    invitationNumber,
    orgName,
  });
  const { options, url } = t({
    reCaptcha,
    schedulerCookie,
    sessionCookie,
    step4Code,
  });
  it('body should be valid', () => {
    expect(decodeURIComponent(options.body)).toBe(
      `_csrf-mfa-scheduler=${step4Code}&Persons[0][service_field_ids][7]=${invitationNumber}&Persons[0][service_field_ids][23]=${orgName}&notes_public=&reCaptcha=${reCaptcha}&personal-data=`
    );
  });
  it('header should be valid', () => {
    expect(options.headers.cookie).toBe(`${schedulerCookie} ${sessionCookie}`);
  });
});
