const express = require("express");
const session = require("express-session");
const { exec } = require("child_process");
const Redis = require("ioredis");
const Y = require("yjs");
const app = express();
const server = require("http").Server(app);
const fs = require("fs");
const PORT = 8000;
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

const redis = new Redis({
  host: "webrtc-redis-cache.9k4snd.ng.0001.apse2.cache.amazonaws.com",
});
// const redis = new Redis();

/*** 1) serve the home page ***/
app.use(express.static("public"));
app.set("view engine", "ejs");

app.set("trust proxy", true);

// 配置 session 中间件
app.use(
  session({
    secret: "your_secret_key", // 请使用一个强随机生成的字符串
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // 如果你使用 HTTPS，请设置为 true
  })
);

app.get("/", (req, res) => {
  res.render("frontpage");
});

//*** 4) Initialize connection for meeting ***/

/*** Importing and Setting Up the Express Peer Server ***/
const { ExpressPeerServer } = require("peer");
/*** creates a PeerJS server instance using ExpressPeerServer ***/
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
/*** Integrating the PeerJS Server with an Express Application ***/
// This line tells the Express application to use the PeerJS server at the /peerjs path
// any requests to /peerjs on your server will be handled by the PeerJS server
app.use("/peerjs", peerServer);

//*** 2) handle newroom route ***/
const { v4: uuidv4 } = require("uuid");
let un, pc;
const map = {};
app.get("/newroom", (req, res) => {
  un = req.query.username;
  pc = req.query.passcode;
  const roomId = uuidv4();
  redis.set(roomId, pc);
  // fs.appendFileSync(
  //   "public/meeting-log.txt",
  //   roomId + ":" + pc + "\n",
  //   "utf-8"
  // );
  map[roomId] = req.query.username;
  req.session.room = roomId;
  req.session.username = un;
  console.log(req.session.room);
  res.redirect(`/room/${roomId}`);
});

//*** 3) handle join room route ***/
/*
app.get("/joinroom", (req, res) => {
  const { username, invitation, passcode } = req.query;
  const log = fs.readFileSync("public/meeting-log.txt", "utf-8");
  let findInvitation = log.indexOf(`${invitation}:${passcode}`);
  if (findInvitation !== -1) {
    un = username;
    pc = passcode;
    req.session.visitedRoom = true; // 标记用户已经访问过 newroom 路由
    res.redirect(`/${invitation}`);
  } else {
    findInvitation = log.indexOf(`${invitation}`);
    if (findInvitation == -1) {
      res.send("Invalid invitation. Please <a href=/>go back</a>");
    } else {
      const findPassCode = log.indexOf(invitation + ":" + passcode);
      if (findPassCode == -1) {
        res.send("Invalid password. Please <a href=/>go back</a>");
      }
    }
  }
});
*/
app.get("/joinroom", (req, res) => {
  const { username, invitation, passcode } = req.query;
  redis.get(invitation, (err, result) => {
    if (err) {
      console.log("Redis get roomID error:", err);
      res.redirect("/");
      return;
    }
    console.log(invitation);
    console.log(result);
    if (!result) {
      res.send("Invalid invitation. Please <a href=/>go back</a>");
    } else if (result !== passcode) {
      res.send("Invalid password. Please <a href=/>go back</a>");
    } else {
      un = username;
      pc = passcode;
      req.session.room = invitation;
      req.session.username = username;
      res.redirect(`/room/${invitation}`);
    }
  });
});

//*** 2) handle room route ***/
// 中间件：检查用户是否已经访问过 /newroom 或 /joinroom
app.use("/room/:room", (req, res, next) => {
  const roomID = req.params.room;
  console.log(roomID);
  if (req.session.room !== roomID) {
    return res.redirect(`/?room=${roomID}`);
  }
  next();
});

app.get("/room/:room", (req, res) => {
  res.render("meeting-room", {
    roomId: req.params.room,
    username: req.session.username,
    isHost: map[req.params.room] === un,
  });
});

/***  when file upload route ***/
app.post("/upload", (req, res) => {
  console.log("__dirname");
  const fileName = req.headers["file-name"];
  req.on("data", (chunk) => {
    fs.appendFileSync(__dirname + "/public/uploaded-files/" + fileName, chunk);
  });
  res.end("uploaded");
});

/**** Setting Up Socket.IO ****/
const io = require("socket.io")(server);

io.engine.on("connection_error", (err) => {
  // the reason of the error, for example "xhr poll error"
  console.log(err.req);
  console.log(err.code);
  // some additional description, for example the status code of the initial HTTP response
  console.log(err.message);

  // some additional context, for example the XMLHttpRequest object
  console.log(err.context);
});

// Map to store Yjs documents
const docs = new Map();

// triggered when there is user connected to server
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, peerId) => {
    socket.join(roomId);

    if (!docs.has(roomId)) {
      const doc = new Y.Doc();
      docs.set(roomId, doc);
    }

    const doc = docs.get(roomId);

    socket.to(roomId).emit("user-connected", peerId);

    // Sync the initial state of the document
    socket.to(roomId).emit("syncDoc", Y.encodeStateAsUpdate(doc));

    doc.on("update", (update) => {
      socket.to(roomId).emit("docUpdate", update);
    });

    socket.on("docUpdate", (update) => {
      Y.applyUpdate(doc, new Uint8Array(update));
    });

    socket.on("stop-screen-share", (peerId) => {
      io.to(roomId).emit("no-share", peerId);
    });

    socket.on("message", (message, sender, color, time) => {
      io.to(roomId).emit("createMessage", message, sender, color, time);
    });

    socket.on("runCode", (code, language) => {
      let command;
      let timeoutCommand;
      const timeoutDuration = 5; // Set the timeout duration in seconds
      switch (language) {
        case "python":
          timeoutCommand = `timeout ${timeoutDuration}`;
          command = `${timeoutCommand} docker run --cpu-period=100000 --cpu-quota=50000 --rm python:3.12.4-alpine3.20 python -c "${code.replace(
            /"/g,
            '\\"'
          )}"`;
          break;
        case "javascript":
          timeoutCommand = `timeout ${timeoutDuration}`;
          command = `${timeoutCommand} docker run --cpu-period=100000 --cpu-quota=50000 --rm node:20.15.1-alpine3.19 sh -c "node -e '${code.replace(
            /"/g,
            '\\"'
          )}'"`;
          break;
        case "cpp":
          const fs = require("fs");
          const filePath = "temp.cpp";
          fs.writeFileSync(filePath, code);
          command = `g++ ${filePath} -o temp && ./temp`;
          break;
        default:
          socket.emit("output", "Unsupported language");
          return;
      }

      exec(command, (error, stdout, stderr) => {
        if (error) {
          if (error.signal === "SIGTERM") {
            socket.emit("output", "Execution timed out");
          } else {
            socket.emit("output", stderr);
          }
          return;
        }
        socket.emit("output", stdout);
      });
    });

    socket.on("leave-meeting", (peerId, peerName) => {
      io.to(roomId).emit("user-leave", peerId, peerName);
    });
  });
});
