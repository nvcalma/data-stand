import {test} from 'node:test';
import assert from 'node:assert/strict';
import {streamlitURL, validCard, filterCards, imageURL} from '../public/model.js';
test('only public HTTPS Streamlit dashboard links are accepted',()=>{
 assert.equal(streamlitURL('https://my-analysis.streamlit.app'), 'https://my-analysis.streamlit.app/');
 for(const url of ['javascript:alert(1)','http://my.streamlit.app','https://streamlit.app.evil.com','https://evil.com/?x=.streamlit.app','https://x:y@my.streamlit.app','https://my.streamlit.app:8080'])assert.throws(()=>streamlitURL(url));
});
test('card validation preserves dataset publication label and rejects invalid record counts',()=>{
 const card={title:' Test ',records:'395',url:'https://my.streamlit.app',dataset_published:'2008',description:' Findings '};
 assert.deepEqual(validCard(card),{title:'Test',records:395,url:'https://my.streamlit.app/',dataset_published:'2008',description:'Findings'});
 for(const records of ['-1','3.2','NaN','','2147483648'])assert.throws(()=>validCard({...card,records}));
 assert.throws(()=>validCard({...card,title:' '}));
});
test('sorting uses date added independently of original dataset date',()=>{
 const rows=[{title:'Z',records:395,description:'Health',created_at:'2026-11-01',dataset_published:'2008'},{title:'A',records:10,description:'Sales',created_at:'2026-10-01',dataset_published:'2025'}];
 assert.equal(filterCards(rows,'','newest')[0].title,'Z');
 assert.equal(filterCards(rows,'','oldest')[0].title,'A');
 assert.equal(filterCards(rows,'','title')[0].title,'A');
 assert.equal(filterCards(rows,' health ','records').length,1);
 assert.equal(rows[0].title,'Z');
});
test('image links reject scripts and other unsafe schemes',()=>{
 assert.equal(imageURL('javascript:alert(1)'),'');assert.equal(imageURL('https://example.com/img.png'),'https://example.com/img.png');
});
