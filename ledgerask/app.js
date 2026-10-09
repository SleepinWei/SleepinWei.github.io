"use strict";
const video = document.getElementById("walkthrough");
const buttons = [...document.querySelectorAll("[data-time]")];
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
    video.load();
  });
}
buttons.forEach(button => button.addEventListener("click", async () => {
  button.setAttribute("aria-busy", "true");
  try {
    await waitForMetadata();
    video.currentTime = Number(button.dataset.time);
    await video.play();
  } catch {
    video.focus();
  } finally {
    button.removeAttribute("aria-busy");
  }
}));
video.addEventListener("timeupdate", () => {
  const active = buttons.findLast(button => Number(button.dataset.time) <= video.currentTime);
  buttons.forEach(button => button.setAttribute("aria-current", String(button === active)));
});
