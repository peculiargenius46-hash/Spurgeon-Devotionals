import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path'; import os from 'node:os'; import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILE='file://'+path.join(ROOT,'dist/test/index.html');
const SHOT=path.join(ROOT,'dist/shots'); fs.mkdirSync(SHOT,{recursive:true});
const results=[]; const ok=(n,c,x='')=>{results.push([c?'PASS':'FAIL',n,x]);console.log(c?'PASS':'FAIL',n,c?'':'  -> '+x)};
const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell'});
const ctx=browser.defaultBrowserContext();
const page=await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())}); page.on('pageerror',e=>errs.push('pageerror: '+e.message));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const S=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__app.S())));
const shot=async n=>page.screenshot({path:`${SHOT}/${n}.png`});
const noOverflow=async n=>{const o=await page.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);ok('no horizontal scroll: '+n,o[0]<=o[1],o.join('/'))};

await page.goto(FILE); await page.waitForSelector('.reading');
ok('loads without script errors',errs.length===0,errs.join(' | '));
const counts=await page.evaluate(()=>({days:Object.keys(window.__app.BY).length,paras:document.querySelectorAll('#body p').length,verses:document.querySelectorAll('.verse').length,font:document.fonts.check('16px Literata')}));
ok('366 days loaded',counts.days===366); ok('reader shows paragraphs and verse',counts.paras>=1&&counts.verses>=1,JSON.stringify(counts));
const td=await page.evaluate(()=>{const t=new Date();return {d:t.getDate(),dn:+document.querySelector('.dnum').textContent,hr:t.getHours()}});
ok('opens on today\'s date',td.d===td.dn,JSON.stringify(td));
await noOverflow('reader'); await shot('01-reader');
const T=await page.evaluate(()=>{for(const k in window.__app.BY)for(const p of ['m','e'])if(window.__app.BY[k][p].p.length>=3)return {k,p,id:k+'-'+p}});
console.log('multi-paragraph test reading:',JSON.stringify(T));

