const videoGrid = document.getElementById('video-grid');
let myVideoStream;
async function getMedia() {
    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
        myVideoStream = stream;
        addVideo("my-label-mini-vid", USERNAME, myVideoStream);
        changeMainVideo(stream);
    } catch (err) { }
}
getMedia();

function addVideo(labelMiniVidId, username, stream) {
    const video = document.createElement('video');
    video.className = "vid";
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    video.addEventListener('click', () => {
        changeMainVideo(stream);
    })
    const labelMiniVid = document.createElement('div');
    labelMiniVid.id = labelMiniVidId;
    labelMiniVid.className = "label-mini-vid";
    labelMiniVid.innerHTML = username;
    const miniVid = document.createElement('div');
    miniVid.className = "mini-vid";
    miniVid.append(video);
    miniVid.append(labelMiniVid);
    videoGrid.append(miniVid);

    countUser();
}

function countUser() {
    let numb = videoGrid.childElementCount;
    document.getElementById("participant").innerHTML = numb;
}

const mainVid = document.getElementById("main-video");
function changeMainVideo(stream) {
  mainVid.srcObject = stream;
}

const socket = io('/');
var myPeerId;
var peerList = [];
var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '8080'
}); 
peer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
    myPeerId = id;
    peerList[id] = USERNAME;
})

socket.on('user-connected', (peerId) => {
    connecToOther(peerId, myVideoStream);
})

var sharedStream;
const connecToOther = (peerId, stream) => {
    const call = peer.call(peerId, stream);
    peerList[call.peer] = "";
    var i = 1;
    call.on('stream', userVideoStream => {
        if (i <= 1) {
            addVideo(call.peer, "", userVideoStream);
            var conn = peer.connect(peerId);
            conn.on('open', function () {
                conn.send(myPeerId + "," + USERNAME);
            });
        }
        i++;
    })

    if (shareState == 1) {
        const call1 = peer.call(peerId, sharedStream);
    }
}

var myVideoStream1;
peer.on('call', call => {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        //myVideoStream = stream;
        call.answer(myVideoStream);
        var conn = peer.connect(call.peer);
        conn.on('open', function () {
            conn.send(myPeerId + "," + USERNAME);
        });
    })

    if (peerList.hasOwnProperty(call.peer) == false) {
        var i = 1;
        call.on('stream', userVideoStream => {
            if (i <= 1) {
                addVideo(call.peer, "", userVideoStream);
            } i++;
        })
        peerList[call.peer] = "";
    } else {
        call.on('stream', userVideoStream => {
            changeMainVideo(userVideoStream);
            streamBack = userVideoStream;
            document.getElementById("shareControl").onclick = getSharedVideo;
            document.getElementById("shareText").innerHTML = "Back in";
        })
    }
})

var peerName;
peer.on('connection', function (conn) {
    conn.on('data', function (data) {
        var message = data.split(",");
        peerList[message[0]] = message[1];
        document.getElementById(message[0]).innerHTML = message[1];
    });
});

function muteUnmute() {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        const html = `
            <i class="material-icons">&#xe02b;</i>
            <p class="label">Mic</p>
            `;
        document.getElementById("audioControl").innerHTML = html;
        myVideoStream.getAudioTracks()[0].enabled = false;
        //myVideoStream1.getAudioTracks()[0].enabled = false;
    } else {
        const html = `
            <i class="material-icons">&#xe029;</i>
            <p class="label">Mic</p>
            `;
        document.getElementById("audioControl").innerHTML = html;
        myVideoStream.getAudioTracks()[0].enabled = true;
        //myVideoStream1.getAudioTracks()[0].enabled = true;
    }
}

function playStop() {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        //myVideoStream1.getVideoTracks()[0].enabled = false;
        const html = `
   <i class="material-icons">&#xe04c;</i>
   <p class="label">Cam</p>
 `;
        document.getElementById("videoControl").innerHTML = html;
    } else {
        myVideoStream.getVideoTracks()[0].enabled = true;
        //myVideoStream1.getVideoTracks()[0].enabled = true;
        const html = `
   <i class="material-icons">&#xe04b;</i>
  <p class="label">Cam</p>
   `;
        document.getElementById("videoControl").innerHTML = html;
    }
}

