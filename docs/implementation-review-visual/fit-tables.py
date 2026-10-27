exec(open('publish.py').read().split('log=json.loads')[0])
import html
content=json.load(open('published.json'))['data']['document']['content'];tree=ET.fromstring('<doc>'+content+'</doc>')
for num,t in enumerate(tree.iter('table')):
 rows=list(t.iter('tr'));cells=[list(r) for r in rows];cols=max(len(r) for r in cells)
 if cols<=3:
  widths={1:[560],2:[180,380],3:[120,220,220]}[cols]
  for c in list(t):
   if c.tag=='colgroup':t.remove(c)
  group=ET.Element('colgroup')
  for w in widths:ET.SubElement(group,'col',{'width':str(w)})
  t.insert(0,group)
  for x in t.iter():x.attrib.pop('id',None)
  body=ET.tostring(t,encoding='unicode')
 elif num==0:
  # First capability map remains a compact three-column comparison.
  h=[list(r) for r in rows]
  body='<table><colgroup><col width="90"/><col width="235"/><col width="235"/></colgroup><thead><tr>'+''.join('<th>'+html.escape(''.join(c.itertext()))+'</th>' for c in h[0][:3])+'</tr></thead><tbody>'
  for r in h[1:]:body+='<tr>'+''.join('<td>'+html.escape(''.join(c.itertext()))+'</td>' for c in r[:3])+'</tr>'
  body+='</tbody></table><p><b>能力依据：</b>'+'；'.join(html.escape(''.join(r[0].itertext()))+'：'+html.escape(''.join(r[3].itertext())) for r in h[1:])+'</p>'
 else:
  headers=[''.join(c.itertext()) for c in cells[0]];body=''
  for row in cells[1:]:
   body+='<p><b>'+html.escape(''.join(row[0].itertext()))+'</b></p>'
   for h,c in zip(headers[1:],row[1:]):body+='<p><b>'+html.escape(h)+'：</b>'+html.escape(''.join(c.itertext()))+'</p>'
 # Need original id saved before strip.
 original=list(ET.fromstring('<doc>'+content+'</doc>').iter('table'))[num].attrib['id']
 call(['+update','--doc',doc,'--command','block_replace','--block-id',original,'--content',body]);print('table',num+1,'fitted',flush=True)
