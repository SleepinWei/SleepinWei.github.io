'use strict';
const dialog=document.querySelector('#image-dialog');
let lastImageButton=null;
document.querySelectorAll('[data-image]').forEach(button=>{
  button.addEventListener('click',()=>{
    lastImageButton=button;
    const image=document.querySelector('#lightbox-image');
    image.src=button.dataset.image;
    image.alt=button.dataset.title+'，'+button.dataset.detail;
    document.querySelector('#lightbox-title').textContent=button.dataset.title;
    document.querySelector('#lightbox-detail').textContent=button.dataset.detail;
    document.querySelector('#lightbox-download').href=button.dataset.image;
    dialog.showModal();
  });
});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>lastImageButton?.focus());
dialog.addEventListener('click',event=>{
  if(event.target===dialog){
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
  }
});
const video=document.querySelector('#sample-video');
const status=document.querySelector('#video-status');
document.querySelectorAll('[data-seek]').forEach((button,index)=>button.addEventListener('click',async()=>{
  const seconds=Number(button.dataset.seek);
  const seek=()=>{video.currentTime=seconds;};
  if(video.readyState>=1)seek();else video.addEventListener('loadedmetadata',seek,{once:true});
  try{await video.play();status.textContent=`正在播放第 ${index+1} 个片段：${button.querySelector('strong').textContent}。`;}catch{status.textContent='请在播放器中点击播放，或下载 MP4 样片。';}
}));
video.addEventListener('error',()=>{status.textContent='视频暂时无法载入，可下载 MP4 样片查看。';});
video.addEventListener('ended',()=>{status.textContent='样片播放完成。';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!video.paused)video.pause();});
