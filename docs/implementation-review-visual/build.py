from pathlib import Path
import re,json,html,hashlib
root=Path('/Users/mainto/frontfile/freeligo'); out=root/'docs/implementation-review-visual'; src=(root/'docs/implementation-review.md').read_text()
e=lambda s:html.escape(s,quote=False)
def inline(s):
 s=re.sub(r'\[([^\]]+)\]\((/[^)]+)\)',lambda m:m[1]+' — '+m[2],s);s=e(s);s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s);s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s);return s

def table(rows):
 return '<table><thead><tr>'+''.join('<th background-color="light-gray">'+inline(x)+'</th>' for x in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(x)+'</td>' for x in r)+'</tr>' for r in rows[1:])+'</tbody></table>'
# Preserve every non-diagram source line; split long tables and paragraphs for reading.
def convert(text):
 lines=text.strip().splitlines();res=[];i=0
 while i<len(lines):
  s=lines[i].strip()
  if not s:i+=1;continue
  if s.startswith('```'):
   lang=s;i+=1;code=[]
   while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
   labels={}
   for ln in code:
    for mm in re.finditer(r'(\w+)\[([^\]]+)\]',ln):labels[mm[1]]=mm[2]
    mm=re.match(r'\s*(?:actor|participant) (\w+) as (.+)',ln)
    if mm:labels[mm[1]]=mm[2]
   flow=[]
   for ln in code:
    ln=ln.strip()
    mm=re.match(r'(\w+)(?:->>|-->>)(\w+):\s*(.+)',ln)
    if mm:flow.append([labels.get(mm[1],mm[1]),mm[3],labels.get(mm[2],mm[2])]);continue
    ln=re.sub(r'(\w+)\[[^\]]+\]',r'\1',ln)
    mm=re.match(r'(\w+)\s*(-->|-\.)\s*(?:\|([^|]+)\|)?\s*(\w+)',ln)
    if mm:flow.append([labels.get(mm[1],mm[1]),mm[3] or '进入 / 调用',labels.get(mm[4],mm[4])])
   res.append('<p><b>流程条件补充：</b>结合前文图示阅读；下表保留原流程的调用 / 状态转换。</p>')
   for j in range(0,len(flow),7):res.append(table([['起点','操作 / 条件','终点']]+flow[j:j+7]))
   i+=1;continue
  if s.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].strip().startswith('|'):
    row=[x.strip() for x in lines[i].strip().strip('|').split('|')]
    if not all(re.fullmatch(r':?-+:?',x) for x in row):rows.append(row)
    i+=1
   if len(rows[0])>5 or any(len(''.join(r))>650 for r in rows[1:]):
    for row in rows[1:]:
     res.append('<p><b>'+inline(row[0])+'</b></p>')
     for k,v in zip(rows[0][1:],row[1:]):res.append('<p><b>'+inline(k)+'：</b>'+inline(v)+'</p>')
   else:
    for j in range(1,len(rows),7):res.append(table([rows[0]]+rows[j:j+7]))
   continue
  if s.startswith('#'):
   title=re.sub(r'^#+\s*','',s);res.append('<p><b>'+e(title)+'</b></p>');i+=1;continue
  m=re.match(r'^(?:[-*]|\d+\.)\s+(.*)',s)
  if m:res.append('<ul><li>'+inline(m[1])+'</li></ul>')
  else:
   # Break only at sentence boundaries; leave technical constraints intact.
   parts=re.split(r'(?<=。)(?=.{55})',s) if len(s)>230 else [s]
   res += ['<p>'+inline(p)+'</p>' for p in parts if p]
  i+=1
 return ''.join(res)
sections={}
for m in re.finditer(r'^### (\d+\.\d+) ([^\n]+)\n(.*?)(?=^### |^## |\Z)',src,re.M|re.S):sections[m[1]]=(m[2],m[3])
chapters={}
for m in re.finditer(r'^## (\d+)\. ([^\n]+)\n(.*?)(?=^## |\Z)',src,re.M|re.S):chapters[m[1]]=(m[2],m[3])
chunks=[]; diagrams=[];mapping=[]
def add(title,body,level=2,image=None):
 chunks.append({'title':title,'level':level,'xml':body,'image':image});return len(chunks)-1

