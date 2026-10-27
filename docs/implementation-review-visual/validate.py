from pathlib import Path
import re,json,xml.etree.ElementTree as E,hashlib
p=Path('.');src=Path('../implementation-review.md').read_text();content=json.load(open('published.json'))['data']['document']['content'];r=E.fromstring('<doc>'+content+'</doc>');txt=' '.join(r.itertext())
def norm(t):
 t=re.sub(r'\[([^\]]+)\]\((/[^)]+)\)',r'\1 — \2',t);return re.sub(r'\s+|[`*]','',t)
n=norm(txt);missing=[];fence=False
for ln in src.splitlines():
 if ln.startswith('```'):fence=not fence;continue
 if fence or not ln.strip() or ln.startswith('#'):continue
 if ln.startswith('|'):
  vals=[x.strip() for x in ln.strip().strip('|').split('|')]
  if all(re.fullmatch(':?-+:?',v) for v in vals):continue
  for v in vals:
   if norm(v) not in n and len(v)>30:missing.append(v)
 else:
  v=re.sub(r'^(?:[-*]|\d+\.)\s+','',ln)
  if norm(v) not in n and len(v)>30:missing.append(v)
res={'source_sha256':hashlib.sha256(src.encode()).hexdigest(),'images':len(list(r.iter('img'))),'missing_prose_or_table_values':missing,'risk_ids':sorted(set(re.findall(r'F\d{2}',txt))),'decision_ids':sorted(set(re.findall(r'D\d{2}',txt))),'source_index_count':len(re.findall(r'^\| [CBJT]\d{2} \|',src,re.M)),'max_table_rows':max(len(list(t.iter('tr'))) for t in r.iter('table')),'max_table_columns':max(len(row) for row in r.iter('tr')),'raw_mermaid':bool(re.search('```mermaid|<pre[^>]*mermaid',content))}
(p/'validation.json').write_text(json.dumps(res,ensure_ascii=False,indent=2));print(json.dumps(res,ensure_ascii=False,indent=2))
