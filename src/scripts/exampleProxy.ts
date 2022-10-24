import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const agent = new HttpsProxyAgent(process.env.DEFAULT_PROXY || '');
fetch('https://ifconfig.me/ip?json=1', { agent: agent })
  .then((r) => r.json())
  .then((r) => console.log(r));
