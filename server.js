const express = require("express");
const session = require("express-session");
const { exec } = require("child_process");
const app = express();
const server = require("http").Server(app);
const fs = require("fs");
server.listen(process.env.PORT || 8080);

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

//*** 2) handle newroom route ***/
const { v4: uuidv4 } = require("uuid");
let un, pc;
app.get("/newroom", (req, res) => {
  un = req.query.username;
  pc = req.query.passcode;
  const roomId = uuidv4();
  fs.appendFileSync(
    "public/meeting-log.txt",
    roomId + ":" + pc + "\n",
    "utf-8"
  );
  req.session.visitedRoom = true; // 标记用户已经访问过 newroom 路由
  res.redirect(`/${roomId}`);
});

//*** 3) handle join room route ***/
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

//*** 2) handle room route ***/
// 中间件：检查用户是否已经访问过 /newroom 或 /joinroom
app.use("/:room", (req, res, next) => {
  if (!req.session.visitedRoom) {
    return res.redirect("/");
  }
  next();
});

app.get("/:room", (req, res) => {
  res.render("meeting-room", {
    roomId: req.params.room,
    username: un,
  });
});

/***  when file upload route ***/
app.post("/upload", (req, res) => {
  const fileName = req.headers["file-name"];
  req.on("data", (chunk) => {
    fs.appendFileSync(__dirname + "/public/uploaded-files/" + fileName, chunk);
  });
  res.end("uploaded");
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

// triggered when there is user connected to server
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, peerId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", peerId);

    socket.on("stop-screen-share", (peerId) => {
      io.to(roomId).emit("no-share", peerId);
    });

    socket.on("message", (message, sender, color, time) => {
      io.to(roomId).emit("createMessage", message, sender, color, time);
    });

    socket.on("runCode", (code, language) => {
      let command;
      switch (language) {
        case "python":
          command = `docker run --rm python python -c "${code.replace(
            /"/g,
            '\\"'
          )}"`;
          break;
        case "javascript":
          command = `docker run --rm node sh -c "node -e '${code.replace(
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
          socket.emit("output", stderr);
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
