const express = require("express");
const app = express();
const server = require("http").Server(app);
const fs = require("fs");
server.listen(process.env.PORT || 8080);

/****** serve the home page ******/
app.use(express.static("public"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
  res.render("frontpage");
});