// period + stepping
await page.evaluate(()=>{const c=window.__app.cur();window.__c0=c.p});
await page.click('.period button[aria-pressed="false"]'); await sleep(50);
ok('period switch flips reading',(await page.evaluate(()=>window.__app.cur().p))!==(await page.evaluate(()=>window.__c0)));
await page.evaluate(()=>{window.__app.ACT.open({dataset:{k:'01-01',p:'m'}})}); await sleep(50);
await page.click('[data-act="step"][data-d="-1"]'); await sleep(50);
ok('previous from 1 Jan morning wraps to 31 Dec evening',JSON.stringify(await page.evaluate(()=>window.__app.cur()))==='{"k":"12-31","p":"e"}');
await page.click('[data-act="step"][data-d="1"]'); await sleep(50);
ok('next wraps back to 1 Jan morning',JSON.stringify(await page.evaluate(()=>window.__app.cur()))==='{"k":"01-01","p":"m"}');
ok('1 Jan morning key verse is Joshua 5:12',(await page.$eval('.verse cite',e=>e.textContent))==='Joshua 5:12');
// multi-verse + repaired entries
for(const [k,p,n] of [['07-12','m',3],['08-30','e',2],['06-02','e',1],['11-03','e',1]]){
  await page.evaluate((k,p)=>window.__app.ACT.open({dataset:{k,p}}),k,p); await sleep(30);
  const r=await page.evaluate(()=>({v:document.querySelectorAll('.verse').length,first:document.querySelector('#body p').textContent.slice(0,40),cite:[...document.querySelectorAll('.verse cite')].map(c=>c.textContent)}));
  ok(`${k} ${p}: ${n} verse block(s), none leaked into body`,r.v===n&&!/^["“]/.test(r.first)&&!r.cite.some(c=>/Go to/.test(c)),JSON.stringify(r));
}

// bookmark
await page.evaluate((k,p)=>window.__app.ACT.open({dataset:{k,p}}),T.k,T.p); await sleep(30);
await page.click('[data-act="mark"]'); await sleep(30);
ok('bookmark saved',Object.keys((await S()).marks).includes(T.id));

// highlight, single paragraph
await page.evaluate(()=>{const p=document.querySelector('#body p');const tn=p.firstChild;const r=document.createRange();r.setStart(tn,10);r.setEnd(tn,42);const s=getSelection();s.removeAllRanges();s.addRange(r);window.__expect=tn.data.slice(10,42).trim()});
await page.waitForFunction(()=>!document.querySelector('#selbar').hidden,{timeout:3000}).catch(()=>{});
ok('selection toolbar appears',await page.evaluate(()=>!document.querySelector('#selbar').hidden));
const bar=await page.evaluate(()=>{const r=document.querySelector('#selbar').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]});
ok('toolbar inside viewport',bar[0]>=0&&bar[2]<=bar[4]&&bar[1]>=0&&bar[3]<=bar[5],bar.join(','));
await shot('02-selection');
await page.click('#selbar [data-act="selhl"]'); await sleep(80);
let s=await S(); const exp=await page.evaluate(()=>window.__expect);
ok('highlight stored with exact text',s.hl.length===1&&s.hl[0].q===exp,JSON.stringify(s.hl[0]&&s.hl[0].q)+' vs '+exp);
ok('highlight rendered as <mark>',await page.evaluate(()=>document.querySelectorAll('#body mark').length)===1);
// highlight spanning two paragraphs
await page.evaluate(()=>{const ps=document.querySelectorAll('#body p');const a=ps[1].firstChild,b=ps[2].firstChild;const r=document.createRange();r.setStart(a,a.data.length-25);r.setEnd(b,30);const s=getSelection();s.removeAllRanges();s.addRange(r)});
await page.waitForFunction(()=>!document.querySelector('#selbar').hidden,{timeout:3000}).catch(()=>{});
console.log('selbar2',await page.evaluate(()=>({hidden:document.querySelector('#selbar').hidden,sel:getSelection().toString().length,coll:getSelection().isCollapsed,bodyp:document.querySelectorAll('#body p').length})));
await page.click('#selbar [data-act="selnote"]'); await sleep(100);
ok('highlight+note opens sheet',await page.evaluate(()=>!document.querySelector('#sheet').hidden));
await page.type('#hnote','A note about this passage'); await page.click('[data-act="hsave"]'); await sleep(80);
s=await S(); ok('two highlights, second spans 2 paragraphs with note',s.hl.length===2&&s.hl[1].s.length===2&&s.hl[1].note==='A note about this passage',JSON.stringify(s.hl[1]));
ok('note marker class shown',await page.evaluate(()=>document.querySelectorAll('#body mark.has-note').length)>=1);
// tapping an existing highlight reopens it
await page.evaluate(()=>document.querySelector('#body mark').click()); await sleep(60);
ok('tapping a highlight opens its sheet',await page.evaluate(()=>!document.querySelector('#sheet').hidden&&document.querySelector('#stitle').textContent==='Highlight'));
await shot('03-highlight-sheet');
await page.click('[data-act="closesheet"].hbtn'); await sleep(40);
await shot('04-reader-with-highlights');

// reading note + read
await page.type('#note','Grace sufficient'); await sleep(800);
ok('reading note saved',(await S()).notes[T.id]?.t==='Grace sufficient');
await page.evaluate(()=>document.querySelector('[data-act="read"]').click()); await sleep(40);
ok('mark as read saved',!!(await S()).read[T.id]);

// persistence
await page.reload(); await page.waitForSelector('.reading'); await sleep(100);
s=await S(); ok('state survives reload',s.hl.length===2&&s.marks[T.id]&&s.read[T.id]&&s.notes[T.id]);

// search
const DATA=JSON.parse(fs.readFileSync(path.join(ROOT,'src/data.json'),'utf8'));
function indepCount(phrase,pre){ // independent of the app: scan every source string character by character
  const tok=phrase.toLowerCase(), isDig=/^\d+$/.test(tok); let total=0, readings=0;
  const wordCh=/[\p{L}\p{N}]/u, norm=s=>s.toLowerCase().replace(/’/g,"'");
  for(const d of DATA) for(const p of ['m','e']){ const r=d[p]; const srcs=[]; r.v.forEach(v=>{srcs.push(v[0],v[1])}); r.p.forEach(x=>srcs.push(x));
    let n=0; for(const s of srcs){ const L=norm(s); let i=L.indexOf(tok); while(i>=0){ const prevOk=i===0||!wordCh.test(L[i-1]); const nextOk=(pre&&!isDig)||i+tok.length>=L.length||!wordCh.test(L[i+tok.length]); if(prevOk&&nextOk)n++; i=L.indexOf(tok,i+1);} }
    total+=n; if(n)readings++; } return {total,readings}; }
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'search'}})); await sleep(50);
await shot('05-search-empty');
const typeQ=async q=>{ await page.evaluate(()=>{const i=document.querySelector('#q');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}); await page.type('#q',q); await sleep(350); };
const countLine=()=>page.evaluate(()=>{const c=document.querySelector('.count');return c?c.textContent:'(none)'});
for(const [q,phrase] of [['grace','grace'],['lamb','lamb'],['Jordan','jordan'],['"fear not"','fear not'],['prayer','prayer'],["god's","god's"],['Calvary','calvary']]){
  await typeQ(q); const line=await countLine(); const m=line.match(/^(\d+) match(?:es)? in (\d+) reading/); const want=indepCount(phrase);
  ok(`search "${q}" finds every occurrence (${want.total} in ${want.readings})`, !!m && +m[1]===want.total && +m[2]===want.readings, line+' want '+JSON.stringify(want));
}
{ const w=indepCount('thou',false), p=indepCount('thou',true);
  await typeQ('thou'); const l1=await countLine(); const m1=l1.match(/^(\d+) match/);
  ok(`"thou" matches the whole word only (${w.total}), not thought or thousand`,+m1[1]===w.total&&w.total<p.total,l1+' want '+JSON.stringify(w)+' vs '+JSON.stringify(p));
  await page.click('[data-act="spre"]'); await sleep(120); const l2=await countLine(); const m2=l2.match(/^(\d+) match(?:es)? in (\d+)/);
  ok(`"Include longer words" widens it to ${p.total} in ${p.readings}`,+m2[1]===p.total&&+m2[2]===p.readings,l2);
  await page.click('[data-act="spre"]'); await sleep(120);
  ok('switching it off narrows again',(await countLine()).startsWith(w.total+' match'));
  await typeQ('prais'); ok('a stem alone finds nothing but offers the longer words',await page.evaluate(()=>/Include \d+ longer word/.test(document.querySelector('#results').textContent)));
  await page.click('[data-act="spre"]'); await sleep(120); ok('tapping the offer lists the longer words',/^\d+ match/.test(await countLine()));
  await page.click('[data-act="spre"]'); await sleep(60); }
