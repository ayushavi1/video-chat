const mongoose = require("mongoose")

// mongoose.connect("mongodb://localhost:27017/roomDB")


const roomSchema = new mongoose.Schema({
    roomId: String,
    currentusers: Number,
    users: [{
        peerid: String,
        id: String,
        name: String,
        photo: String
    }]
})
// console.log("schema")
module.exports = mongoose.model("Room", roomSchema);
