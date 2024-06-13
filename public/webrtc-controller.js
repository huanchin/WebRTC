/****** 1) Get User Media ******/
const videoGrid = document.getElementById("video-grid");
async function getMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    myVideoStream = stream;
    addVideo("my-label-mini-vid", USERNAME, myVideoStream);
    changeMainVideo(stream);
  } catch (err) {}
}
getMedia();
/****** 1) Get User Media ******/

/****** 1-a) Add local video stream to video tag ******/
function addVideo(labelMiniVidId, username, stream) {
  const video = document.createElement("video");
  video.className = "vid";
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  video.addEventListener("click", () => {
    changeMainVideo(stream);
  });
  const labelMiniVid = document.createElement("div");
  labelMiniVid.id = labelMiniVidId;
  labelMiniVid.className = "label-mini-vid";
  labelMiniVid.innerHTML = username;
  const miniVid = document.createElement("div");
  miniVid.className = "mini-vid";
  miniVid.append(video);
  miniVid.append(labelMiniVid);
  videoGrid.append(miniVid);

  countUser();
}
/****** 1-a) Add local video stream to video tag ******/

/****** Count the total user ******/
function countUser() {
  let numb = videoGrid.childElementCount;
  document.getElementById("participant").innerHTML = numb;
}

/****** Change main video ******/
const mainVid = document.getElementById("main-video");
function changeMainVideo(stream) {
  mainVid.srcObject = stream;
}
