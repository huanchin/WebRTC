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
};

// C) if you join a new room
//Execute this callback function when there is a call from another peer
peer.on("call", (call) => {
  // answer and send local stream to another peer
  call.answer(myVideoStream);
  const conn = peer.connect(call.peer);
  conn.on("open", function () {
    conn.send(myPeerId + "," + USERNAME);
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