def diagram(name,title,rows,notes):
 # Grid of 3 nodes per row; each row is independent labeled flow. No implied cross-row dependencies.
 w=1080;h=105+len(rows)*145+len(notes)*29+30
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">','<defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#8292aa"/></marker></defs>',f'<rect width="{w}" height="{h}" fill="#ffffff"/>',f'<text x="30" y="43" font-size="27" font-weight="650" fill="#17253c">{e(title)}</text>']
 for ri,(label,nodes) in enumerate(rows):
  y=85+ri*145;svg.append(f'<text x="30" y="{y+17}" font-size="17" fill="#63738c">{e(label)}</text>')
  nw=305;gap=42
  for j,node in enumerate(nodes):
   x=30+j*(nw+gap); main,sub,*style=node; demo=style and style[0]=='demo';warn=style and style[0]=='warn';fill='#fff4e9' if warn else '#f2f4f7' if demo else '#eef5ff';stroke='#e8b878' if warn else '#cbd2dc' if demo else '#aec9ef'
   svg.append(f'<rect x="{x}" y="{y+33}" width="{nw}" height="80" rx="12" fill="{fill}" stroke="{stroke}"/>')
   svg.append(f'<text x="{x+16}" y="{y+65}" font-size="21" font-weight="600" fill="#1c304d">{e(main)}</text>')
   svg.append(f'<text x="{x+16}" y="{y+94}" font-size="16" fill="#55657a">{e(sub)}</text>')
   if j<len(nodes)-1 and not label.startswith(('权限分工','退出编辑')):svg.append(f'<path d="M{x+nw+7},{y+73} H{x+nw+gap-9}" stroke="#8292aa" stroke-width="2" marker-end="url(#a)"/>')
 for k,n in enumerate(notes):svg.append(f'<text x="30" y="{100+len(rows)*145+k*29}" font-size="17" fill="#63738c">{e(n)}</text>')
 svg.append('</svg>');(out/'images'/f'{name}.svg').write_text(''.join(svg));diagrams.append(name);return name
arch=diagram('architecture','系统架构｜两个前端，共享一个后端',[
 ('B 端真实读写',[('React 工作台','登录、需求、拆解、发布'),('受保护 API','Cookie + 身份 / 协作授权'),('MySQL + 本地文件','业务数据 / 快照；媒体分开存储')]),
 ('C 端真实浏览',[('Vue 网页','分类、筛选、预览、详情'),('公开发现 API','仅当前正式版；公开范围过滤'),('当前正式快照读模型','关联实时账号 / 分类信息')]),
 ('C 端演示支路',[('mock 模式','非默认真实模式','demo'),('本机演示服务','收藏、意向、选人、C 发布','demo'),('localStorage','不进入共享后端','demo')])],['蓝：已存在的真实链路；灰：演示链路。图示依据原报告 S，不代表全链路运行验收。','架构依据：原 §2、C05/C06、J01/J17/J22/J25。'])
loop=diagram('business-loop','核心链路｜公众只看确认发布的版本',[
 ('编辑阶段',[('收集需求','输入主要留在 B 端内存'),('拆解 / 编辑工作项','AI 结果可先独立入库'),('进入任务发布','此时保存内部需求及关联')]),
 ('发布阶段',[('保存发布草稿','不改变已有正式内容'),('确认发布','新增快照、更新当前版本指针'),('C 端浏览','TASK 招募 + PROJECT 项目视角')])],['内部需求 ≠ 发布草稿 ≠ 正式快照；树节点不是独立可承接岗位。','依据：原 §4.3/4.8/4.9、§5.1；B01/J17/J18/J23。'])
