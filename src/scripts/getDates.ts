import { createLogger, transports } from 'winston';
import { userData } from '../const';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const data = userData();
  const requester = new EmbassyRequester(
    { ...data, serviceId: ServiceIds.SHENGEN_SW_EST },
    null,
    createLogger({ transports: [transports.Console] })
  );
  console.log(await requester.getDates());
})();
