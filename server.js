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


const connectDB = require('./config/db');
connectDB();

app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    maxAge: 24 * 60 * 60 * 1000
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json())



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


app.get("/create-meeting", (req, res) => {
  if (req.user) {
    const roomId = uuidv4();
    const room = new Room({
      roomId: roomId,
      currentusers: 0,
      users: []
    })
    room.save().then(() => {
      res.redirect("/" + roomId);
    })
  }
  else {
    res.redirect('/auth/login');
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
        foundRoom.currentusers = foundRoom.currentusers + 1;
        foundRoom.save();
      }
    })
    socket.on('disconnect', () => {
      Room.findOne({ roomId: roomId }, function (err, foundRoom) {
        if (!err) {
          foundRoom.users.map((user) => {
            if (user.peerid == userId) {
              if (foundRoom.currentusers === 1) {
                Room.deleteOne({ roomId: roomId })
                  .then(
                    (success) => {
                      console.log(success);
                    }
                  ).catch((err) => {
                    console.log(err);

                  })
              }
              else { foundRoom.currentusers = foundRoom.currentusers - 1; foundRoom.save(); }
            }
          })
        }
      })
      socket.to(roomId).emit('user-disconnected', userId)
    });

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
  })

});

app.post("/join", (req, res) => {
  if (req.user) {
    const meeting = req.body.meeting;
    if (meeting.includes('/'))
      res.redirect("/" + meeting.substr(meeting.length - 36, 36));
    else
      res.redirect("/" + meeting);
  }
  else {
    res.redirect('/auth/login');
  }
})


app.get("/", (req, res) => {
  if (req.user) {
    res.redirect('/home');
  }
  else {
    res.redirect('/auth/login');
  }

});

server.listen(process.env.PORT || 3000, function () {
  console.log(`Server running on port ${process.env.PORT}`.rainbow.bold);
})