var shareState = 0;
var videoTrack;
var streamBack;
function shareScreen() {
    if (shareState == 0) {
        startShareScreen();
    } else {
        stopShareScreen();
    }
}
function startShareScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: {
            cursor: "always"
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true
        }
    }).then((stream) => {
        sharedStream = stream;
        shareState = 1;
        document.getElementById("shareControl").style.color = "#fd6f13";
        var peerToCall = Object.keys(peerList) + "";
        const peerArray = peerToCall.split(",");
        for (var i = 1; i <= peerArray.length; i++) {
            const call = peer.call(peerArray[i], stream);
            changeMainVideo(stream);
        }
        videoTrack = stream.getVideoTracks()[0];
        videoTrack.onended = function () {
            stopShareScreen();
        }
    }).catch((err) => {
        console.log("unable to share screen " + err)
    })
}
function stopShareScreen() {
    shareState = 0;
    document.getElementById("shareControl").style.color = "#000000";
    videoTrack.stop();
    changeMainVideo(myVideoStream);
    socket.emit('stop-screen-share', myPeerId);
}
socket.on('no-share', (peerId) => {
    changeMainVideo(myVideoStream);
    document.getElementById("shareControl").onclick = shareScreen;
    document.getElementById("shareText").innerHTML = "Share";
})
function getSharedVideo() {
    changeMainVideo(streamBack);
}

var recordState = 1;
function recordMeeting() {
    if (recordState == 1) {
        startRecording();
    } else {
        stopRecording();
    }
}
let stream = null, audio = null, mixedStream = null, chunks = [], recorder = null;
async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
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
        console.error(err)
    }
    if (stream && audio) {
        mixedStream = new MediaStream([...stream.getTracks(), ...audio.getTracks()]);
        recorder = new MediaRecorder(mixedStream);
        recorder.ondataavailable = handleDataAvailable;
        recorder.onstop = handleStop;
        recorder.start(1000);
    }
}
function handleDataAvailable(e) {
    chunks.push(e.data);
}
function handleStop(e) {
    const blob = new Blob(chunks, { 'type': 'video/mp4' });
    chunks = [];
    stream.getTracks().forEach((track) => track.stop());
    audio.getTracks().forEach((track) => track.stop());
    var element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = 'video.mp4';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function stopRecording() {
    recordState = 1;
    document.getElementById("recordControl").style.color = "#000000";
    recorder.stop();
}

let text = $('#textchat');
$('#textchat').keydown((e) => {
    var hour = new Date().getHours();
    hour = ("0" + hour).slice(-2);
    var minute = new Date().getMinutes();
    minute = ("0" + minute).slice(-2);
    var time = hour + "." + minute;
    if (e.which == 13 && text.val().length !== 0) {
        socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time);
        text.val('');
    }
})

var uploadState = 0;
$('#sendMessage').click(() => {
    var hour = new Date().getHours();
    hour = ("0" + hour).slice(-2);
    var minute = new Date().getMinutes();
    minute = ("0" + minute).slice(-2);
    var time = hour + "." + minute;
    if (uploadState == 0) {
        socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time);
        text.val('');
    } else {
        uploadFile();
        const html = '<a href="uploaded-files/' + text.val() + '" target="_blank">' + text.val() + '</a>';
        socket.emit('message', html, USERNAME, RANDOM_COLOR, time);
        text.val('');
    }
})

socket.on('createMessage', (message, sender, color, time) => {
    var initial = sender.substring(0, 1);
    $('#chatroom').append(`
<div id="left-chatroom" style="background-color: ${color}">
  <p class="profil">${initial}</p>
 <div class="mini-active"></div>
</div>
<div id="right-chatroom">
 <div id="message">
  <p id="message-user" style="color: #303030; font-weight: bold;">${sender}</p>
  <p id="message-text">${message}</p>
  </div>
</div>
 <p id="time-text" style="font-size:11px; color:#303030; margin-left: 55px; margin-top: 0px; padding-top: 0px; margin-bottom: 12px; color: white;">${time}</p>
 `)
    scrollToBottom();
})