add('1 项目负责人速览','',1)
add('1.1 五分钟掌握当前系统','<p><b>系统定位：</b>把 B 端收集、拆解和确认发布的需求，变成 C 端可以公开发现和查看的任务与项目介绍。</p><p>真实链路已存在，但还不是完整的任务交易平台。C 端真实模式以浏览为主；收藏、意向、C 发布和选人只在本机演示中有完整交互。</p><callout emoji="❗" background-color="light-yellow" border-color="yellow"><p><b>正式开放前优先处理：</b>固定开发验证码及接口返回开发码（F01/P0）；配置内非空 API Key 默认值（F02/P0）。这是原报告静态发现，不是已完成修复。</p></callout><p><b>证据读法：</b>S＝静态源码；T＝原审查执行的测试；R＝原审查实际运行观察。以下验证结果均来自 2026-10-25 原报告，本次仅重构文档，没有重新验收业务系统。</p><p><b>阅读路线：</b>第一层了解边界 → 第二层按功能看图 → 第三层追查完整规则、风险、验证和源码。</p>',image=arch)
add('1.2 核心业务闭环与版本边界','<p>保存内部内容不会自动更新公众页面；只有再次确认发布，C 端才切换到新正式版本。取消发布保留历史；放弃草稿不是删除需求。</p>',image=loop)
add('1.3 B / C 能力地图与真实边界',table([['能力','B 端 / 后端','C 端真实模式','证据'],['账号与权限','Cookie 登录、业务身份、平台与协作授权','没有正式登录链路；写入口拦截','§4.1/4.2；J01/J04/J06/C07'],['需求与 AI','保存、异步拆解、工作项编辑','不直接操作内部树','§4.3–4.5；B01/J11/J14'],['发布版本','草稿、正式快照、取消、放弃、历史','读取当前正式版','§4.8/4.9；J17/J18/J23'],['发现与详情','共享分类、公开内容配置','组合筛选、分页、任务 / 项目视角','§4.7/4.10/4.11；C04/J22'],['媒体','基础上传与访问控制','图片 / 视频基础展示；无真实时长提取','§4.12；J25'],['收藏 / 意向 / 选人','真实链路未完成','仅 mock 演示可写','§4.13；C06/C12']])+'<p><b>实现不等于完整验证：</b>前后端与 MySQL 测试通过，但真实浏览器中的“登录 → 发布 → C 成功展示”没有完成。原审查后续只读接口成功，不能改写此前页面错误态。</p><p><b>首先需要负责人确认：</b>保存时机（D01）、整包还是独立岗位（D02）、合法树层级（D03）、分类治理（D04）；其次确认排序 / 城市 / 预算语义（D05–D07）。完整 16 项在第三层。</p>')
add('2 业务功能图解','<p>每张功能卡先说明实际行为，再列状态、图示、规则和关注点。技术详情按同名模块在第三层展开。</p>',1)
features=[
('登录、账号与权限',['4.1','4.2'],'部分实现；B / 后端已实现但未完整验证；C 正式登录未实现','B 端用手机验证码建立会话；业务身份、平台权限和需求协作权限分别判断。',[
 ('用户操作',[('B 手机号登录','发送验证码并提交'),('建立会话','Cookie；数据库保存令牌哈希'),('进入受保护功能','每次认证查账号 / 会话')]),
 ('权限分工（并列，分别判断）',[('平台角色','控制账号与等级管理'),('业务身份','发布者 / 承接者及等级'),('需求成员角色','viewer / editor / manager / owner')])],['会话默认 30 天；验证码 5 分钟、单次使用，但当前固定 123456 并返回开发码。','新手机号自动开通 L1 发布身份；成长与信用独立，扣成长不降级。','协作权限与平台角色不是同一套；发布主体显示需求所有者。','C 演示身份不等于正式会话；真实模式写操作会被拦截。'],'优先隔离开发认证（F01）；确认自动发布资格与只升不降政策（D14）。','J01/J03/J04/J06/J07、B18–B22、C07'),
('需求创建与保存',['4.3'],'已实现但未完整验证；独立保存与离页保护缺失','新建先在内存编辑，通常进入发布时才保存到共享后端。',[
 ('用户操作',[('新建 LOCAL 需求','标题与说明留在组件 / App'),('点击任务发布','触发 saveRequirement'),('获得 REQ 编号','进入发布向导')]),
 ('内部实现',[('POST requirements/save','内容 + 当前 DEC + attachments'),('授权与关联校验','DEC 须成功且可访问'),('写 requirement','附件描述整批替换')])],['新建并不立即写数据库；刷新可能丢失内容和拆解关联。','保存内部需求不改已有正式快照，已发布 / 取消阶段保留。','只有所有者可软删除；公开查询随后隐藏，历史未级联删除。','当前附件 UI 是固定样例，保存请求 attachments=[] 会清空已有附件描述。'],'确认保存策略（D01）；错误 REQ 回落首条是错对象风险（F04），不是正常兜底。','B01.createRequirement/openPublishing、B07、B10、J08/J09/J10'),
('AI 拆解与工作项编辑',['4.4','4.5','4.6'],'已实现但未完整验证；真实模型、成本与 iframe 未验证','用户提供分析内容，后台异步生成四级工作项；简介采用另一条流式机制。',[
 ('用户操作',[('准备 AI 分析内容','复制提示词 / 外部交流 / 粘贴'),('提交拆解并等待','202 返回任务号；轮询终态'),('编辑树与日期','保存节点；甘特仅呈现日期')]),
 ('后台作业',[('作业先入库','queued → generating'),('生成与校验','validating；固定四级结构'),('事务保存结果','saving → success；失败留原因')]),
 ('独立的简介链路',[('请求简介 SSE','不是拆解作业轮询'),('已有简介直接复用','特定标题后内容截去','warn'),('前端流式呈现','无 AI 分析时复制原始说明')])],['拆解输入非空、最多 50,000 字符；轮询 SUCCESS / FAILED 后停止。','成功树和作业持久化，不代表需求已保存 DEC 关联。','已有节点不能移动父级或改变类型；依赖是文本，不是排程引擎。','内部允许 root work，公开却要求 module 根，存在发布冲突。','启动恢复把全部待处理作业标失败；无多实例租约与恢复队列。','已有简介持续复用；手动编辑保护不等于来源变更自动失效。'],'先确认树规则（D03）与简介重生规则（D11）；单实例机制不能直接承诺多实例可靠。','B07/B08/B09/B17、J11/J12/J13/J14/J15/J16'),
('发布内容与版本管理',['4.8','4.9'],'已实现但未完整验证；隔离数据库测试覆盖关键版本行为','发布把内部材料转换成公众快照，草稿与正式版本相互隔离。',[
 ('用户操作',[('填写发布内容与预览','B / C 同契约，非像素级同组件'),('保存草稿或确认发布','草稿不影响已有正式版'),('放弃 / 取消 / 重发','操作语义不同')]),
 ('版本状态',[('首次草稿 V0','无正式版；可放弃保留编号'),('确认发布 V1…Vn','插入快照、切换指针、清草稿'),('发布后另存草稿','正式仍 Vn；再发才 Vn+1')]),
 ('退出编辑的分支（备选操作，不是执行顺序）',[('放弃草稿','有正式版：恢复其编辑表单'),('取消发布','保留草稿 / 历史；公开不可见'),('再次发布','复用任务号；新增正式版本')])],['一需求复用一个 TASK；确认发布锁需求并递增版本，按最后提交内容覆盖。','公开树仅保留选中节点与祖先的白名单字段；不是整棵内部模型直接外泄。','标题 / 摘要正式发布必填；范围、交付、验收和项目介绍允许空。','新发布默认所有人可见；旧受邀范围保留，重发会转公开。','预算、城市、媒体、项目层级有严格校验；历史只读，没有版本恢复接口。'],'确认整包招募（D02）及旧私有重发提示（D10）；草稿与快照不是自动保存需求。','B11/B12/B13、J17/J18/J19/J20/J23'),
('C 端任务发现与筛选',['4.7','4.10'],'已实现但未完整验证；匿名接口已实测，组合 UI 未验收','用户通过共享分类、城市、方式和预算找到当前正式公开任务。',[
 ('用户操作',[('分类 / 排序 / 条件','排序互斥；筛选可叠加'),('更新 URL 与查询','首页 6 条；大厅 8 条'),('列表与 total 更新','查看更多进入任务大厅')]),
 ('查询数据流',[('公开分页 API','page 1–10000；size 1–100'),('过滤当前正式内容','公开 / 账号 active / 需求未删'),('装配响应','快照 + 实时分类与发布者信息')])],['B / C 分类同一张表；登录用户新增即全局启用，尚缺治理。','“为你发现”与“最新”实际都按首次发布时间排序，不是个性化。','城市来自已公开现场 / 混合任务；选择城市排除远程，不是自动定位。','预算按同单位区间相交；面议 / 非现金不进数值预算筛选。','关键词不搜索项目树节点；新人可参与由发布者勾选。','切换预览也触发 query watcher 重置页码，是静态发现风险。'],'优先确认分类治理、城市、排序和预算语义（D04–D07）；不要把偏好示例称推荐算法。','C03/C04/C05、J21/J22/J23/J24'),
('任务详情与项目展示',['4.11'],'已实现但未完整验证；现有实测数据无项目树，树展示未运行验收','同一条发布用任务视角讲招募要求，用项目视角讲背景和工作项结构。',[
 ('用户操作',[('点击任务卡','桌面抽屉；移动独立详情'),('查看 TASK 招募','目标 / 报酬 / 交付 / 发布者'),('跳到 PROJECT 介绍','查看冻结的项目树')]),
 ('实体关系',[('内部 requirement','关联拆解与工作项'),('一个 published_task','当前版本指向正式快照'),('两种公开视角','TASK 与派生 PROJECT 同源')])],['PROJECT 不是独立多岗位实体；树节点没有独立名额、价格或申请。','详情可匿名查看；旧受邀内容按旧范围授权，不等于所有详情全开放。','内部树修改不影响已发布树；旧数据可能完全没有 content.project。','取消后详情返回未找到，不保留结束说明页；回大厅可能丢失条件。','封面与 gallery 当前可能重复展示；B / C 分别渲染，有漂移风险。'],'确认项目整体与子任务招募关系（D02）；结束详情与截止时间含义待定（D13）。','C04/C05/C09/C10、B13、J22/J23'),
('收藏、意向、承接与 C 发布',['4.13'],'仅演示；真实模式上述写入未实现','本机 mock 可体验收藏、提交意向和发布者选人，不能视为真实履约。',[
 ('真实模式',[('浏览正式任务','公开 API 可用'),('点击收藏 / 意向 / 发布','requireLogin 显示后续接入','warn'),('不写共享数据库','没有正式 C 写入链路','warn')]),
 ('仅 mock 演示',[('演示用户操作','收藏 / 意向 / C 发布','demo'),('本机服务校验','开放任务、非本人、非重复等','demo'),('localStorage 更新','选满人数关闭任务，不关项目','demo')])],['收藏按演示 userId；意向要求相关经验和可开始时间。','选人仅发布者允许；达到名额关闭任务；已接受重复处理幂等。','没有真实撤回、拒绝、支付、交付与验收流程。','“我的意向”仍有占位；真实 owned / favorites 假空列表可能误导。'],'下一批先做正式认证 / 收藏 / 意向，还是 C 发布，需要负责人选择（D16）。','C06/C07/C12/C13/C14；原 §4.13'),
('媒体与辅助能力',['4.12','4.14'],'部分实现；媒体基础已实现但未完整验证，偏好等为演示或内存交互','图片与视频有基础存储和访问控制，偏好、最近浏览和帮助不能当正式业务闭环。',[
 ('媒体链路',[('登录上传素材','签名校验；单文件最大 50MB'),('文件 + 元数据','本地文件；task_media 入库'),('按引用读取','当前公开版引用可公开读取')]),
 ('辅助边界',[('偏好调整 / 最近浏览','内存保存；刷新清除','demo'),('成长 / 帮助 / 我的发布','部分示例、占位与无回调','demo'),('登录背景','固定域名 Bing；缓存与回退')])],['支持 JPEG / PNG / WebP 与有限 MP4 签名；无转码、解码校验和时长提取。','私有媒体只允许上传者；发布允许 actor / owner 素材，导致协作预览不一致。','发布视频需要图片封面；duration 可空，不自动估算。','草稿放弃与取消不会清理孤立文件；历史媒体不保证一直公开可读。','偏好不影响当前推荐；近期浏览首页留 8 条显 2 条且刷新丢失。'],'媒体能力后续处理不代表风险消失；确认封面、保留期及历史访问规则（D15）。','J25/J26/J29、B13、C10/C15；原 §4.12/4.14')]
