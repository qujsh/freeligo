import json,subprocess,xml.etree.ElementTree as ET,re,time
from pathlib import Path
p=Path('.'); chunks=json.loads((p/'chunks.json').read_text());doc=json.loads((p/'create-result.json').read_text())['data']['document']['document_id'];url='https://himo-group.feishu.cn/docx/'+doc
outline=ET.fromstring(json.loads((p/'outline.json').read_text())['data']['document']['content']);ids={''.join(x.itertext()):x.attrib['id'] for x in outline.iter() if re.match(r'h[1-9]$',x.tag)}
def call(args,content=None):
 r=subprocess.run(['lark-cli','docs',*args,'--as','user'],input=content,text=True,capture_output=True)
 try:z=json.loads(r.stdout)
 except:raise RuntimeError(r.stdout+r.stderr)
 if r.returncode or not z.get('ok') or z.get('data',{}).get('result') in ['failed','partial_success']:raise RuntimeError(json.dumps(z,ensure_ascii=False))
 return z
log=json.loads((p/'publish-log.json').read_text()) if (p/'publish-log.json').exists() else []
for i,c in enumerate(chunks):
 if any(x.get('index')==i and x.get('done') for x in log):continue
 body=c['xml'];marker=f'图 {i+1:02d}｜'+c['title'].split(' ',1)[-1]
 if c['image']:
  label='<p><b>'+marker+'</b></p>'
  if '<p><b>关键业务规则' in body:body=body.replace('<p><b>关键业务规则',label+'<p><b>关键业务规则',1)
  else:body+=label
 # hyperlink function cards to matching detail anchor
 if c['title'].startswith('2.'):
  num=int(c['title'].split('.')[1].split(' ')[0]);target=next(x for x in chunks if x['title'].startswith(f'3.3.{num} '));body+=f'<p><a href="{url}#{ids[target["title"]]}">查看本模块完整技术依据 →</a></p>'
 if body:result=call(['+update','--doc',doc,'--command','block_insert_after','--block-id',ids[c['title']],'--content','-'],body)
 if c['image']:
  z=call(['+fetch','--doc',doc,'--scope','keyword','--keyword',marker,'--detail','with-ids']);tree=ET.fromstring(z['data']['document']['content']);matches=[x for x in tree.iter('p') if marker in ''.join(x.itertext())];anchor=matches[0].attrib['id']
  z=call(['+media-insert','--doc',doc,'--file','images/'+c['image']+'.png','--width','800','--align','center','--caption',marker]);block=z['data']['block_id']
  call(['+update','--doc',doc,'--command','block_move_after','--block-id',anchor,'--src-block-ids',block])
 log.append({'index':i,'title':c['title'],'done':True});(p/'publish-log.json').write_text(json.dumps(log,ensure_ascii=False,indent=2));print(f'{i+1}/{len(chunks)} {c["title"]}',flush=True)
(p/'published-url.txt').write_text(url)