function scrollToBottom() {
    let d = $('#chatroom');
    d.scrollTop(d.prop("scrollHeight"));
}

function selectFile(val) {
    var filename = val.replace(/C:\\fakepath\\/i, '');
    document.getElementById("textchat").value = filename;
    uploadState = 1;
}
function uploadFile() {
    alert("uploading file...");
    uploadState = 0;
    const file = document.getElementById("file");
    const fileReader = new FileReader();
    const theFile = file.files[0];
    fileReader.onload = async (ev) => {
        const chunkCount = Math.floor(ev.target.result.byteLength / (1024 * 1024)) + 1;
        const CHUNK_SIZE = ev.target.result.byteLength / chunkCount;
        const fileName = theFile.name;
        for (let chunkId = 0; chunkId < chunkCount + 1; chunkId++) {
            const chunk = ev.target.result.slice(chunkId * CHUNK_SIZE, chunkId * CHUNK_SIZE + CHUNK_SIZE)
            await fetch('/upload', {
                method: 'POST',
                headers: {
                    'content-type': 'application/octet-stream',
                    'file-name': fileName,
                    'content-length': chunk.length
                },
                body: chunk,
            })
        }
    }
    fileReader.readAsArrayBuffer(theFile);
    file.value = "";
}	

function leaveMeeting() {
    let text = "Are you sure?";
    if (confirm(text) == true) {
        socket.emit('leave-meeting', myPeerId, USERNAME);
        peer.disconnect();
        location.assign("/");
    }
}
socket.on('user-leave', (peerId, peerName) => {
    alert(peerName + " left the meeting");
    var node = document.getElementById(peerId).parentNode;
    videoGrid.removeChild(node);
    countUser();
})

BEFORE===========================
const videoGrid = document.getElementById('video-grid');
async function getMedia() {
    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
        myVideoStream = stream;
        addVideo("my-label-mini-vid", USERNAME, myVideoStream);
        changeMainVideo(stream);
    } catch (err) { }
}
getMedia();

function addVideo(labelMiniVidId, username, stream) {
    const video = document.createElement('video');
    video.className = "vid";
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    video.addEventListener('click', () => {
        changeMainVideo(stream);
    })
    const labelMiniVid = document.createElement('div');
    labelMiniVid.id = labelMiniVidId;
    labelMiniVid.className = "label-mini-vid";
    labelMiniVid.innerHTML = username;
    const miniVid = document.createElement('div');
    miniVid.className = "mini-vid";
    miniVid.append(video);
    miniVid.append(labelMiniVid);
    videoGrid.append(miniVid);

    countUser();
}

function countUser() {
    let numb = videoGrid.childElementCount;
    document.getElementById("participant").innerHTML = numb;
}

const mainVid = document.getElementById("main-video");
function changeMainVideo(stream) {
  mainVid.srcObject = stream;
}

const socket = io('/');
var myPeerId;
var peerList = [];
var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '8080'
}); 
peer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
    myPeerId = id;
    peerList[id] = USERNAME;
})

socket.on('user-connected', (peerId) => {
    connecToOther(peerId, myVideoStream);
})

var sharedStream;
const connecToOther = (peerId, stream) => {
    const call = peer.call(peerId, stream);
    peerList[call.peer] = "";
    var i = 1;
    call.on('stream', userVideoStream => {
        if (i <= 1) {
            addVideo(call.peer, "", userVideoStream);
            var conn = peer.connect(peerId);
            conn.on('open', function () {
                conn.send(myPeerId + "," + USERNAME);
            });
        }
        i++;
    })

    if (shareState == 1) {
        const call1 = peer.call(peerId, sharedStream);
    }
}