await typeQ('Romans 8'); { const line=await countLine(); const m=line.match(/^(\d+) match(?:es)? in (\d+) reading/);
  ok('reference search returns results',!!m&&+m[1]>0,line); }
await typeQ('zzzzqq'); ok('nonsense query shows nothing found',await page.evaluate(()=>/Nothing found/.test(document.querySelector('#results').textContent)));
await typeQ('grace'); await shot('06-search-results'); await noOverflow('search');
ok('results list individual occurrences, not one row per reading',await page.evaluate(()=>document.querySelectorAll('.rhit').length>document.querySelectorAll('.grp').length));
ok('most-matches order puts the heaviest reading first',await (async()=>{ await page.click('[data-act="ssort"][data-s="most"]'); await sleep(60);
  const ns=await page.evaluate(()=>[...document.querySelectorAll('.rcnt')].slice(0,6).map(x=>parseInt(x.textContent))); await page.click('[data-act="ssort"][data-s="seq"]'); await sleep(60); return ns.every((v,i)=>i===0||ns[i-1]>=v)&&ns[0]>=2; })());
await page.click('[data-act="sfilter"][data-f="e"]'); await sleep(80);
ok('evening filter only returns evening',await page.evaluate(()=>[...document.querySelectorAll('.grp .rmeta')].every(m=>/Evening/.test(m.textContent))));
await page.click('[data-act="sfilter"][data-f="all"]'); await sleep(80);

