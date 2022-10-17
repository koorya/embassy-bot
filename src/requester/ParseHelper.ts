export class ParseHelper {
  parseCookie(header: string) {
    const cookie_match =
      /(mfaSchedulerSession=[^;]*;).*(_csrf-mfa-scheduler=[^;]*;)/.exec(
        header || ''
      ) || [];
    if (!cookie_match?.length) throw new Error('Cookie is not valid');
    return {
      sessionCookie: cookie_match[1],
      schedulerCookie: cookie_match[2],
    };
  }
  parseStepCode(text: string) {
    const code = /"_csrf-mfa-scheduler"\s*value="([^"]*)">/.exec(text) || [];
    const htmlCode = encodeURIComponent(code[1]);
    return htmlCode;
  }
}
