from pathlib import Path
import hashlib, json, re, zipfile

root=Path('dist').resolve()
headers=(root/'_headers').read_text(encoding='utf-8')
assert '__SCRIPT_HASHES__' not in headers
missing=[]
for p in root.rglob('*.html'):
    text=p.read_text(encoding='utf-8')
    for ref in re.findall(r'(?:src|href)=["\'](/[^"\']*)["\']',text):
        target=root/ref.split('?')[0].split('#')[0].lstrip('/')
        if not target.exists() and not (target/'index.html').exists(): missing.append(ref)
assert not missing, missing
for p in root.rglob('*.js'):
    assert not any(x in p.read_text(encoding='utf-8') for x in ['G-CUMIDTEST','cumid-test.supabase.co','test-public-key-not-a-secret']),p
assert 'journaling-afternoon.webp' in (root/'index.html').read_text(encoding='utf-8')
assert '<h1 ' in (root/'faq/index.html').read_text(encoding='utf-8')
out=Path('releases');out.mkdir(exist_ok=True)
archive=out/'cumid-cloudflare-2026-10-17.zip'
files=sorted(p for p in root.rglob('*') if p.is_file())
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:
        assert not p.name.startswith('.env')
        z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'index.html' in z.namelist() and '_headers' in z.namelist()
manifest={'date':'2026-10-17','archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(files),'bytes':archive.stat().st_size,'products':len(list((root/'products').glob('*/index.html'))),'googleLogin':'Not configured; guest mode','ga4':'Not configured; no opt-in banner until configured'}
(out/'release-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
(out/'UPLOAD-INSTRUCTIONS.txt').write_text('Upload the CONTENTS of dist or this ZIP to the existing Cloudflare Workers static-assets deployment. index.html and _headers must be at the upload root. Do not upload the source repository or dist-e2e.\n\nGoogle login and analytics are not activated without your real provider settings. See ../docs/LOGIN_ANALYTICS_SETUP.md. After configuration a new build and upload are required.\n\nExisting site: https://fancy-smoke-e09a.ankshitdey-mr-veteran.workers.dev/\nCanonical domain: https://cumid.store\nSupport: support@cumid.store\nThis release has not been deployed automatically.\n',encoding='utf-8')
print(json.dumps(manifest,indent=2))
