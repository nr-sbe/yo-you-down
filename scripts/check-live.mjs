import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {validatePublicConfig} from '../runtime-config.js';
const file = process.argv[2] || 'dist/config.js';
const {config} = await import(pathToFileURL(resolve(file)).href);
const settings = validatePublicConfig(config,{requireLive:true});
const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/yyd_health`, {
  method:'POST', headers:{apikey:settings.supabasePublishableKey,'Content-Type':'application/json'},
  body:'{}', signal:AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error('Live database is not ready. Run supabase/schema.sql in your personal Supabase project, then retry.');
const health = await response.json();
if (health.version !== 1 || health.status !== 'ready') throw new Error('Unexpected database schema version.');
console.log('Live sharing configuration and database schema are ready.');