for idx,(name,ids,status,one,rows,rules,concern,refs) in enumerate(features,1):
 img=diagram(f'feature-{idx}',name,rows,['蓝：真实实现路径；灰：演示 / 内存交互；橙：未接入或关键限制。','依据：原报告 '+ '、'.join('§'+x for x in ids)+'；详见本模块末尾技术依据。'])
 body='<p>'+e(one)+'</p><p><b>功能状态：</b>'+e(status)+'</p><p><b>关键业务规则</b></p><ul>'+''.join('<li>'+e(r)+'</li>' for r in rules)+'</ul><p><b>负责人需要知道什么：</b>'+e(concern)+'</p><p><b>技术实现依据：</b>'+e(refs)+'。完整接口、数据库行为、异常与验证证据见第三层“'+name+'：实现细节”。</p>'
 add(f'2.{idx} {name}',body,image=img)
add('3 技术审查与证据','<p>这一层保留原报告完整技术事实。风险等级未变；下列“建议”均未实施，决策未获确认。路径与函数编号沿用原报告，避免重构文档后失去定位依据。</p>',1)
add('3.1 审查范围、证据与架构约束',convert(chapters['1'][1])+convert(chapters['2'][1]))
add('3.2 页面与入口完整地图',convert(chapters['3'][1]))
for idx,(name,ids,*_) in enumerate(features,1):
 body=''
 for sid in ids:
  title,txt=sections[sid];body+='<p><b>'+e('原 §'+sid+' '+title)+'</b></p>'+convert(txt);mapping.append([sid,f'2.{idx} / 3.3.{idx}',title])
 add(f'3.3.{idx} {name}：实现细节',body,3)
