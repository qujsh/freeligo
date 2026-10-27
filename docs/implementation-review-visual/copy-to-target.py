from pathlib import Path
import subprocess,json,xml.etree.ElementTree as E,re
p=Path('.');target='XED3d3oQhoFf7bxFSLwccsUJnRd';source='E8zYdNt3PoLFBsx7qH7cWB1inGf'
def call(args,body=None):
 r=subprocess.run(['lark-cli','docs',*args,'--as','user'],input=body,text=True,capture_output=True);z=json.loads(r.stdout)
 if r.returncode or not z.get('ok') or z.get('data',{}).get('result') in ('failed','partial_success'):raise RuntimeError(r.stdout+r.stderr)
 return z
z=call(['+fetch','--doc',source,'--detail','full']);(p/'copy-source.json').write_text(json.dumps(z,ensure_ascii=False));tree=E.fromstring('<doc>'+z['data']['document']['content']+'</doc>');sections=[]
for el in tree:
 if re.fullmatch('h[1-9]',el.tag):sections.append({'tag':el.tag,'title':''.join(el.itertext()),'oldid':el.attrib['id'],'elements':[]})
 elif el.tag!='title' and sections:sections[-1]['elements'].append(el)
skel=''.join('<'+s['tag']+'>'+s['title'].replace('&','&amp;')+'</'+s['tag']+'>' for s in sections)
call(['+update','--doc',target,'--command','block_insert_after','--block-id','HxtAdTGkIo6JVXxmFbvcCv0bnpc','--content','-'],skel)
z=call(['+fetch','--doc',target,'--scope','outline','--max-depth','3']);out=E.fromstring(z['data']['document']['content']);heads=[el for el in out.iter() if re.fullmatch('h[1-9]',el.tag)];assert len(heads)==len(sections)
ids={s['oldid']:h.attrib['id'] for s,h in zip(sections,heads)}
for i,s in enumerate(sections):
 for el in s['elements']:
  for node in el.iter():
   node.attrib.pop('id',None)
   if node.tag=='a' and source in node.attrib.get('href',''):
    href=node.attrib['href'];old=href.split('#')[-1];node.attrib['href']='https://my.feishu.cn/docx/'+target+('#'+ids[old] if old in ids else '')
 body=''.join(E.tostring(el,encoding='unicode') for el in s['elements'])
 if body:
  z=call(['+update','--doc',target,'--command','block_insert_after','--block-id',ids[s['oldid']],'--content','-'],body)
  if z['data'].get('warnings'):print('WARN',s['title'],z['data']['warnings'],flush=True)
 print(i+1,len(sections),s['title'],flush=True)
z=call(['+fetch','--doc',target,'--detail','full']);(p/'target-published.json').write_text(json.dumps(z,ensure_ascii=False,indent=2));print('COPY COMPLETE',flush=True)
