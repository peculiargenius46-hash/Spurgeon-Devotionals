import json, re, sys
SRC = sys.argv[1]; OUT = sys.argv[2]
d = json.load(open(SRC, encoding='utf-8'))
months = ['january','february','march','april','may','june','july','august','september','october','november','december']
REF = r'((?:[123] )?[A-Z][A-Za-z]+(?: (?:of )?[A-Z][a-z]+)* \d+(?::\d+(?:[-–]\d+)?)?)'
LEAK = re.compile(r'^"(.{3,400}?)"\n\n' + REF + r'\n\n', re.S)
days = {}
repaired = []
for e in d:
    mo, dy = e['date'].split('-'); k = f"{months.index(mo)+1:02d}-{int(dy):02d}"
    verses = []
    if e['verse'].strip() and re.search(r'\d', e['scripture']):
        verses.append([e['verse'].strip(), e['scripture'].strip()])
    text = e['text']
    while True:
        m = LEAK.match(text)
        if not m: break
        verses.append([m.group(1).strip(), m.group(2).strip()])
        text = text[m.end():]
        if (k, e['period']) not in repaired: repaired.append((k, e['period']))
    text = text.replace('--', '\u2014'); verses = [[v[0].replace('--', '\u2014'), v[1]] for v in verses]
    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    assert verses and paras, (k, e['period'])
    days.setdefault(k, {})['m' if e['period']=='morning' else 'e'] = {'v': verses, 'p': paras}
keys = sorted(days)
assert len(keys) == 366 and all(set(days[k]) == {'m','e'} for k in keys)
out = [{'k': k, 'm': days[k]['m'], 'e': days[k]['e']} for k in keys]
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
print("days:", len(out), "| readings:", sum(2 for _ in out), "| repaired:", repaired)
print("multi-verse entries:", [(x['k'],p,len(x[p]['v'])) for x in out for p in 'me' if len(x[p]['v'])>1])
print("words:", sum(len(' '.join(x[p]['p']).split()) for x in out for p in 'me'))
