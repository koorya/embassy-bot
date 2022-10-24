import { DBCreator } from '../db_controllers/db';
import { ProxyController } from '../db_controllers/ProxyController';
const main = async () => {
  const ac = new AbortController();

  const db = new DBCreator().create();

  const proxyController = new ProxyController(db);
  console.log(
    (await proxyController.getProxies()).map(({ history }) => [
      history.length,
      history.pop(),
    ])
  );
};
main();
