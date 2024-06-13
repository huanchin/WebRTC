const express = require("express");
const app = express();
const server = require("http").Server(app);
const fs = require("fs");
server.listen(process.env.PORT || 8080);

/*** 1) serve the home page ***/
app.use(express.static("public"));
app.set("view engine", "ejs");
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
app.get("/:room", (req, res) => {
  res.render("meeting-room", {
    roomId: req.params.room,
    username: un,
  });
});
