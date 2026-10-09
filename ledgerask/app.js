"use strict";
const video = document.getElementById("walkthrough");
const buttons = [...document.querySelectorAll("[data-video]")];
const status = document.getElementById("video-status");
let selection = 0;
function waitForMetadata() {
  if (video.readyState > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", ready);
      video.removeEventListener("error", failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Video unavailable")); };
    video.addEventListener("loadedmetadata", ready);
    video.addEventListener("error", failed);
  });
}
buttons.forEach(button => button.addEventListener("click", async () => {
  const request = ++selection;
  button.setAttribute("aria-busy", "true");
  buttons.forEach(item => item.setAttribute("aria-current", String(item === button)));
  video.pause();
  const source = video.querySelector("source");
  if (source.getAttribute("src") !== button.dataset.video) {
    source.setAttribute("src", button.dataset.video);
    video.querySelectorAll("track").forEach(track => track.remove());
    const captions = document.createElement("track");
    Object.assign(captions, {
      kind: "captions", src: button.dataset.captions,
      srclang: "zh-CN", label: "中文",
    });
    video.append(captions);
    if (button.dataset.chapters) {
      const chapters = document.createElement("track");
      Object.assign(chapters, {
        kind: "chapters", src: button.dataset.chapters,
        srclang: "zh-CN", label: "演示章节",
      });
      video.append(chapters);
    }
    video.load();
  }
  video.setAttribute("aria-label", `汇千流演示：${button.dataset.title}，含中文解说`);
  status.textContent = `当前视频：${button.dataset.title}`;
  try {
    await waitForMetadata();
    if (request !== selection) return;
    video.currentTime = 0;
    await video.play();
  } catch {
    if (request === selection) {
      status.textContent = "请使用播放器开始播放，也可以通过右侧链接下载视频。";
      video.focus();
    }
  } finally {
    button.removeAttribute("aria-busy");
  }
}));
