import { getStepThreeHeaders } from "./headers/step_three";
import { getStepOneHeaders } from "./headers/step_one";
import { getStepTwoHeaders, UserParams } from "./headers/step_two";
import { getDatesHeaders } from "./headers/getDatesHeaders";
import { createLogger, format, transport, transports, } from "winston";

const logger = createLogger({
	format: format.combine(format.timestamp(), format.simple()),
	transports: [new transports.Console({})]
},
);
const userData = {
	phone: "998546218739",
	firstName: "aali",
	lastName: "lallni",
	email: "mmms",
};
const service_ids = 227;



const fetchDates = async () => {

	const step1 = await fetch("https://pieraksts.mfa.gov.lv/ru/uzbekistan/index", getStepOneHeaders());

	logger.info("requesting 1 step");
	const cookies = step1.headers.get('set-cookie');

	const cookie_match = /(mfaSchedulerSession=[^;]*;).*(_csrf-mfa-scheduler=[^;]*;)/.exec(cookies || "") || [];
	const sessionCookie = cookie_match[1];
	const schedulerCookie = cookie_match[2];

	const code1 = /"_csrf-mfa-scheduler"\s*value="([^"]*)">/.exec(await step1.text()) || [];
	const htmlCode1 = encodeURIComponent(code1[1]);

	logger.info("requesting 2 step");
	const step2 = await fetch("https://pieraksts.mfa.gov.lv/ru/uzbekistan/index",
		getStepTwoHeaders(
			schedulerCookie, sessionCookie, htmlCode1, userData));

	const code2 = /"_csrf-mfa-scheduler"\s*value="([^"]*)">/.exec(await step2.text()) || [];
	const htmlCode2 = encodeURIComponent(code2[1]);

	logger.info("requesting 3 step");
	const step3 = await fetch("https://pieraksts.mfa.gov.lv/ru/uzbekistan/step2",
		getStepThreeHeaders(schedulerCookie, sessionCookie, htmlCode2, service_ids));

	const nextYearDate = new Date().setFullYear(new Date().getFullYear() + 1);
	logger.info("requesting dates");
	for (let i = new Date(); i.getTime() < nextYearDate; i = new Date(i.setMonth(i.getMonth() + 1))) {
		const year = i.getFullYear();
		const month = i.getMonth() + 1;

		const dates = await fetch(`https://pieraksts.mfa.gov.lv/ru/calendar/available-month-dates?year=${year}&month=${month}`, getDatesHeaders(schedulerCookie, sessionCookie));
		const res = await dates.json();
		// console.log(`request month:${month} year: ${year} succsess`, res);
		if (res != "Šobrīd visi pieejamie laiki ir aizņemti") {
			logger.info("Found: ", res);

			// clearInterval(interval);
		}
	}




};


let timeout;

const main = async () => {
	try {
		await fetchDates();
		timeout = setTimeout(main, 1000 * 60);
	} catch (e) {
		logger.error(e);
		timeout = setTimeout(main, 0);
	}
}

main();