# Place a proper h2 above the feature h3 set
insert_at=next(i for i,x in enumerate(chunks) if x['title'].startswith('3.3.1'))
chunks.insert(insert_at,{'title':'3.3 各功能完整技术依据','level':2,'xml':'<p>与第二层八个功能卡一一对应。下列规则、接口、异常、数据库行为及证据保留自原报告。</p>','image':None})
add('3.4 关键流程的完整约束',convert(chapters['5'][1]))
risks=[]
for line in chapters['6'][1].splitlines():
 if re.match(r'\| F\d+',line):risks.append([x.strip() for x in line.strip().strip('|').split('|')])
for severity in ['P0','P1','P2','P3']:
 body='<p>等级沿用原报告，不因本次排版调整改变。每项按问题 → 影响 → 建议 → 证据阅读。</p>'
 for row in risks:
  if severity not in row[0]:continue
  body+='<p><b>'+inline(row[0])+'</b></p><p><b>问题与源码：</b>'+inline(row[1])+'</p><p><b>影响：</b>'+inline(row[2])+'</p><p><b>建议及证据边界：</b>'+inline(row[3])+'</p>'
 add('3.5 '+severity+' 风险',body)
add('3.6 已有设计的合理部分',convert(sections['6.1'][1]))
decs=[]
for line in chapters['7'][1].splitlines():
 if re.match(r'\| D\d+',line):decs.append([x.strip() for x in line.strip().strip('|').split('|')])
