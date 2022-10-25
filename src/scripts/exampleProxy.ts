import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const proxy = process.env.DEFAULT_PROXY || '';
console.log('proxy:', proxy);

const agent = new HttpsProxyAgent(proxy);
fetch('https://ifconfig.me/ip?json=1', { agent: agent })
  .then((r) => r.text())
  .then((r) => console.log(r));
