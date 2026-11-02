'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const enc = new TextEncoder();
const templateNames = {white:'白底商品图',scene:'北欧生活场景',social:'社媒品牌卡片'};
const dimensions = {'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920]};
const localHost = ['localhost','127.0.0.1'].includes(location.hostname);
const state = {jobs:[],brand:{name:'Moss & Cotton',collection:'Everyday softness',color:'#627462',description:$('#brand-description').value,constraints:$('#brand-constraints').value,version:1},filter:'all',busy:false,current:null,video:null,videoCancel:false,source:'assets/product-sage.png',sourceKind:'AI生成的虚构产品',productImage:null,background:null,lifestyle:null};
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
let toastTimer;
function toast(message){ $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300); }
function imageLoad(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('素材载入失败，请刷新页面重试。'));img.src=src;});}
function productInput(){return {name:$('#product-name').value.trim(),sku:$('#product-sku').value.trim(),caption:$('#product-caption').value.trim(),source_kind:state.sourceKind};}
function selected(name){return $$(`input[name="${name}"]:checked`).map(el=>el.value);}
function updateExpected(){const n=selected('template').length*selected('ratio').length;$('#expected-count').textContent=`将生成 ${n} 张素材`;if(!state.busy&&state.productImage)$('#generate').disabled=n===0;}
function showView(view){if(!['studio','library','brand','guide'].includes(view))return;$$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));$$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));$('#breadcrumb').innerHTML='工作台 <span>/</span> '+({studio:'素材生产',library:'审核与素材库',brand:'品牌规范',guide:'样例说明'}[view]);if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);window.scrollTo({top:0});}
function getRules(input){const texts=[{id:'visual-v1',title:'视觉规则',text:state.brand.description},{id:'product-v1',title:'商品一致性',text:state.brand.constraints}];const query=[input.name,input.sku,input.caption].join(' ');return texts.map(t=>({...t,method:'local-keyword-and-required-rule',query,required:true}));}
function buildPrompt(template,input,rules){return `Brand: ${state.brand.name}\nCollection: ${state.brand.collection}\nProduct: ${input.name}\nSKU: ${input.sku}\nTemplate: ${templateNames[template]}\nCaption: ${input.caption}\nConstraints:\n${rules.map(r=>`[${r.id}] ${r.text}`).join('\n')}\nPreserve the supplied product pixels. Do not invent color, weave, certification, health or safety claims.\nThis prompt is an exportable specification; this browser run uses deterministic composition, not a live model request.`;}
function cover(ctx,img,x,y,w,h){const scale=Math.max(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function contain(ctx,img,cx,cy,w,h){const scale=Math.min(w/img.width,h/img.height);ctx.drawImage(img,cx-img.width*scale/2,cy-img.height*scale/2,img.width*scale,img.height*scale);}
function fittedText(ctx,text,x,y,maxWidth,size,family,color){ctx.fillStyle=color;ctx.font=`${size}px ${family}`;while(ctx.measureText(text).width>maxWidth&&size>16){size-=1;ctx.font=`${size}px ${family}`;}ctx.fillText(text,x,y);}
async function compose(template,ratio,input,brand,attempt=0){
  const [w,h]=dimensions[ratio],canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
  const serif='Georgia, "Times New Roman", serif',sans='-apple-system, "PingFang SC", Arial, sans-serif';const pad=72;
  ctx.fillStyle=template==='white'?'#fff':'#f4f1e8';ctx.fillRect(0,0,w,h);
  if(template==='white'){
    contain(ctx,state.productImage,w/2,h*.48,w*.78*(attempt%2?.92:1),h*.64);
    ctx.fillStyle='#e7e9e1';ctx.fillRect(pad,h-190,w-pad*2,1);
    fittedText(ctx,input.name,pad,h-124,w-300,34,sans,'#354236');
    fittedText(ctx,brand.name,pad,h-76,w-pad*2,25,serif,brand.color);
    ctx.font=`20px ${sans}`;ctx.textAlign='right';ctx.fillStyle='#8c9488';ctx.fillText(ratio,w-pad,h-124);ctx.textAlign='left';
  }else if(template==='scene'){
    if(state.sourceKind==='AI生成的虚构产品'&&state.lifestyle){
      const inset=attempt%2?-w*.015:0;cover(ctx,state.lifestyle,inset,inset,w-inset*2,h-inset*2);
    }else{
      cover(ctx,state.background,0,0,w,h);
      const productWidth=w*(attempt%2?.56:.60),productHeight=productWidth;
      const productCenterY=h*.66-productWidth*.345;
      ctx.save();ctx.shadowColor='#26351d25';ctx.shadowBlur=18;ctx.shadowOffsetY=12;contain(ctx,state.productImage,w*.47,productCenterY,productWidth,productHeight);ctx.restore();
    }
    fittedText(ctx,brand.name,pad,110,w-pad*2,36,serif,'#354334');
    fittedText(ctx,brand.collection,pad,165,w-pad*2,27,serif,'#68775f');
    ctx.fillStyle='#f5f3ebeb';ctx.fillRect(0,h-130,w,130);fittedText(ctx,input.caption||input.name,pad,h-74,w-pad*2,29,serif,'#40543d');
  }else{
    ctx.fillStyle=brand.color;ctx.fillRect(0,h*.70,w,h*.30);
    fittedText(ctx,brand.name,pad,110,w-pad*2,36,serif,'#364631');
    ctx.font=`19px ${sans}`;ctx.fillStyle='#7e8d70';ctx.fillText('THE EVERYDAY COLLECTION',pad,155);
    contain(ctx,state.productImage,w/2,h*.425,w*.84*(attempt%2?.94:1),h*.53);
    fittedText(ctx,brand.collection,pad,h*.79,w-pad*2,52,serif,'#fffdf5');
    fittedText(ctx,input.caption||input.name,pad,h*.855,w-pad*2,28,serif,'#f2f4e9');
    ctx.fillStyle='#d7e0cf';ctx.font=`18px ${sans}`;ctx.fillText(input.sku,pad,h-48);
  }
  ctx.save();ctx.textAlign='right';ctx.font=`14px ${sans}`;ctx.fillStyle=template==='social'?'#dfe7d9':'#7d8576';ctx.fillText('FICTIONAL PRODUCT · WORKFLOW SAMPLE',w-25,h-19);ctx.restore();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片导出失败，请减少尺寸后重试。');
  return {blob,url:URL.createObjectURL(blob),width:w,height:h,canvas};
}
async function localSave(name,blob){if(!localHost||location.port!=='4189')return;try{const r=await fetch(`/api/local-save?name=${encodeURIComponent(name)}`,{method:'POST',body:blob,headers:{'Content-Type':blob.type||'application/octet-stream'}});if(!r.ok)console.info('Local save unavailable',r.status);}catch(e){console.info('Local save skipped',e.message);}}
async function runBatch(){
  if(state.busy)return;const input=productInput(),templates=selected('template'),ratios=selected('ratio');
  if(!input.name||!input.sku){toast('请填写产品名称和 SKU。');return;}
  if(!templates.length||!ratios.length){toast('请至少选择一种模板和一种尺寸。');return;}
  state.busy=true;$('#generate').disabled=true;$('#generate').textContent='正在合成…';const start=performance.now();
  try{
    for(const template of templates)for(const ratio of ratios){
      const job={id:`MC-${Date.now()}-${state.jobs.length+1}`,template,ratio,input:{...input},brand:structuredClone(state.brand),rules:getRules(input),status:'rendering',created_at:new Date().toISOString(),attempt:0,reason:''};job.prompt=buildPrompt(template,input,job.rules);state.jobs.push(job);renderJobs();await tick();
      try{const output=await compose(template,ratio,job.input,job.brand);Object.assign(job,output);job.status='pending';job.elapsed_ms=Math.round(performance.now()-start);job.filename=`${input.sku.replace(/[^a-zA-Z0-9_-]/g,'_')}-${template}-${ratio.replace(':','x')}.png`;await localSave(job.filename,job.blob);}catch(e){job.status='failed';job.reason=e.message;}
      renderJobs();await tick();
    }
    $('#flow-compose').classList.add('done');$('#flow-review').classList.add('done');toast('素材已实际生成，请逐张审核后交付。');
  }finally{state.busy=false;$('#generate').textContent='生成素材 ↗';updateExpected();renderJobs();}
}
function cardHTML(job){const labels={rendering:'合成中',pending:'待审核',approved:'已通过',rejected:'已退回',failed:'生成失败'};return `<article class="asset-card"><button class="asset-image-button" data-action="preview" data-id="${job.id}" aria-label="预览${escapeHTML(templateNames[job.template])} ${job.ratio}" ${!job.url?'disabled':''}>${job.url?`<img src="${job.url}" alt="${escapeHTML(job.input.name)} ${escapeHTML(templateNames[job.template])}">`:'<span>正在合成素材…</span>'}<span class="asset-state ${job.status}">${labels[job.status]}</span></button><div class="asset-card-info"><h3>${templateNames[job.template]}<span>${job.ratio}</span></h3><p>${job.width?`${job.width} × ${job.height} · `:''}${escapeHTML(job.input.sku)}</p>${job.reason?`<p>返工：${escapeHTML(job.reason)}</p>`:''}<div class="card-actions">${job.status==='pending'?`<button data-action="approve" data-id="${job.id}">通过</button><button data-action="reject" data-id="${job.id}">退回</button>`:''}${['rejected','failed'].includes(job.status)?`<button data-action="retry" data-id="${job.id}">重做这张</button>`:''}${job.url?`<button class="download" data-action="download" data-id="${job.id}">PNG ↓</button>`:''}</div></div></article>`;}
function renderJobs(){
  const counts={all:state.jobs.length,pending:0,approved:0,rejected:0};state.jobs.forEach(j=>{if(j.status in counts)counts[j.status]++;});
  $('#job-count').textContent=counts.all;$('#nav-count').textContent=counts.pending;$('#job-summary').textContent=counts.all?`${counts.all} 个任务 · ${counts.pending} 张待审核 · ${counts.approved} 张已通过`:'准备好后，生成第一组素材。';
  $('#studio-results').innerHTML=state.jobs.slice(-6).map(cardHTML).join('');$('#empty-state').hidden=counts.all>0;
  const filtered=state.jobs.filter(j=>state.filter==='all'||j.status===state.filter);$('#library-results').innerHTML=filtered.map(cardHTML).join('');$('#library-empty').hidden=filtered.length>0;$('#library-empty').textContent=counts.all?'当前筛选下没有素材。':'还没有素材，请先到「素材生产」生成一组。';
  for(const key of Object.keys(counts))$(`#count-${key}`).textContent=counts[key];$('#approve-all').disabled=counts.pending===0;$('#export-package').disabled=counts.approved===0;$('#make-video').disabled=counts.approved<3||!!state.recorder;
  if(!state.recorder&&!state.video)$('#video-progress').textContent=counts.approved<3?'至少通过 3 张图片后可制作。':'已具备 3 张审核图片，可开始制作 15 秒短片。';
}
function approve(job){if(job.status!=='pending'&&job.status!=='rejected')return;job.status='approved';job.reviewed_at=new Date().toISOString();job.reason='';renderJobs();}
function openPreview(job){state.current=job.id;$('#preview-image').src=job.url;$('#preview-title').textContent=templateNames[job.template];$('#preview-meta').textContent=`${job.input.name} · ${job.ratio} · ${job.width} × ${job.height}`;$('#preview-record').textContent=JSON.stringify(jobRecord(job),null,2);$('#preview-approve').disabled=job.status==='approved';$('#preview-dialog').showModal();}
function openReject(job){state.current=job.id;if($('#preview-dialog').open)$('#preview-dialog').close();$('#reject-reason').value=job.reason||'';$('#reject-dialog').showModal();$('#reject-reason').focus();}
async function retry(job){if(state.busy)return;state.busy=true;job.status='rendering';renderJobs();await tick();try{const output=await compose(job.template,job.ratio,job.input,job.brand,++job.attempt);if(job.url)URL.revokeObjectURL(job.url);Object.assign(job,output);job.status='pending';job.reason='重新合成完成，请再次审核';await localSave(job.filename,job.blob);toast('已重做这张素材；构图有调整，仍需人工确认。');}catch(e){job.status='failed';job.reason=e.message;}finally{state.busy=false;renderJobs();}}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function jobRecord(job){return {id:job.id,template:job.template,ratio:job.ratio,width:job.width,height:job.height,filename:job.filename,status:job.status,created_at:job.created_at,reviewed_at:job.reviewed_at||null,attempt:job.attempt,input:job.input,brand_version:job.brand.version,rules:job.rules,prompt:job.prompt,engine:job.template==='scene'&&job.input.source_kind==='AI生成的虚构产品'?'pre-generated-AI-reference-scene-with-canvas-branding':'browser-canvas-deterministic-composition',source_prompt_file:'assets/source-prompts.json',live_model_called:false,reason:job.reason};}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
async function zipFiles(files){const parts=[],central=[];let offset=0;const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();for(const file of files){const name=enc.encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(data);const lh=new Uint8Array(30+name.length),v=new DataView(lh.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);lh.set(name,30);parts.push(lh,data);const ch=new Uint8Array(46+name.length),c=new DataView(ch.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,dosTime,true);c.setUint16(14,dosDate,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length+data.length;}
  const centralSize=central.reduce((sum,c)=>sum+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
function storyboard(){return {type:'still-image-motion-edit',duration_seconds:15,audio:false,live_video_model_called:false,shots:[{order:1,seconds:5,template:'white',motion:'gentle-push-in'},{order:2,seconds:5,template:'scene',motion:'gentle-push-in'},{order:3,seconds:5,template:'social',motion:'gentle-push-in'}]};}
async function exportPackage(){const jobs=state.jobs.filter(j=>j.status==='approved');if(!jobs.length)return;const button=$('#export-package');button.disabled=true;button.textContent='正在打包…';try{const files=jobs.map((j,i)=>({name:`images/${i+1}-${j.filename}`,blob:j.blob}));const asJSON=obj=>new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});files.push({name:'manifest.json',blob:asJSON({created_at:new Date().toISOString(),fictional_brand:true,engine:'browser-local',approved_count:jobs.length,jobs:jobs.map(jobRecord)})},{name:'brand.json',blob:asJSON(state.brand)},{name:'storyboard.json',blob:asJSON(storyboard())},{name:'prompts.txt',blob:new Blob([jobs.map(j=>`${j.id}\n${j.prompt}`).join('\n\n')],{type:'text/plain'})},{name:'README.txt',blob:new Blob(['Moss & Cotton workflow sample. Fictional product.\nAI product and background images were pre-generated. Batch images are browser Canvas compositions. Video is a local still-image motion edit, not generative video. Review all assets before any commercial use.\n'],{type:'text/plain'})});if(state.video)files.push({name:`video/${state.video.filename}`,blob:state.video.blob});const blob=await zipFiles(files);await localSave('moss-cotton-approved-assets.zip',blob);download(blob,'moss-cotton-approved-assets.zip');$('#flow-deliver').classList.add('done');toast(`已打包 ${jobs.length} 张已通过图片及生成记录。`);}catch(e){toast('导出失败：'+e.message);}finally{button.textContent='导出已通过素材包 ↓';renderJobs();}}
async function makeVideo(){
  const approved=state.jobs.filter(j=>j.status==='approved');if(approved.length<3)return;
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toast('当前浏览器不支持本地视频制作，可下载已附的 MP4 样片。');return;}
  const selectedJobs=Object.keys(templateNames).map(t=>approved.find(j=>j.template===t&&j.ratio==='4:5')||approved.find(j=>j.template===t)).filter(Boolean);while(selectedJobs.length<3)selectedJobs.push(approved[selectedJobs.length%approved.length]);
  const images=await Promise.all(selectedJobs.slice(0,3).map(j=>imageLoad(j.url)));const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d');
  const mime=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){toast('此浏览器缺少可用的视频编码器，请下载 MP4 样片。');return;}
  const stream=canvas.captureStream(24),chunks=[];let recorder;
  try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});}catch(e){stream.getTracks().forEach(t=>t.stop());toast('视频编码器无法启动：'+e.message);return;}
  state.recorder=recorder;state.videoCancel=false;$('#cancel-video').hidden=false;$('#make-video').textContent='正在制作…';renderJobs();
  try{
    await new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=e=>reject(e.error||new Error('视频编码失败'));recorder.onstop=resolve;recorder.start(500);const start=performance.now();function draw(now){const elapsed=(now-start)/1000;if(state.videoCancel||elapsed>=15){recorder.stop();return;}const index=Math.min(2,Math.floor(elapsed/5)),phase=(elapsed%5)/5;ctx.fillStyle='#f4f1e8';ctx.fillRect(0,0,720,1280);const zoom=1+phase*.035;const iw=720*zoom,ih=images[index].height/images[index].width*iw;ctx.drawImage(images[index],(720-iw)/2,((1280-ih)/2)-15,iw,ih);ctx.fillStyle='#f4f1e8';ctx.fillRect(0,0,720,106);ctx.fillRect(0,1180,720,100);ctx.fillStyle='#435d41';ctx.font='25px Georgia,serif';ctx.fillText(state.brand.name,40,63);ctx.font='15px Arial,sans-serif';ctx.fillStyle='#7d8974';ctx.fillText(`WORKFLOW SAMPLE  /  ${index+1} OF 3`,40,1237);$('#video-progress').textContent=`正在录制镜头 ${index+1}/3 · ${Math.floor(elapsed)} / 15 秒`;requestAnimationFrame(draw);}requestAnimationFrame(draw);});
    if(state.videoCancel){toast('已取消视频制作，审核图片仍保留。');return;}
    const extension=mime.includes('mp4')?'mp4':'webm',blob=new Blob(chunks,{type:mime});if(state.video)URL.revokeObjectURL(state.video.url);state.video={blob,url:URL.createObjectURL(blob),filename:`moss-cotton-motion-sample.${extension}`};await localSave(state.video.filename,blob);const player=$('#video-player');player.src=state.video.url;player.hidden=false;$('#video-placeholder').hidden=true;const dl=$('#download-video');dl.href=state.video.url;dl.download=state.video.filename;dl.hidden=false;$('#video-progress').textContent=`视频已生成 · 720 × 1280 · 15 秒 · ${extension.toUpperCase()} · 无声`;toast('15 秒样片已生成，可播放或下载。');
  }catch(e){toast('视频制作失败：'+e.message);$('#video-progress').textContent='制作失败，可重试或下载已有样片。';}finally{stream.getTracks().forEach(t=>t.stop());state.recorder=null;$('#cancel-video').hidden=true;$('#make-video').textContent='制作 15 秒视频 ↗';renderJobs();}
}
document.addEventListener('click',e=>{const view=e.target.closest('[data-view]');if(view){showView(view.dataset.view);return;}const brand=e.target.closest('[data-open-brand]');if(brand){showView('brand');return;}const action=e.target.closest('[data-action]');if(action){const job=state.jobs.find(j=>j.id===action.dataset.id);if(!job)return;({preview:()=>openPreview(job),approve:()=>approve(job),reject:()=>openReject(job),download:()=>download(job.blob,job.filename),retry:()=>retry(job)})[action.dataset.action]?.();}});
$$('input[name=template],input[name=ratio]').forEach(el=>el.addEventListener('change',updateExpected));
$('#generate').addEventListener('click',runBatch);$('#approve-all').addEventListener('click',()=>{state.jobs.filter(j=>j.status==='pending').forEach(approve);toast('待审图片已通过，请确认已完成逐张检查。');});$('#export-package').addEventListener('click',exportPackage);$('#make-video').addEventListener('click',makeVideo);$('#cancel-video').addEventListener('click',()=>{state.videoCancel=true;});
$$('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('selected',b===btn));renderJobs();}));
$('.dialog-close').addEventListener('click',()=>$('#preview-dialog').close());$('#preview-approve').addEventListener('click',()=>{const j=state.jobs.find(j=>j.id===state.current);if(j)approve(j);$('#preview-dialog').close();});$('#preview-reject').addEventListener('click',()=>{const j=state.jobs.find(j=>j.id===state.current);if(j)openReject(j);});$('#preview-download').addEventListener('click',()=>{const j=state.jobs.find(j=>j.id===state.current);if(j)download(j.blob,j.filename);});$('#reject-cancel').addEventListener('click',()=>$('#reject-dialog').close());$('#reject-confirm').addEventListener('click',()=>{const job=state.jobs.find(j=>j.id===state.current);if(job){job.status='rejected';job.reason=$('#reject-reason').value.trim()||'请重新检查构图与文案';renderJobs();}$('#reject-dialog').close();});
$('#save-brand').addEventListener('click',()=>{const name=$('#brand-name').value.trim(),collection=$('#brand-collection').value.trim();if(!name||!collection){toast('请填写品牌名称和系列名称。');return;}state.brand={name,collection,color:$('#brand-color').value,description:$('#brand-description').value.trim(),constraints:$('#brand-constraints').value.trim(),version:state.brand.version+1};$('.rule-match strong').textContent=`已匹配品牌规范 v${state.brand.version}`;$('#matched-rules').textContent=state.brand.description;toast('品牌规范已应用，新生成素材将使用此版本。');});$('#export-brand').addEventListener('click',()=>download(new Blob([JSON.stringify(state.brand,null,2)],{type:'application/json'}),'moss-cotton-brand.json'));
$('#product-upload').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>6*1024*1024){toast('请上传不超过 6 MB 的图片。');return;}if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('请上传 PNG、JPEG 或 WebP。');return;}const url=URL.createObjectURL(file);try{state.productImage=await imageLoad(url);state.source=url;state.sourceKind='用户上传原图';$('#source-image').src=url;$('.photo-label').textContent='已上传产品原图';toast('产品原图已替换，后续素材将使用新图片。');}catch(err){URL.revokeObjectURL(url);toast(err.message);}});
$('#load-example').addEventListener('click',async()=>{if(state.busy||state.recorder){toast('请等待当前任务完成。');return;}state.source='assets/product-sage.png';state.sourceKind='AI生成的虚构产品';state.productImage=await imageLoad(state.source);$('#source-image').src=state.source;$('.photo-label').textContent='示例产品原图 · AI 生成';$('#product-name').value='棉纱日常毯';$('#product-sku').value='MC-MUSLIN-SAGE-01';$('#product-caption').value='Soft texture. Quiet moments.';toast('已恢复示例产品。');});
window.addEventListener('hashchange',()=>showView(location.hash.slice(1)||'studio'));
async function init(){showView(location.hash.slice(1)||'studio');try{[state.productImage,state.background,state.lifestyle]=await Promise.all([imageLoad(state.source),imageLoad('assets/nordic-room.png'),imageLoad('assets/lifestyle-scene.png')]);$('#generate').textContent='生成素材 ↗';updateExpected();}catch(e){$('#generate').textContent='素材载入失败';toast(e.message);}try{const r=await fetch('assets/sample-video.mp4',{method:'HEAD'});if(r.ok&&r.headers.get('Content-Type')?.includes('video')){$('#side-video').hidden=false;$('#download-sample').hidden=false;}}catch{}renderJobs();}
init();
