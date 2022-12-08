import { EventEmitter } from 'node:events';

export type Listener = Parameters<EventEmitter['on']>[1];
