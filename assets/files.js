(function(root){
 'use strict';
 const MAX_FILE=2*1024*1024,MAX_ENTRY=2*1024*1024,MAX_TEXT=200000;
 function zipDocument(bytes){
   if(!(bytes instanceof Uint8Array)||bytes.length>MAX_FILE||bytes.length<22)throw Error('DOCX 大小不符合要求（最大 2MB）');
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);
   let end=-1;
   for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
   if(end<0||u16(end+4)||u16(end+6))throw Error('不支持分卷或损坏的 DOCX');
   const count=u16(end+10),cdSize=u32(end+12),cdStart=u32(end+16);
   if(count!==u16(end+8)||count>128||!count||cdStart+cdSize!==end)throw Error('DOCX 条目数量或目录异常');
   const names=new Set();let pos=cdStart,total=0,target=null;
   const decoder=new TextDecoder('utf-8',{fatal:true});
   for(let i=0;i<count;i++){
     if(pos+46>end||u32(pos)!==0x02014b50)throw Error('DOCX 目录损坏');
     const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),compressed=u32(pos+20),size=u32(pos+24),nl=u16(pos+28),el=u16(pos+30),cl=u16(pos+32),offset=u32(pos+42);
     if(pos+46+nl+el+cl>end)throw Error('DOCX 条目越界');
     const name=decoder.decode(bytes.subarray(pos+46,pos+46+nl));
     if(!name||name.includes('..')||name.includes('\\')||name.startsWith('/')||name.includes('\0')||names.has(name))throw Error('DOCX 包含不安全或重复路径');
     names.add(name);total+=size;
     if(flags&1||![0,8].includes(method)||size>MAX_ENTRY||total>12*1024*1024||(compressed===0&&size>0)||(compressed>0&&size/compressed>120))throw Error('DOCX 压缩方式或解压配额不符合要求');
     if(/vbaProject|^word\/embeddings\//i.test(name))throw Error('不接受含宏或嵌入对象的文档');
     if(offset+30>cdStart||u32(offset)!==0x04034b50||u16(offset+8)!==method||(u16(offset+6)&1))throw Error('DOCX 本地条目异常');
     const lnl=u16(offset+26),lel=u16(offset+28),start=offset+30+lnl+lel;
     if(start+compressed>cdStart||decoder.decode(bytes.subarray(offset+30,offset+30+lnl))!==name)throw Error('DOCX 条目位置异常');
     if(name==='word/document.xml')target={method,size,crc,data:bytes.subarray(start,start+compressed)};
     pos+=46+nl+el+cl;
   }
   if(pos!==end||!target)throw Error('没有找到 Word 正文');
   const chunks=[];let length=0;
   const accept=chunk=>{length+=chunk.length;if(length>MAX_ENTRY||length>target.size)throw Error('DOCX 实际展开大小超限');chunks.push(chunk.slice());};
   if(target.method===0)accept(target.data);else{
     const inflater=new root.fflate.Inflate(chunk=>accept(chunk));
     for(let i=0;i<target.data.length;i+=256)inflater.push(target.data.subarray(i,Math.min(i+256,target.data.length)),i+256>=target.data.length);
   }
   if(length!==target.size)throw Error('DOCX 展开长度不一致');
   const out=new Uint8Array(length);let cursor=0;for(const c of chunks){out.set(c,cursor);cursor+=c.length;}
   let crc=0xffffffff;for(const byte of out){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}if(((crc^0xffffffff)>>>0)!==target.crc)throw Error('DOCX 正文校验失败');
   return decoder.decode(out);
 }
 async function readDocument(file){
   if(!file||file.size>MAX_FILE)throw Error('文件最大为 2MB');
   const ext=file.name.split('.').pop().toLowerCase();
   if(!['txt','md','docx'].includes(ext))throw Error('仅支持 TXT、Markdown 和无宏 DOCX；PDF 请先转为文本');
   let text;
   if(ext==='docx'){
     const xml=zipDocument(new Uint8Array(await file.arrayBuffer()));
     if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('文档包含不允许的 XML 声明');
     const doc=new DOMParser().parseFromString(xml,'application/xml');
     if(doc.getElementsByTagName('parsererror').length)throw Error('Word 正文 XML 损坏');
     const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
     const walker=doc.createTreeWalker(doc,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT),parts=[];let node,visited=0,length=0;
     while((node=walker.nextNode())){
       if(++visited>20000)throw Error('Word 正文 XML 节点数量超限');
       let depth=0;for(let parent=node.parentNode;parent;parent=parent.parentNode)if(++depth>64)throw Error('Word 正文 XML 嵌套过深');
       if(node.nodeType===1&&node.namespaceURI===ns&&node.localName==='p')parts.push('\n');
       if(node.nodeType===3&&node.parentNode.localName==='t'&&[ns,'http://schemas.openxmlformats.org/officeDocument/2006/math'].includes(node.parentNode.namespaceURI)){
         length+=node.nodeValue.length;if(length>MAX_TEXT)throw Error('正文超过 20 万字限制');parts.push(node.nodeValue);
       }
     }
     text=parts.join('');
   }else text=await file.text();
   if(text.length>MAX_TEXT)throw Error('正文超过 20 万字限制');
   return text.replace(/\u0000/g,'');
 }
 const api={MAX_FILE,zipDocument,readDocument};root.CourseFiles=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
