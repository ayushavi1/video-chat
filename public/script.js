const socket = io("/");

const videoGroup=document.querySelector(".videos__group");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");

const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");

const startShare = document.getElementById("presentButton");
const stopShare = document.getElementById("stoppresentButton");

const screendiv=document.getElementById("screen");
const screen=document.getElementById("screen-video");

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");


myVideo.muted = true;
var myscreen=null;
var screenshared=false;
let peers={}
var displayMediaOptions = {
  video: {
    cursor: "always"
    },
  audio: false
};




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
      if(call.metadata.type==="video"){

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
    }
    else if(call.metadata.type==="screensharingstopped"){
      call.answer();
      call.on("stream", (screensrc) => {
      screendiv.style.display="none";

      screen.srcObject=screensrc;
    
      startShare.style.display="block";
      })
    }
    else {

      call.answer();
      call.on("stream", (screensrc) => {
      screendiv.style.display="flex";
      console.log(screensrc)
      screen.srcObject=screensrc;
      startShare.style.display="none";
      })
    }
    });

    socket.on("user-connected", (userId) => {
      setTimeout(() => {
        console.log("User connected: " + userId)
        // user joined
        connectToNewUser(userId, stream)
      }, 1000)
    });
  });

 socket.on("createMessage", (message, user) => {
    messages.innerHTML =
      messages.innerHTML +
      `<div class="message">
          <b><i class="far fa-user-circle"></i> <span> ${user === userName ? "me" : user
      }</span> </b>
          <span>${message}</span>
      </div>`;
  });

  socket.on('user-disconnected',userId=>{
    if(peers[userId]) peers[userId].close()
})

const connectToNewUser = (userId, stream) => {
  console.log(userId);
  const call = peer.call(userId, stream, {metadata: {"type":"video"}});
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close',()=>{
    video.remove()
})
peers[userId]=call; 

if(screenshared){
  peer.call(userId, myscreen,  {metadata: {"type":"screensharing"}})
}
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

async function startCapture() {

  try {
    myscreen= await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    screenshared=true;
    console.log(myscreen);
  } catch(err) {
    console.error("Error: " + err);
  }
}

function stopCapture(evt) {
  let tracks = screen.srcObject.getTracks();
  screenshared=false;
  tracks.forEach(track => track.stop());
  screen.srcObject = null;
}


startShare.addEventListener("click",async ()=>{

  screendiv.style.display="flex";
  startShare.style.display="none";
  stopShare.style.display="block";
  try{
    await startCapture();
  }
  catch(error){
    console.log(error);
  }
  screen.srcObject=myscreen;
  (Object.keys(peers)).map((peerid)=>{
    peer.call(peerid, myscreen,  {metadata: {"type":"screensharing"}})
  });
  console.log(myscreen);``
})


stopShare.addEventListener("click",()=>{
  screendiv.style.display="none";
  stopShare.style.display="none";
  startShare.style.display="block";
  stopCapture();
  (Object.keys(peers)).map((peerid)=>{
    peer.call(peerid, myscreen,  {metadata: {"type":"screensharingstopped"}})
  });

})

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});


send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});



muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});

