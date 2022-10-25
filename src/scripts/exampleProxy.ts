import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const proxy = 'http://'+(process.env.DEFAULT_PROXY || '');
console.log('proxy:', proxy)

const agent = new HttpsProxyAgent(proxy);
fetch('https://ifconfig.me/ip',{headers:{pragma: 'no-cache',}, agent})
  .then((r) => r.text())
  .then((r) => console.log(r));
