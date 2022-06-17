const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");

myVideo.muted = true;

// const userName = prompt("Enter your name");


let peers={}

const peer = new Peer(undefined, {
  host: "/",
  port: "3001",
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      call.answer(stream);
      //connecting to all peers that where already in the meeting and called the new peer
      call.on('close',()=>{
        video.remove()
    })
      peer.connect(call.peer);
      peers[call.peer]=call;
      console.log(peers)

      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      setTimeout(() => {
        console.log("User connected: " + userId)
        // user joined
        connectToNewUser(userId, stream)
      }, 1000)
    });
  });


  socket.on('user-disconnected',userId=>{
    if(peers[userId]) peers[userId].close()
})

const connectToNewUser = (userId, stream) => {
  console.log(userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close',()=>{
    video.remove()
})
peers[userId]=call; 
console.log(peers)
console.log(call);
};

peer.on("open", (userId) => {
  socket.emit("join-room", ROOM_ID, NAME, GOOGLEID, PHOTO, userId);

});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
};
inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});