for start in range(0,len(decs),4):
 body='<p>以下为待决策项，不是已经确认的需求或已执行修改。</p>'
 for r in decs[start:start+4]:
  body+='<p><b>'+inline(r[0])+'</b></p>'+''.join('<p><b>'+k+'：</b>'+inline(v)+'</p>' for k,v in zip(['当前实现','可选方案','原报告推荐及理由','负责人确认问题'],r[1:]))
 add(f'3.7 决策清单 {decs[start][0]}—{decs[min(start+3,len(decs)-1)][0]}',body)
add('3.8 改进顺序与修改导航',convert(chapters['8'][1]))
add('3.9 验证结果：通过、受阻与未验证','<p><b>已验证：</b>C 11、B 35、后端 clean test 82 用例通过；后续匿名公开接口只读检查成功。具体证明边界见下表。</p><p><b>失败 / 受阻：</b>初次浏览器检查后端不可用，任务加载失败；存在 API 500、connection refused 与资源 404。不是成功发布链路验收。</p><p><b>未验证：</b>真实浏览器发布全链路、真实短信 / 模型、完整媒体授权矩阵、生产部署与性能。以下均为原报告历史验证，不是本次重测。</p>'+convert(chapters['9'][1]))
# Source table -> cards prevents absolute path columns from squeezing business reading.
index=chapters['10'][1];body='';lines=index.splitlines();i=0
while i<len(lines):
 if lines[i].startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   row=[x.strip() for x in lines[i].strip().strip('|').split('|')];i+=1
   if not all(re.fullmatch(r':?-+:?',x) for x in row):rows.append(row)
  for r in rows[1:]:body+='<p><b>'+inline(r[0])+'</b></p>'+''.join('<p>'+inline(v)+'</p>' for v in r[1:])
 else:body+=convert(lines[i]);i+=1
