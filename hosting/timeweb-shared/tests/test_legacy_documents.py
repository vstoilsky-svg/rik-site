"""Изолированная HTTP-регрессия только выдачи трёх старых PDF; без credentials."""
import hashlib,json,pathlib,shutil,socket,subprocess,tempfile,time,urllib.request,urllib.error,uuid

ROOT=pathlib.Path(__file__).resolve().parents[3]
DOCS={
 'catalog':('docs/katalog-rik.pdf','347C8D68BBE80092CCFA15C57C214202E9986C247F0B5573FA1E083F58561A94'),
 'central':('downloads/tehlist/Tehlist_RIK-S,M.pdf','0E54C5DD3D40C27048D8300E5E3BC46AC6C9715E4BC118EB477CE418830511E6'),
 'central-captioned':('downloads/tehlist/Tehlist_RIK-S,M.captioned.pdf','AC020F156937BA67E7ADF7F18D9F403767BF7A5D0F85461FBFFD0B6905334FE4'),
}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
with tempfile.TemporaryDirectory(prefix='rik-pdf-regression-') as tmp:
    stage=pathlib.Path(tmp); public=stage/'public_html'; private=stage/'rik_app/legacy-documents'
    public.mkdir();private.mkdir(parents=True)
    helper=ROOT/'hosting/timeweb-shared/public_html/legacy-document.php'
    shutil.copyfile(helper,public/helper.name)
    for key,(rel,expected) in DOCS.items():
        src=ROOT/'frontend/public'/rel;assert digest(src)==expected
        shutil.copyfile(src,private/src.name)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    name='rik-pdf-test-'+uuid.uuid4().hex[:10]
    subprocess.run(['docker','run','-d','--rm','--name',name,'-p',f'127.0.0.1:{port}:8099','--mount',f'type=bind,source={stage},target=/work,readonly','php:8.2-cli','php','-S','0.0.0.0:8099','-t','/work/public_html'],check=True,capture_output=True)
    try:
        url=f'http://127.0.0.1:{port}/legacy-document.php'
        def request(query,method='HEAD'):
            req=urllib.request.Request(url+'?'+query,method=method)
            try:return urllib.request.urlopen(req,timeout=20)
            except urllib.error.HTTPError as exc:return exc
        for _ in range(40):
            try:
                if request('document=missing').code==404:break
            except OSError:pass
            time.sleep(.25)
        rows=[]
        for key,(rel,expected) in DOCS.items():
            with request('document='+key) as r:
                assert r.code==200 and r.headers['Content-Type']=='application/pdf'
                assert r.headers['X-Robots-Tag']=='noindex' and r.read()==b''
            with request('document='+key,'GET') as r:
                h=hashlib.sha256()
                for chunk in iter(lambda:r.read(1024*1024),b''):h.update(chunk)
                assert r.code==200 and h.hexdigest().upper()==expected
            rows.append(key)
        for query in ['document=missing','document=../../config.env','document%5B%5D=catalog']:
            with request(query) as r:assert r.code==404
        with request('document=catalog','POST') as r:assert r.code==405
        (private/'katalog-rik.pdf').unlink()
        with request('document=catalog') as r:assert r.code==503
        # Правила ссылаются только на фиксированные ключи, а не на входной путь.
        apache=(ROOT/'hosting/timeweb-shared/public_html/.htaccess').read_text(encoding='utf-8')
        for key in DOCS:assert f'legacy-document.php?document={key} [END]' in apache
        print(json.dumps({'pdfs':len(rows),'getSha':3,'headNoBody':3,'noindex':3,'invalidQueries':3,'post405':True,'missing503':True,'realMailSubmissions':0}))
    finally:
        subprocess.run(['docker','stop',name],capture_output=True,timeout=20)
