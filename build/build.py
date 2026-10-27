import base64, json, os, re, shutil, sys, zipfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src'); DIST = os.path.join(ROOT, 'dist')
FONT = os.path.join(ROOT, 'node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2')

tpl = open(os.path.join(SRC, 'app.html'), encoding='utf-8').read()
data = open(os.path.join(SRC, 'data.json'), encoding='utf-8').read()
# keep the JSON safe inside a <script> block
data = data.replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
font = base64.b64encode(open(FONT, 'rb').read()).decode()

def fill(t, debug):
    t = t.replace('__FONT_B64__', font).replace('__DATA_JSON__', data)
    if not debug:
        t = re.sub(r'/\*DEBUG\*/.*?/\*ENDDEBUG\*/', '', t, flags=re.S)
    return t

HEAD = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3F6F5">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Morning and Evening">
<meta name="description" content="Spurgeon's Morning and Evening, 732 daily readings, with search, bookmarks, highlights and notes.">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
'''
TAIL = '\n</body></html>\n'

shutil.rmtree(DIST, ignore_errors=True)
for d in ('artifact', 'pwa', 'test'): os.makedirs(os.path.join(DIST, d))

# 1. artifact fragment (no skeleton tags, no debug hook)
open(os.path.join(DIST, 'artifact/morning-and-evening.html'), 'w', encoding='utf-8').write(fill(tpl, False))
# 2. test build (debug hook kept)
open(os.path.join(DIST, 'test/index.html'), 'w', encoding='utf-8').write(HEAD + fill(tpl, True) + TAIL)
# 3. installable web app
pwa = os.path.join(DIST, 'pwa')
open(os.path.join(pwa, 'index.html'), 'w', encoding='utf-8').write(HEAD + fill(tpl, False) + TAIL)
json.dump({
  "name": "Morning and Evening", "short_name": "Morning & Evening",
  "description": "Spurgeon's daily readings, morning and evening.",
  "start_url": "./index.html", "scope": "./", "display": "standalone", "orientation": "portrait",
  "background_color": "#0F1821", "theme_color": "#0F1821", "lang": "en",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]}, open(os.path.join(pwa, 'manifest.webmanifest'), 'w'), indent=1)
open(os.path.join(pwa, 'sw.js'), 'w').write('''const C='morning-evening-v1';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
''')

# icon: a half sun on the horizon, the two bookends of the day in one mark
def icon(size):
    S = 1024; im = Image.new('RGB', (S, S), '#0F1821'); d = ImageDraw.Draw(im)
    hy = int(S * 0.60)
    d.rectangle([0, hy, S, S], fill='#16222D')
    r = int(S * 0.235); cx = S // 2
    d.pieslice([cx - r, hy - r, cx + r, hy + r], 180, 360, fill='#E3AA55')
    d.rectangle([int(S*.20), hy - 3, int(S*.80), hy + 3], fill='#E8E3D6')
    for i, w in enumerate((0.34, 0.24, 0.14)):
        y = hy + int(S * (0.07 + 0.065 * i)); half = int(S * w / 2)
        d.rectangle([cx - half, y, cx + half, y + 7], fill='#E3AA55' if i == 0 else '#3A4C5C')
    return im.resize((size, size), Image.LANCZOS)
for s in (512, 192, 180): icon(s).save(os.path.join(pwa, f'icon-{s}.png'), optimize=True)

# ready-to-host copy in public/ (this is the folder a static host such as Netlify serves)
PUB = os.path.join(ROOT, 'public')
shutil.rmtree(PUB, ignore_errors=True); shutil.copytree(pwa, PUB)

# zip for hosting
z = os.path.join(DIST, 'morning-and-evening-app.zip')
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for f in sorted(os.listdir(pwa)): zf.write(os.path.join(pwa, f), 'morning-and-evening/' + f)
    zf.write(os.path.join(ROOT, 'build/README.md'), 'README.md')
for p in ('artifact/morning-and-evening.html', 'pwa/index.html', 'morning-and-evening-app.zip'):
    print(f"{p}: {os.path.getsize(os.path.join(DIST, p))/1024:.0f} KB")
