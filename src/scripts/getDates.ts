import { createLogger, transports } from 'winston';
import { userData } from '../const';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const data = userData();
  data.serviceIds = [ServiceIds.SHENGEN_SW_EST];
  const requester = new EmbassyRequester(
    data,
    null,
    createLogger({ transports: [transports.Console] })
  );
  console.log(await requester.getDates());
})();