// jump to an occurrence inside a reading
const target=await page.evaluate(()=>{const g=[...document.querySelectorAll('.grp')].find(x=>x.querySelectorAll('.rhit').length>=3);const b=g.querySelectorAll('.rhit')[1];return {k:b.dataset.k,p:b.dataset.p,n:+g.querySelector('.rcnt').textContent.match(/\d+/)[0]}});
await page.evaluate(t=>{const g=[...document.querySelectorAll('.grp')].find(x=>x.querySelectorAll('.rhit').length>=3);g.querySelectorAll('.rhit')[1].scrollIntoView({block:'center'})},target); await sleep(80);
await page.evaluate(()=>[...document.querySelectorAll('.grp')].find(x=>x.querySelectorAll('.rhit').length>=3).querySelectorAll('.rhit')[1].click()); await sleep(200);
const jump=await page.evaluate(()=>{const cur=[...document.querySelectorAll('.hit.cur')];const r=cur[0]&&cur[0].getBoundingClientRect();return {bar:!!document.querySelector('.findbar'),fn:(document.querySelector('#fn')||{}).textContent,curText:cur.map(x=>x.textContent).join('').toLowerCase(),inView:!!r&&r.top>=0&&r.bottom<=innerHeight,distinct:new Set([...document.querySelectorAll('.hit')].map(x=>x.dataset.n)).size,read:window.__app.V().name}});
ok('tapping an occurrence opens the reading with the word marked',jump.read==='read'&&jump.bar&&/^grace/.test(jump.curText),JSON.stringify(jump));
ok('the matched word is scrolled into view',jump.inView,JSON.stringify(jump));
ok('it is the 2nd occurrence and the reading shows the right total',jump.fn===`2 of ${target.n}`&&jump.distinct===target.n,JSON.stringify(jump)+' want '+target.n);
await shot('06b-find-in-reading'); await noOverflow('reader with find bar');
await page.click('[data-act="fnav"][data-d="1"]'); await sleep(80);
ok('next match moves on',(await page.evaluate(()=>document.querySelector('#fn').textContent))===`3 of ${target.n}`);
for(let i=0;i<target.n-3+1;i++){await page.click('[data-act="fnav"][data-d="1"]');await sleep(30)}
ok('stepping past the last match wraps to the first',(await page.evaluate(()=>document.querySelector('#fn').textContent))===`1 of ${target.n}`);
await page.click('[data-act="fnav"][data-d="-1"]'); await sleep(40);
ok('previous from the first wraps to the last',(await page.evaluate(()=>document.querySelector('#fn').textContent))===`${target.n} of ${target.n}`);
// marks must not disturb the text, highlights or glossary
const before=await page.evaluate(()=>document.querySelector('#body').textContent);
await page.evaluate(()=>{if(!window.__app.S().set.words)window.__app.ACT.words({setAttribute(){}})}); await sleep(80);
const afterW=await page.evaluate(()=>({t:document.querySelector('#body').textContent,hits:new Set([...document.querySelectorAll('.hit')].map(x=>x.dataset.n)).size,fn:document.querySelector('#fn').textContent}));
ok('find marks do not change the reading text',afterW.t===before);
ok('marks come back after the body is redrawn',afterW.hits===target.n,JSON.stringify(afterW));
await page.click('[data-act="fclose"]'); await sleep(60);
await page.evaluate(()=>{if(window.__app.S().set.words)window.__app.ACT.words({setAttribute(){}})}); await sleep(40);
ok('closing the bar clears the marks',await page.evaluate(()=>!document.querySelector('.findbar')&&!document.querySelector('.hit')));
// back to the search tab keeps the query and the results
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'search'}})); await sleep(250);
ok('search tab remembers the last query',await page.evaluate(()=>document.querySelector('#q').value==='grace'&&document.querySelectorAll('.rhit').length>0));
// stepping to another reading drops the marks
await page.evaluate(()=>{const b=document.querySelector('.rhit');b.click()}); await sleep(150);
await page.click('[data-act="step"][data-d="1"]'); await sleep(100);
ok('stepping to the next reading clears the find bar',await page.evaluate(()=>!document.querySelector('.findbar')&&!document.querySelector('.hit')));

