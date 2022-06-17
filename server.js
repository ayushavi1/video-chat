const express = require("express");
const app = express();
const colors = require('colors');
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose")
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const Room = require("./models/room")
dotenv.config({ path: './config.env' });


app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
// const { ExpressPeerServer } = require("peer");
// const peerServer = ExpressPeerServer(server, {

//   debug: true,
// });
const connectDB = require('./config/db');
connectDB();
// app.use("/peerjs", peerServer);
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    maxAge: 24 * 60 * 60 * 1000
  })
);



app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));




app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {

  return done(null, user);
});

passport.deserializeUser((user, done) => {
  return done(null, user);
})


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
},
  function (accessToken, refreshToken, profile, cb) {
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    //console.log(profile);
    console.log(profile);
    return cb(null, profile);
  }
));

app.get('/auth/login', (req, res) => {
  res.render("login");
})

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('http://localhost:3000/home');
  });

app.get('/auth/logout', (req, res) => {
  try {
    if (req.user) {
      req.logout();
      res.send('Success');
    }
  } catch (error) {
    console.log(error);
  }
})

app.get("/home", (req, res) => {
  if (req.user) {

    res.render("home");
  }
  else {
    res.redirect('/auth/login');
  }

});

app.get("/:room", (req, res) => {
  if (req.user) {
    console.log("here", req.user);

    res.render("room", {
      roomId: req.params.room,
      googleid: req.user.id,
      name: req.user.displayName,
      photo: req.user.photos[0].value,
    });
  }
  else {
    res.redirect('/auth/login');
  }

});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, name, googleid, photo, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    Room.findOne({ roomId: roomId }, function (err, foundRoom) {
      if (!err) {
        console.log("here2", name, googleid, photo);
        foundRoom.users.push({
          peerid: userId,
          id: googleid,
          name: name,
          photo: photo
        });
        foundRoom.save();
      }
    })
  })
});

app.get("/", (req, res) => {
  // console.log(req.user);
  if (req.user) {
    const roomId = uuidv4();
    const room = new Room({
      roomId: roomId,
      users: []
    })
    room.save();
    res.redirect("/" + roomId);
  }
  else {
    res.redirect('/auth/login');
  }

});

server.listen(process.env.PORT || 3000, function () {
  console.log(`Server running on port ${process.env.PORT}`.rainbow.bold);
})

