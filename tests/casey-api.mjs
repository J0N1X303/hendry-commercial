import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/casey/api.js';
import {onRequest} from '../functions/_middleware.js';
let calls=0;
const base={angle:'Menus may need to change around seasonal planning and approval dates.',opening:'I help venues plan print around their menu changes.',subject:'Planning menu updates',question:'How do you arrange menu changes?',listen_for:'Listen for planned review dates and how approval is arranged.',pushback_buyer:'We already use a print supplier.',pushback_reply:'Understood. It helps to understand the existing process first.',tip:'Ask about their next planned update before offering a quote.'};
const AI={async run(){calls++;return {response:JSON.stringify(base)}}};
function req(channel='call',extra={}){return new Request('https://example.com/casey/api',{method:'POST',headers:{'content-type':'application/json',origin:'https://example.com','cf-connecting-ip':'192.0.2.'+(calls+1),...extra},body:JSON.stringify({channel,goal:'explore',seller:'We help venues arrange printed menus.',context:'Rachel at Fictional Inns about seasonal menu updates.'})})}
for(const channel of ['call','intro','followup']){
 const before=calls;const r=await onRequestPost({request:req(channel),env:{AI}});assert.equal(r.status,200);assert.equal(calls,before+1);const data=await r.json();assert.equal(data.status,'ready');
 if(channel==='call')assert.equal(data.card.opening.includes('?'),false);
 else {assert.match(data.card.opening,/Hi Rachel,/);assert.equal(data.card.opening.split('?').length-1,1);assert.match(data.card.opening,/Subject:/);}
}
const streamed=await onRequestPost({request:req('call',{accept:'application/x-ndjson'}),env:{AI}});const events=(await streamed.text()).trim().split('\n').map(JSON.parse);assert.equal(events[0].event,'accepted');assert.equal(events.at(-1).data.status,'ready');
assert.equal((await onRequestPost({request:req('call',{origin:'https://other.example'}),env:{AI}})).status,403);
assert.equal((await onRequestPost({request:req('call'),env:{}})).status,503);
const large=new Request('https://example.com/casey/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({seller:'a'.repeat(3000)})});assert.equal((await onRequestPost({request:large,env:{AI}})).status,413);
assert.equal((await onRequestPost({request:req('call'),env:{AI:{run(){throw Error('offline')}}}})).status,503);
for(const path of ['/casey-beta/','/functions/casey/api.js','/lib/casey-prep.js','/cara/'])assert.equal(onRequest({request:new Request('https://example.com'+path),next(){throw Error('static leak')}}).status,404);
assert.equal(onRequest({request:new Request('https://example.com/casey/'),next(){return 'public'}}),'public');
console.log('PASS: stateless call/intro/follow-up, named email, one question, one inference, streaming, origin and size limits, missing AI/service failure, retired/source routes.');
