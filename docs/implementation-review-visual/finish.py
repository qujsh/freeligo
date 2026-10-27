exec(open('publish.py').read().split('log=json.loads')[0])
content=json.load(open('published.json'))['data']['document']['content'];t=ET.fromstring('<doc>'+content+'</doc>')
markers=[x.attrib['id'] for x in t.iter('p') if re.fullmatch(r'图 \d+｜[^\n]+',''.join(x.itertext()).strip())]
if markers:call(['+update','--doc',doc,'--command','block_delete','--block-id',','.join(markers)])
print('Removed duplicate figure captions:',len(markers))
