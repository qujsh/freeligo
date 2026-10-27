exec(open('publish.py').read().split('log=json.loads')[0])
# Complete the three source preambles omitted from section extraction.
src=Path('../implementation-review.md').read_text();pref=[ln for ln in src.splitlines() if ln.startswith(('审查日期：','优先级：','下列来自源码行为'))]
for text,anchor in zip(pref,[ids['3.1 审查范围、证据与架构约束'],ids['3.5 P0 风险'],ids['3.7 决策清单 D01—D04']]):
 import html
 t=html.escape(text);t=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',t);call(['+update','--doc',doc,'--command','block_insert_after','--block-id',anchor,'--content','<p>'+t+'</p>'])
# Native hierarchical groups rather than repeated numbering.
for j,sev in enumerate(['P0','P1','P2','P3'],1):
 old='3.5 '+sev+' 风险';new=f'<h3>3.5.{j} {sev} 风险</h3>'
 if j==1:new='<h2>3.5 风险清单：沿用原等级</h2>'+new
 call(['+update','--doc',doc,'--command','block_replace','--block-id',ids[old],'--content',new])
for j,ran in enumerate(['D01—D04','D05—D08','D09—D12','D13—D16'],1):
 old='3.7 决策清单 '+ran;new=f'<h3>3.7.{j} {ran}</h3>'
 if j==1:new='<h2>3.7 负责人决策清单</h2>'+new
 call(['+update','--doc',doc,'--command','block_replace','--block-id',ids[old],'--content',new])
print('Preambles and heading hierarchy refined',flush=True)