add('3.10 关键源码索引',body)
maprows=[['原报告','重构后位置','保留方式'],['§1 执行摘要 / 范围','第一层 + 3.1','结论前置；范围全文保留'],['§2 架构与数据','1.1 架构图 + 3.1','图解 + 技术表分组'],['§3 功能地图','1.3 + 3.2','能力摘要 + 页面全量'],['§4 功能细节','第二层 + 3.3','八卡摘要 + 原规则完整保留'],['§5 关键流程','第一 / 二层图 + 3.4','概览图 + 原条件文字'],['§6 审查发现','3.5 / 3.6','22 项风险原级别；合理设计保留'],['§7 决策','3.7','16 项逐项保留']]
body=table(maprows)+table([maprows[0],['§8 改进建议','3.8','建议未实施；修改导航保留'],['§9 验证','3.9','执行 / 受阻 / 未测分开'],['§10 源码索引','3.10','完整路径 / 函数 / 编号保留']])
for j in range(0,len(mapping),7):body+=table([['原功能','新位置','主题']]+mapping[j:j+7])
body+='<p><b>原文阅读问题：</b>结论与技术证据交织；长表与连续长段落增加定位成本；实现与验证分散。本版用三层目录、统一功能卡、独立风险 / 决策卡和图片流程拆开阅读负担。</p><p><b>维护约束：</b>本版以本地 implementation-review.md 为事实底稿；后续源码变更须重新审查，不能只修改图示状态。所有图示是原事实的阅读辅助，细节与异常以第三层为准。</p>'
add('3.11 章节映射与文档维护',body)
(out/'chunks.json').write_text(json.dumps(chunks,ensure_ascii=False,indent=2));(out/'skeleton.xml').write_text('<title>预览｜自由人联合体 · 系统实现图解与审查</title>'+''.join(f'<h{x["level"]}>{e(x["title"])}</h{x["level"]}>' for x in chunks))
(out/'document.xml').write_text('<title>自由人联合体 · 系统实现图解与审查</title>'+''.join(f'<h{x["level"]}>{e(x["title"])}</h{x["level"]}>'+x['xml'] for x in chunks))
(out/'manifest.json').write_text(json.dumps({'source':str(root/'docs/implementation-review.md'),'sha256':hashlib.sha256(src.encode()).hexdigest(),'risk_count':len(risks),'decision_count':len(decs),'diagrams':diagrams,'mapping':mapping,'sections':len(chunks)},ensure_ascii=False,indent=2))
print(json.dumps({'sections':len(chunks),'diagrams':len(diagrams),'risks':len(risks),'decisions':len(decs),'xml_chars':len((out/'document.xml').read_text())}))
