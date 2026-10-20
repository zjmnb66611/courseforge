(function(root){
 'use strict';
 const X=s=>root.CourseCore.escapeXML(s), fmt=(n,d=4)=>Number(n.toFixed(d)).toString();
 function sections(result,projectName='简支梁课程设计教学报告'){
  const p=result.input;
  return [
   {title:projectName,body:'教学计算记录 · 课设工坊 1.0\n数据来源：用户在本地确认的输入；示例数据需以实际任务书替换。'},
   {title:'任务与模型',body:result.scope},
   {title:'输入参数',body:Object.entries(root.CourseCore.SPECS).map(([k,s])=>`${s[0]} ${k} = ${fmt(p[k])} ${s[1]}`).join('\n')},
   {title:'计算过程',body:`统一单位后计算 I = bh³/12 = ${fmt(result.I,8)} m⁴，EI = ${fmt(result.EI)} kN·m²。\n由整体平衡得 RA = qL/2 + P(L−a)/L = ${fmt(result.RA)} kN；RB = qL/2 + Pa/L = ${fmt(result.RB)} kN。\nM(x) = RA·x − qx²/2 − P·max(0,x−a)。最大弯矩 ${fmt(result.Mmax)} kN·m，位置 x = ${fmt(result.xM)} m。\n线弹性叠加计算最大向下挠度 ${fmt(result.dmax)} mm，位置 x = ${fmt(result.xD)} m。\n截面边缘弹性弯曲应力 σ = Mh/(2I) = ${fmt(result.stress)} MPa。`},
   {title:'复核记录',body:`竖向平衡残差 RA + RB − qL − P = ${result.equilibriumResidual.toExponential(3)} kN。\n两个端部的弯矩与挠度满足当前模型边界。极值采用分段候选点及挠度斜率求根，显示数值经四舍五入。\n本版未自行添加自重、荷载分项系数或材料强度限值。`},
   {title:'结论与适用范围',body:'已完成所列简支线弹性梁的内力、挠度和边缘弹性应力计算。结论仅限该模型。尚未进行配筋、稳定、裂缝、耐久性、构造及规范合规验算；本报告不提供工程承载安全结论。'},
   {title:'参考来源',body:'[1] SymPy Beam 文档 https://docs.sympy.org/latest/modules/physics/continuum_mechanics/beam.html\n[2] SymPy 梁计算示例 https://docs.sympy.org/latest/tutorials/physics/continuum_mechanics/beam_problems.html\n本报告公式由本项目独立实现；SymPy 用于开发阶段独立复核，未在页面中伪装为在线计算。'}
  ];
 }
 function docx(result,pngData=null){
  const paras=[];
  const para=(text,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${String(text).split('\n').map((line,i)=>(i?'<w:r><w:br/></w:r>':'')+`<w:r><w:t xml:space="preserve">${X(line)}</w:t></w:r>`).join('')}</w:p>`;
  const mr=t=>`<m:r><m:t>${X(t)}</m:t></m:r>`,frac=(n,d)=>`<m:f><m:num>${mr(n)}</m:num><m:den>${mr(d)}</m:den></m:f>`;
  const equation=s=>`<w:p><m:oMathPara><m:oMath>${s}</m:oMath></m:oMathPara></w:p>`;
  for(const [i,s] of sections(result).entries()){
   paras.push(para(s.title,i===0?'Title':'Heading1'),para(s.body));
   if(s.title==='计算过程'){
    paras.push(equation(mr('I = ')+frac('bh³','12')));
    paras.push(equation(mr('RA = ')+frac('qL','2')+mr(' + ')+frac('P(L−a)','L')));
    paras.push(equation(mr('M(x) = RA·x − ')+frac('qx²','2')+mr(' − P·max(0,x−a)')));
    paras.push(equation(mr('δq(x) = ')+frac('qx(L³−2Lx²+x³)','24EI')));
    paras.push(equation(mr('δP(x≤a) = ')+frac('P(L−a)x[L²−(L−a)²−x²]','6LEI')));
    paras.push(equation(mr('δP(x≥a) = ')+frac('Pa(L−x)[L²−a²−(L−x)²]','6LEI')));
   }
  }
  const tableRows=[['位置 x / m','剪力 V / kN','弯矩 M / kN·m','向下挠度 / mm'],...result.sample.filter((_,i)=>i%20===0).map(s=>[fmt(s.x),fmt(s.V),fmt(s.M),fmt(s.d)])];
  const cell=t=>`<w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>${para(t)}</w:tc>`;
  paras.push(para('附表 计算采样记录','Heading1'),`<w:tbl><w:tblPr><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(t=>`<w:${t} w:val="single" w:sz="4" w:color="D9D9D9"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${tableRows[0].map(()=>'<w:gridCol w:w="2200"/>').join('')}</w:tblGrid>${tableRows.map(row=>`<w:tr>${row.map(cell).join('')}</w:tr>`).join('')}</w:tbl>`);
  const files={};let hasImage=false;
  if(pngData&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(pngData)&&pngData.length<2000000){
   const raw=atob(pngData.split(',')[1]);files['word/media/chart.png']=Uint8Array.from(raw,c=>c.charCodeAt(0));hasImage=true;
   paras.push(para('附图 计算结果图','Heading1'),'<w:p><w:r><w:drawing><wp:inline><wp:extent cx="5486400" cy="2377440"/><wp:docPr id="1" name="简支梁结果图" descr="梁荷载与弯矩图"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="chart.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5486400" cy="2377440"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');
  }
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${paras.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:bottom="1134" w:left="1417" w:right="1417"/></w:sectPr></w:body></w:document>`;
  const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const styles='<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="宋体"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="280"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="000000"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="000000"/></w:rPr></w:style></w:styles>';
  const enc=s=>root.fflate.strToU8(s);
  files['[Content_Types].xml']=enc(types);
  files['_rels/.rels']=enc('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  files['word/document.xml']=enc(doc);files['word/styles.xml']=enc(styles);
  files['word/_rels/document.xml.rels']=enc('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+(hasImage?'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>':'')+'</Relationships>');
  return root.fflate.zipSync(files,{level:6});
 }
 root.CourseReport={sections,docx};
})(typeof globalThis!=='undefined'?globalThis:this);