// the user's own notes, highlights and the old-words list
const NID=await page.evaluate(()=>{const a=window.__app;const id='03-14-e';a.S().notes[id]={t:'Remember the zebrafinch at the window today',ts:Date.now()};a.commit();return id});
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'search'}})); await sleep(80);
await typeQ('zebrafinch');
ok('a word in your own note is found',await page.evaluate(()=>{const b=document.querySelector('[data-act="rtab"][data-t="y"]');return /1/.test(b.textContent)&&document.querySelector('[data-act="rtab"][data-t="r"]').textContent.includes('0')}));
ok('with no reading matches, the Yours tab opens by itself',await page.evaluate(()=>document.querySelector('[data-act="rtab"][data-t="y"]').getAttribute('aria-pressed')==='true'&&/Your note/.test(document.querySelector('.rmeta').textContent)));
await page.click('.results .rbtn'); await sleep(200);
ok('tapping it opens that reading and the note box',await page.evaluate(id=>window.__app.V().name==='read'&&window.__app.cur().k+'-'+window.__app.cur().p===id&&document.activeElement&&document.activeElement.id==='note',NID));
const hl0=await page.evaluate(()=>window.__app.S().hl[0]);
const hw=hl0.q.split(/\s+/).find(w=>/^[A-Za-z]{6,}$/.test(w));
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'search'}})); await sleep(80);
await typeQ(hw); await page.click('[data-act="rtab"][data-t="y"]'); await sleep(60);
ok('a word inside a highlight is found under Yours',await page.evaluate(()=>/Highlight/.test(document.querySelector('.results').textContent)),hw);
await typeQ('thou'); await page.click('[data-act="rtab"][data-t="g"]'); await sleep(60);
ok('old words are searched',await page.evaluate(()=>document.querySelectorAll('.results .rbtn').length>0));
await page.click('.results .rbtn'); await sleep(120);
ok('tapping an old word opens its meaning',await page.evaluate(()=>!document.querySelector('#sheet').hidden));
await page.evaluate(()=>window.__app.ACT.closesheet());
await page.evaluate(id=>{const a=window.__app;delete a.S().notes[id];a.commit()},NID);
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'search'}})); await sleep(80);
await typeQ('grace'); await page.click('.grp .rhit'); await sleep(200);

// contents
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'contents'}})); await sleep(50);
await page.click('[data-act="month"][data-m="10"]'); await sleep(30);
ok('October grid has 31 days',await page.evaluate(()=>document.querySelectorAll('.day').length)===31);
await page.click('[data-act="month"][data-m="2"]'); await sleep(30);
ok('February grid has 29 days',await page.evaluate(()=>document.querySelectorAll('.day').length)===29);
await page.click(`[data-act="month"][data-m="${+T.k.slice(0,2)}"]`); await sleep(30); await shot('07-contents'); await noOverflow('contents');
ok('read status shown on its day',await page.evaluate(k=>document.querySelector('[data-k="'+k+'"] .bars i.on')!==null,T.k));
await page.click('[data-act="ctab"][data-t="script"]'); await sleep(50);
const books=await page.evaluate(()=>[...document.querySelectorAll('details.book summary')].map(s=>s.firstChild.textContent));
const CANON=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
const odd=books.filter(b=>!CANON.includes(b)); ok('every scripture book maps to a canonical name',odd.length===0,'unmapped: '+odd.join(', ')+' | total books '+books.length);
const refsTotal=await page.evaluate(()=>document.querySelectorAll('details.book .refrow').length); console.log('scripture rows',refsTotal);
await page.evaluate(()=>document.querySelector('details.book').open=true); await sleep(30); await shot('08-scripture');

// saved
await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'saved'}})); await sleep(50);
ok('saved: bookmark listed',await page.evaluate(()=>document.querySelectorAll('.list li').length)===1);
await page.click('[data-act="stab"][data-t="hl"]'); await sleep(40); ok('saved: 2 highlights listed',await page.evaluate(()=>document.querySelectorAll('.list li').length)===2); await shot('09-saved-highlights'); await noOverflow('saved');
await page.click('[data-act="stab"][data-t="notes"]'); await sleep(40); ok('saved: note listed',await page.evaluate(()=>document.querySelectorAll('.list li').length)===1);

