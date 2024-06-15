/*** share screen variables ***/
let shareState = 0;
let videoTrack;
let streamBack;
let sharedStream;
/*** record meeting variables ***/
let recordState = 1;
let stream = null;
let audio = null;
let mixedStream = null;
let chunks = [];
let recorder = null;

/****** 1) Get User Media ******/
const videoGrid = document.getElementById("video-grid");
let myVideoStream;

async function getMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    myVideoStream = stream;
    // for debug: console.log("get media:", myVideoStream);
    addVideo("my-label-mini-vid", USERNAME, myVideoStream);
    changeMainVideo(stream);
  } catch (err) {}
}
getMedia();

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

/****** 2) Create connection to start the meeting ******/
/****** 2-a) Initializing Socket.IO Client ******/
// socket is used to receive message from signaling server
const socket = io("/");
let myPeerId;
let peerList = [];
/****** 2-b) Creating a PeerJS Object *******/
// peer is used to communicate with other peers
const peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "8080",
});
/***** 2-c) After connection successfully established ***/
// A) emit "join-room" message to server, send along with roomId and peerId
peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
  myPeerId = id;
  peerList[id] = USERNAME;
});

// B) if new user join your room
// you will receive peerId of that user
socket.on("user-connected", (peerId) => {
  connecToOther(peerId, myVideoStream);
});

const connecToOther = (peerId, stream) => {
  // call the new user
  const call = peer.call(peerId, stream);
  peerList[call.peer] = "";
  let i = 1;
  // get new user's stream
  call.on("stream", (userVideoStream) => {
    if (i <= 1) {
      // add new user's stream to my local
      addVideo(call.peer, "", userVideoStream);
      const conn = peer.connect(peerId);
      conn.on("open", function () {
        conn.send(myPeerId + "," + USERNAME);
      });
    }
    i++;
  });

  // when new user joins
  // if you are sharing screen, let him know your shared screen
  if (shareState == 1) {
    const call1 = peer.call(peerId, sharedStream);
  }
};

// C) if you join a new room
//Execute this callback function when there is a call from another peer
peer.on("call", (call) => {
  //for debug: console.log("on call: ", myVideoStream);
  // answer and send local stream to another peer
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      // myVideoStream = stream;
      // for debug: console.log("after getting stream");
      call.answer(myVideoStream);
      var conn = peer.connect(call.peer);
      conn.on("open", function () {
        conn.send(myPeerId + "," + USERNAME);
      });
    });

  if (peerList.hasOwnProperty(call.peer) == false) {
    let i = 1;
    call.on("stream", (userVideoStream) => {
      if (i <= 1) {
        addVideo(call.peer, "", userVideoStream);
      }
      i++;
    });
    peerList[call.peer] = "";
  } else {
    // if peerId from other call already exist in your peerList,
    // means that that call is a call for shared screen
    call.on("stream", (userVideoStream) => {
      changeMainVideo(userVideoStream);
      streamBack = userVideoStream;
      document.getElementById("shareControl").onclick = getSharedVideo;
      document.getElementById("shareText").innerHTML = "Back in";
    });
  }
});

/**** After peer data connection is established ****/
// if you receive data(peerId and username) from other peer
peer.on("connection", function (conn) {
  conn.on("data", function (data) {
    const message = data.split(",");
    peerList[message[0]] = message[1];
    document.getElementById(message[0]).innerHTML = message[1];
  });
});

/*** Feature ***/
/*** microphone control ***/
function muteUnmute() {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    const html = `
              <i class="material-icons">&#xe02b;</i>
              <p class="label">Mic</p>
              `;
    document.getElementById("audioControl").innerHTML = html;
    myVideoStream.getAudioTracks()[0].enabled = false;
  } else {
    const html = `
              <i class="material-icons">&#xe029;</i>
              <p class="label">Mic</p>
              `;
    document.getElementById("audioControl").innerHTML = html;
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

/*** camera control ***/
function playStop() {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    const html = `
   <i class="material-icons">&#xe04c;</i>
   <p class="label">Cam</p>
 `;
    document.getElementById("videoControl").innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    const html = `
   <i class="material-icons">&#xe04b;</i>
   <p class="label">Cam</p>
   `;
    document.getElementById("videoControl").innerHTML = html;
  }
}

/*** Share screen ***/
function shareScreen() {
  if (shareState == 0) {
    startShareScreen();
  } else {
    stopShareScreen();
  }
}

function startShareScreen() {
  navigator.mediaDevices
    .getDisplayMedia({
      video: {
        cursor: "always",
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    .then((stream) => {
      sharedStream = stream;
      shareState = 1;
      document.getElementById("shareControl").style.color = "#fd6f13";
      // var peerToCall = Object.keys(peerList) + "";
      // const peerArray = peerToCall.split(",");
      const peerArray = Object.keys(peerList);
      for (let i = 1; i <= peerArray.length; i++) {
        const call = peer.call(peerArray[i], stream);
        changeMainVideo(stream);
      }
      videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = function () {
        stopShareScreen();
      };
    })
    .catch((err) => {
      console.log("unable to share screen " + err);
    });
}

function stopShareScreen() {
  shareState = 0;
  document.getElementById("shareControl").style.color = "#000000";
  videoTrack.stop();
  changeMainVideo(myVideoStream);
  socket.emit("stop-screen-share", myPeerId);
}

/*** when other user stop sharing screen ***/
socket.on("no-share", (peerId) => {
  changeMainVideo(myVideoStream);
  document.getElementById("shareControl").onclick = shareScreen;
  document.getElementById("shareText").innerHTML = "Share";
});

function getSharedVideo() {
  changeMainVideo(streamBack);
}

/*** Record functionality ***/
function recordMeeting() {
  if (recordState == 1) {
    startRecording();
  } else {
    stopRecording();
  }
}

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    audio = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });
    recordState = 0;
    document.getElementById("recordControl").style.color = "#fd6f13";
  } catch (err) {
    console.error(err);
  }
  if (stream && audio) {
    mixedStream = new MediaStream([
      ...stream.getTracks(),
      ...audio.getTracks(),
    ]);
    recorder = new MediaRecorder(mixedStream);
    recorder.ondataavailable = handleDataAvailable;
    recorder.onstop = handleStop;
    recorder.start(1000);
  }
}

// This function is called whenever the recorder has data available
function handleDataAvailable(e) {
  chunks.push(e.data);
}

// This function is called when the recording stops
function handleStop(e) {
  const blob = new Blob(chunks, { type: "video/mp4" });
  chunks = [];
  stream.getTracks().forEach((track) => track.stop());
  audio.getTracks().forEach((track) => track.stop());
  const element = document.createElement("a");
  element.href = URL.createObjectURL(blob);
  element.download = "video.mp4";
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function stopRecording() {
  recordState = 1;
  document.getElementById("recordControl").style.color = "#000000";
  recorder.stop();
}
