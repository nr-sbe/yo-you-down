import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublicConfig} from '../runtime-config.js';
test('local preview can be unconfigured, but publishing cannot',()=>{
  assert.equal(validatePublicConfig({}).configured,false);
  assert.throws(()=>validatePublicConfig({},{requireLive:true}),/Live sharing needs/);
});
test('publishing accepts only complete public HTTPS configuration',()=>{
  const safe={supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'};
  assert.equal(validatePublicConfig(safe,{requireLive:true}).configured,true);
  for(const url of ['http://example.supabase.co','https://user:pass@example.supabase.co','https://example.supabase.co/rest/v1','https://example.supabase.co/?token=x'])assert.throws(()=>validatePublicConfig({...safe,supabaseUrl:url}));
  for(const key of ['sb_secret_test','service_role','eyJhbGciOiJIUzI1NiJ9'])assert.throws(()=>validatePublicConfig({...safe,supabasePublishableKey:key}),/publishable key/);
});