// settings
await page.evaluate(()=>window.__app.ACT.open({dataset:{k:'01-01',p:'m'}})); await sleep(40);
await page.click('[data-act="settings"]'); await sleep(80); await shot('10-settings');
await page.evaluate(()=>{const f=document.querySelector('#fs');f.value=4;f.dispatchEvent(new Event('input',{bubbles:true}))});
ok('text size slider changes size',await page.evaluate(()=>getComputedStyle(document.querySelector('#body p')).fontSize)==='26px');
await page.click('[data-act="set"][data-key="theme"][data-val="night"]'); await sleep(30);
ok('night skin applied',await page.evaluate(()=>document.documentElement.dataset.skin)==='night');
await page.click('[data-act="set"][data-key="face"][data-val="sans"]'); await sleep(30);
ok('sans typeface applies',await page.evaluate(()=>getComputedStyle(document.querySelector('#body')).fontFamily.includes('system-ui')));
await page.click('[data-act="words"]'); await sleep(40);
await page.click('[data-act="closesheet"].hbtn'); await sleep(30);
const gw=await page.evaluate(()=>document.querySelectorAll('#body .gw').length); ok('old words underlined when enabled',gw>0,gw+' words');
await page.evaluate(()=>{const g=document.querySelector('#body .gw');window.__gw=g.dataset.w;g.click()}); await sleep(50);
ok('tapping an old word shows its meaning',await page.evaluate(()=>!document.querySelector('#sheet').hidden&&document.querySelector('#stitle').textContent===window.__gw));
await page.click('#sbody [data-act="glossary"]'); await sleep(40); await shot('11-glossary');
ok('word list renders',await page.evaluate(()=>document.querySelectorAll('dl.gl dt').length)>40);
await page.click('[data-act="closesheet"].hbtn');
await page.evaluate(()=>window.__app.ACT.set({dataset:{key:'theme',val:'reading'}})); // follow the reading
await page.evaluate(()=>window.__app.ACT.open({dataset:{k:'05-10',p:'e'}})); await sleep(40);
ok('follow-the-reading: evening is night',await page.evaluate(()=>document.documentElement.dataset.skin)==='night');
await shot('12-evening-night');
await page.evaluate(()=>window.__app.ACT.period({dataset:{p:'m'}})); await sleep(40);
ok('follow-the-reading: morning is day',await page.evaluate(()=>document.documentElement.dataset.skin)==='day');
await shot('13-morning-day-sans-large');

// listen
const tts=await page.evaluate(()=>({has:'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined'}));
await page.evaluate(()=>document.querySelector('#listenBtn').click()); await sleep(100);
ok('listen does not throw (tts present: '+tts.has+')',errs.length===0,errs.join('|'));
if(tts.has){ok('player shows while listening',await page.evaluate(()=>!document.querySelector('#player').hidden)); await page.evaluate(()=>document.querySelector('[data-act="pstop"]').click()); ok('stop hides player',await page.evaluate(()=>document.querySelector('#player').hidden))}

// export/import
const backup=await page.evaluate(()=>JSON.stringify({app:'morning-evening',exported:'t',data:window.__app.S()}));
const BK=path.join(os.tmpdir(),'me-backup.json'); fs.writeFileSync(BK,backup);
await page.evaluate(()=>{localStorage.clear()}); await page.reload(); await page.waitForSelector('.reading'); await sleep(80);
ok('fresh state after clearing storage',(await S()).hl.length===0);
await page.click('[data-act="settings"]'); await sleep(50);
const inp=await page.$('#imp'); await inp.uploadFile(BK); await sleep(200);
ok('import shows choice with counts',await page.evaluate(()=>/2 highlights/.test(document.querySelector('#sbody').textContent)));
await page.click('[data-act="imerge"]'); await sleep(80);
s=await S(); ok('merge restores highlights, bookmark, notes, progress',s.hl.length===2&&s.marks[T.id]&&s.notes[T.id]&&s.read[T.id]);

// widths
for(const w of [320,360,430,768,1280]){
  await page.setViewport({width:w,height:800,deviceScaleFactor:1,isMobile:w<700,hasTouch:w<700});
  for(const t of ['read','contents','search','saved']){await page.evaluate(t=>window.__app.ACT.tab({dataset:{t}}),t);await sleep(40);const o=await page.evaluate(()=>[document.documentElement.scrollWidth,window.innerWidth]);ok(`no horizontal scroll ${w}px ${t}`,o[0]<=o[1],o.join('/'))}
}
await page.setViewport({width:1100,height:800,deviceScaleFactor:1}); await page.evaluate(()=>window.__app.ACT.tab({dataset:{t:'read'}})); await sleep(60); await shot('14-desktop');
ok('no script errors during whole run',errs.length===0,errs.join(' | '));
await browser.close();
const bad=results.filter(r=>r[0]==='FAIL');
for(const r of results) console.log(r[0],r[1],r[2]&&r[0]==='FAIL'?'  -> '+r[2]:'');
console.log(`\n${results.length-bad.length}/${results.length} passed`);