var myVideoStream1;
peer.on('call', call => {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        myVideoStream1 = stream;
        call.answer(stream);
        var conn = peer.connect(call.peer);
        conn.on('open', function () {
            conn.send(myPeerId + "," + USERNAME);
        });
    })

    if (peerList.hasOwnProperty(call.peer) == false) {
        var i = 1;
        call.on('stream', userVideoStream => {
            if (i <= 1) {
                addVideo(call.peer, "", userVideoStream);
            } i++;
        })
        peerList[call.peer] = "";
    } else {
        call.on('stream', userVideoStream => {
            changeMainVideo(userVideoStream);
            streamBack = userVideoStream;
            document.getElementById("shareControl").onclick = getSharedVideo;
            document.getElementById("shareText").innerHTML = "Back in";
        })
    }
})

var peerName;
peer.on('connection', function (conn) {
    conn.on('data', function (data) {
        var message = data.split(",");
        peerList[message[0]] = message[1];
        document.getElementById(message[0]).innerHTML = message[1];
    });
});

function muteUnmute() {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        const html = `
            <i class="material-icons">&#xe02b;</i>
            <p class="label">Mic</p>
            `;
        document.getElementById("audioControl").innerHTML = html;
        myVideoStream.getAudioTracks()[0].enabled = false;
        myVideoStream1.getAudioTracks()[0].enabled = false;
    } else {
        const html = `
            <i class="material-icons">&#xe029;</i>
            <p class="label">Mic</p>
            `;
        document.getElementById("audioControl").innerHTML = html;
        myVideoStream.getAudioTracks()[0].enabled = true;
        myVideoStream1.getAudioTracks()[0].enabled = true;
    }
}

function playStop() {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        myVideoStream1.getVideoTracks()[0].enabled = false;
        const html = `
   <i class="material-icons">&#xe04c;</i>
   <p class="label">Cam</p>
 `;
        document.getElementById("videoControl").innerHTML = html;
    } else {
        myVideoStream.getVideoTracks()[0].enabled = true;
        myVideoStream1.getVideoTracks()[0].enabled = true;
        const html = `
   <i class="material-icons">&#xe04b;</i>
  <p class="label">Cam</p>
   `;
        document.getElementById("videoControl").innerHTML = html;
    }
}

var shareState = 0;
var videoTrack;
var streamBack;
function shareScreen() {
    if (shareState == 0) {
        startShareScreen();
    } else {
        stopShareScreen();
    }
}
function startShareScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: {
            cursor: "always"
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true
        }
    }).then((stream) => {
        sharedStream = stream;
        shareState = 1;
        document.getElementById("shareControl").style.color = "#fd6f13";
        var peerToCall = Object.keys(peerList) + "";
        const peerArray = peerToCall.split(",");
        for (var i = 1; i <= peerArray.length; i++) {
            const call = peer.call(peerArray[i], stream);
            changeMainVideo(stream);
        }
        videoTrack = stream.getVideoTracks()[0];
        videoTrack.onended = function () {
            stopShareScreen();
        }
    }).catch((err) => {
        console.log("unable to share screen " + err)
    })
}
function stopShareScreen() {
    shareState = 0;
    document.getElementById("shareControl").style.color = "#000000";
    videoTrack.stop();
    changeMainVideo(myVideoStream);
    socket.emit('stop-screen-share', myPeerId);
}
socket.on('no-share', (peerId) => {
    changeMainVideo(myVideoStream);
    document.getElementById("shareControl").onclick = shareScreen;
    document.getElementById("shareText").innerHTML = "Share";
})
function getSharedVideo() {
    changeMainVideo(streamBack);
}

