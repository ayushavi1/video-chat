const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose")
const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });
const Room = require("./models/room")


const connectDB = require('./config/db');
connectDB();


app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});

app.use(express.static("public"));



app.get("/", (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/${roomId}`);
  const room = new Room({
    roomId: roomId,
    users: []
  })
  room.save();
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    Room.findOne({ roomId: roomId }, function (err, foundRoom) {
      if (!err) {
        foundRoom.users.push(userId);
        foundRoom.save();
      }
    })
})
});


    
server.listen(process.env.PORT || 3000, function () {
  console.log("running server at port 3000")
})
