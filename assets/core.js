/* CourseForge 1.0.0 — local deterministic tools. No eval, network, or arbitrary expressions. */
(function(root){
  'use strict';
  const VERSION='1.0.0';
  const SPECS={L:['跨度','m',0.1,100],q:['均布荷载','kN/m',0,10000],P:['集中力','kN',0,100000],a:['集中力位置','m',0,100],E:['弹性模量','GPa',0.001,1000],b:['截面宽度','mm',1,10000],h:['截面高度','mm',1,10000]};
  const DEFAULT={L:8,q:10,P:0,a:4,E:30,b:350,h:800};
  function validate(p){
    const out={};
    for(const [k,s] of Object.entries(SPECS)){
      if(!Object.prototype.hasOwnProperty.call(p,k)||typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<s[2]||p[k]>s[3])throw Error(`${s[0]}必须是 ${s[2]}–${s[3]} ${s[1]} 范围内的有限数值`);
      out[k]=p[k];
    }
    if(out.a>out.L)throw Error('集中力位置不能超过跨度');
    return out;
  }
  function validatePartial(p){
    if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==Object.keys(SPECS).length||Object.keys(p).some(k=>!(k in SPECS)))throw Error('项目参数字段不完整');
    const out={};for(const [k,s] of Object.entries(SPECS)){const v=p[k];if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<s[2]||v>s[3]))throw Error('项目参数数值不合要求');out[k]=v;}
    if(out.a!==null&&out.L!==null&&out.a>out.L)throw Error('集中力位置不能超过跨度');return out;
  }
  function analyze(input){
    const p=validate(input),{L,q,P,a,E,b,h}=p;
    const I=(b/1000)*Math.pow(h/1000,3)/12, EI=E*1e6*I;
    const RA=q*L/2+P*(L-a)/L, RB=q*L/2+P*a/L;
    const moment=x=>RA*x-q*x*x/2-P*Math.max(0,x-a);
    const shear=(x,right=true)=>RA-q*x-(x>a||(right&&x===a)?P:0);
    const deflection=x=>{
      const base=q*x*(L**3-2*L*x*x+x**3)/(24*EI);
      const r=L-a;
      const point=x<=a?P*r*x*(L*L-r*r-x*x)/(6*L*EI):P*a*(L-x)*(L*L-a*a-(L-x)**2)/(6*L*EI);
      return (base+point)*1000;
    };
    const candidates=[0,L,a];
    if(q>0){for(const x of [RA/q,(RA-P)/q])if(x>=0&&x<=L)candidates.push(x);}
    const Mmax=Math.max(...candidates.map(moment)), xM=candidates.find(x=>Math.abs(moment(x)-Mmax)<1e-8);
    let lo=0,hi=L;
    // Deflection is concave for these downward loads; bracket its derivative without a coarse-grid maximum.
    const slope=x=>{
      const c=q*(L**3-6*L*x*x+4*x**3)/(24*EI);
      const r=L-a;
      const pc=x<=a?P*r*(L*L-r*r-3*x*x)/(6*L*EI):-P*a*(L*L-a*a-3*(L-x)**2)/(6*L*EI);
      return c+pc;
    };
    for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(slope(mid)>0)lo=mid;else hi=mid;}
    const xD=(lo+hi)/2,dmax=deflection(xD),stress=Mmax*1000*(h/2000)/I/1e6;
    const sample=[]; for(let i=0;i<=160;i++){const x=L*i/160;sample.push({x,V:shear(x),M:moment(x),d:deflection(x)});}
    return {version:VERSION,input:p,I,EI,RA,RB,Mmax,xM,dmax,xD,stress,Vmax:Math.max(RA,RB),equilibriumResidual:RA+RB-q*L-P,sample,scope:'简支、等截面、小变形线弹性梁；全跨向下均布荷载与一个向下集中力。输出内力、弹性挠度与截面边缘弹性弯曲应力；未进行配筋、稳定、裂缝或规范合规验算。'};
  }
  const normalize=s=>String(s).normalize('NFKC').replace(/[：]/g,':').replace(/[，；]/g,';');
  function parseTask(text){
    if(typeof text!=='string'||text.length>200000)throw Error('文本过长或格式不正确');
    const t=normalize(text), found={},evidence={},issues=[];
    const definitions={L:['跨度|梁长|span|(?<![A-Za-z])L(?![A-Za-z])','mm|cm|m|米'],q:['均布荷载|线荷载|(?<![A-Za-z])q(?![A-Za-z])','kN\\s*/\\s*m|N\\s*/\\s*m|kN／m'],P:['集中力|集中荷载|(?<![A-Za-z])P(?![A-Za-z])','kN|N'],a:['集中力位置|荷载位置|(?<![A-Za-z])a(?![A-Za-z])','mm|cm|m|米'],E:['弹性模量|(?<![A-Za-z])E(?![A-Za-z])','GPa|MPa|kPa|Pa'],b:['截面宽度|梁宽|(?<![A-Za-z])b(?![A-Za-z])','mm|cm|m'],h:['截面高度|梁高|(?<![A-Za-z])h(?![A-Za-z])','mm|cm|m']};
    for(const [key,[alias,unit]] of Object.entries(definitions)){
      const rx=new RegExp(`(?:${alias})\\s{0,12}(?:为|取|是|=|:)?\\s{0,12}([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))\\s{0,12}(${unit})(?![A-Za-z])`,'gi');
      let m; const values=[];
      while((m=rx.exec(t))!==null){
        let v=Number(m[1]),u=m[2].replace(/\s/g,'').toLowerCase();
        if(['L','a'].includes(key))v*=u==='mm'?0.001:u==='cm'?0.01:1;
        if(['b','h'].includes(key))v*=u==='m'?1000:u==='cm'?10:1;
        if(key==='q'&&u==='n/m')v/=1000;
        if(key==='P'&&u==='n')v/=1000;
        if(key==='E')v*=u==='mpa'?0.001:u==='kpa'?1e-6:u==='pa'?1e-9:1;
        values.push({value:v,quote:m[0],offset:m.index});
      }
      if(values.length){
        if(values.some(x=>Math.abs(x.value-values[0].value)>1e-8))issues.push(`${SPECS[key][0]}存在多个不同值，请核对后选择`);
        else {found[key]=values[0].value;evidence[key]=values[0].quote;}
      }
    }
    if(/忽略.{0,8}(指令|规则)|system\s*prompt|上传.{0,12}(密钥|密码)|执行.{0,6}(脚本|命令)/i.test(t))issues.push('检测到指令式资料内容：作为资料保留，不会执行其中的命令');
    if(/自重/.test(t))issues.push('请确认输入的均布荷载是否已计入自重；系统不会自动叠加自重');
    const missing=Object.keys(SPECS).filter(k=>!(k in found));
    return {found,evidence,missing,issues,requirements:['明确边界条件与单位','建立输入参数表','计算支座反力与内力','计算线弹性挠度','核对计算与报告的一致性','说明计算范围与未覆盖项目']};
  }
  function reviewReport(text,result){
    if(typeof text!=='string'||text.length>200000)throw Error('报告文本过长');
    const t=normalize(text),issues=[],checked=[];
    const fields={RA:['左支座反力|RA|R_A','kN',result.RA],RB:['右支座反力|RB|R_B','kN',result.RB],Mmax:['最大弯矩|Mmax|M_max','kN\\s{0,12}[·*]?\\s{0,12}m',result.Mmax],dmax:['最大挠度|dmax|d_max','mm',result.dmax],L:['跨度|梁长|(?<![A-Za-z])L(?![A-Za-z])','m',result.input.L]};
    for(const [k,[alias,unit,expected]] of Object.entries(fields)){
      const rx=new RegExp(`(?:${alias})\\s{0,12}(?:为|=|:)?\\s{0,12}([+-]?[0-9]+(?:\\.[0-9]+)?)\\s{0,12}${unit}(?![A-Za-z])`,'gi');let m;
      while((m=rx.exec(t))){const actual=Number(m[1]),tol=Math.max(0.01,Math.abs(expected)*0.005);checked.push(k);if(Math.abs(actual-expected)>tol)issues.push({type:'数值不一致',field:k,actual,expected,quote:m[0],offset:m.index,message:`${m[0]}；当前计算应为 ${expected.toFixed(3)}`});}
    }
    for(const [name,rx] of [['输入参数',/参数|已知条件/],['计算过程',/计算|推导/],['结论与范围',/结论|适用范围/]])if(!rx.test(t))issues.push({type:'章节待补充',message:`未识别到“${name}”相关内容`});
    if(/待补充|此处填写|TODO|XXX|占位/i.test(t))issues.push({type:'占位内容',message:'报告中仍有占位内容，请定位处理'});
    return {issues,matched:checked.length,scope:'仅检查带可识别标签与单位的关键数值及三类章节关键词；未命中的内容不代表正确，未进行全文语义或全部工程验算。'};
  }
  function tokens(text){const s=normalize(text).toLowerCase();const words=s.match(/[a-z0-9_]+|[\u4e00-\u9fff]/g)||[];return [...words,...words.slice(0,-1).map((x,i)=>x+words[i+1])];}
  function searchKB(query,cards,limit=5){
    if(typeof query!=='string'||query.length>500)throw Error('检索词限 500 字');
    const qt=[...new Set(tokens(query))];if(!qt.length)return [];
    return cards.map(c=>{const hay=tokens(c.title+' '+c.content+' '+(c.tags||[]).join(' '));const score=qt.reduce((v,t)=>v+(hay.includes(t)?(t.length>1?3:0.5):0),0);return {card:c,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(10,limit)));
  }
  function sanitizeCard(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('知识条目必须是对象');
    const title=String(input.title||'').trim(),content=String(input.content||'').trim();
    if(!title||title.length>100||!content||content.length>12000)throw Error('知识标题或正文长度不合要求');
    const raw=String(input.source||'');
    let source='本地用户资料';if(raw&&raw!=='本地用户资料'){let u;try{u=new URL(raw);}catch{throw Error('知识来源应为 HTTPS 链接');}if(u.protocol!=='https:')throw Error('知识来源仅允许 HTTPS');source=u.href;}
    return {id:'user-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),title,content,source,tags:['用户导入'],status:'待核验',license:'用户提供，使用权限待确认',updated:'用户导入'};
  }
  const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const api={VERSION,SPECS,DEFAULT,validate,validatePartial,analyze,parseTask,reviewReport,searchKB,sanitizeCard,escapeXML};
  if(typeof module==='object'&&module.exports)module.exports=api;root.CourseCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