var recordState = 1;
function recordMeeting() {
    if (recordState == 1) {
        startRecording();
    } else {
        stopRecording();
    }
}
let stream = null, audio = null, mixedStream = null, chunks = [], recorder = null;
async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
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
        console.error(err)
    }
    if (stream && audio) {
        mixedStream = new MediaStream([...stream.getTracks(), ...audio.getTracks()]);
        recorder = new MediaRecorder(mixedStream);
        recorder.ondataavailable = handleDataAvailable;
        recorder.onstop = handleStop;
        recorder.start(1000);
    }
}
function handleDataAvailable(e) {
    chunks.push(e.data);
}
function handleStop(e) {
    const blob = new Blob(chunks, { 'type': 'video/mp4' });
    chunks = [];
    stream.getTracks().forEach((track) => track.stop());
    audio.getTracks().forEach((track) => track.stop());
    var element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = 'video.mp4';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function stopRecording() {
    recordState = 1;
    document.getElementById("recordControl").style.color = "#000000";
    recorder.stop();
}

let text = $('#textchat');
$('#textchat').keydown((e) => {
    var hour = new Date().getHours();
    hour = ("0" + hour).slice(-2);
    var minute = new Date().getMinutes();
    minute = ("0" + minute).slice(-2);
    var time = hour + "." + minute;
    if (e.which == 13 && text.val().length !== 0) {
        socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time);
        text.val('');
    }
})

var uploadState = 0;
$('#sendMessage').click(() => {
    var hour = new Date().getHours();
    hour = ("0" + hour).slice(-2);
    var minute = new Date().getMinutes();
    minute = ("0" + minute).slice(-2);
    var time = hour + "." + minute;
    if (uploadState == 0) {
        socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time);
        text.val('');
    } else {
        uploadFile();
        const html = '<a href="uploaded-files/' + text.val() + '" target="_blank">' + text.val() + '</a>';
        socket.emit('message', html, USERNAME, RANDOM_COLOR, time);
        text.val('');
    }
})

socket.on('createMessage', (message, sender, color, time) => {
    var initial = sender.substring(0, 1);
    $('#chatroom').append(`
<div id="left-chatroom" style="background-color: ${color}">
  <p class="profil">${initial}</p>
 <div class="mini-active"></div>
</div>
<div id="right-chatroom">
 <div id="message">
  <p id="message-user" style="color: #303030; font-weight: bold;">${sender}</p>
  <p id="message-text">${message}</p>
  </div>
</div>
 <p id="time-text" style="font-size:11px; color:#303030; margin-left: 55px; margin-top: 0px; padding-top: 0px; margin-bottom: 12px; color: white;">${time}</p>
 `)
    scrollToBottom();
})

function scrollToBottom() {
    let d = $('#chatroom');
    d.scrollTop(d.prop("scrollHeight"));
}

function selectFile(val) {
    var filename = val.replace(/C:\\fakepath\\/i, '');
    document.getElementById("textchat").value = filename;
    uploadState = 1;
}
function uploadFile() {
    alert("uploading file...");
    uploadState = 0;
    const file = document.getElementById("file");
    const fileReader = new FileReader();
    const theFile = file.files[0];
    fileReader.onload = async (ev) => {
        const chunkCount = Math.floor(ev.target.result.byteLength / (1024 * 1024)) + 1;
        const CHUNK_SIZE = ev.target.result.byteLength / chunkCount;
        const fileName = theFile.name;
        for (let chunkId = 0; chunkId < chunkCount + 1; chunkId++) {
            const chunk = ev.target.result.slice(chunkId * CHUNK_SIZE, chunkId * CHUNK_SIZE + CHUNK_SIZE)
            await fetch('/upload', {
                method: 'POST',
                headers: {
                    'content-type': 'application/octet-stream',
                    'file-name': fileName,
                    'content-length': chunk.length
                },
                body: chunk,
            })
        }
    }
    fileReader.readAsArrayBuffer(theFile);
    file.value = "";
}	

function leaveMeeting() {
    let text = "Are you sure?";
    if (confirm(text) == true) {
        socket.emit('leave-meeting', myPeerId, USERNAME);
        peer.disconnect();
        location.assign("/");
    }
}
socket.on('user-leave', (peerId, peerName) => {
    alert(peerName + " left the meeting");
    var node = document.getElementById(peerId).parentNode;
    videoGrid.removeChild(node);
    countUser();
})