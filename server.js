const express= require("express")
const mongoose= require("mongoose")
const router= require("./src/router")

const cors = require('cors');

const app = express();

// Use CORS middleware
app.use(cors());

app.use(express.json())

mongoose.connect('mongodb+srv://upendra:wvUNUF1FjJ02PCPH@cluster0.b8yrh4n.mongodb.net/dataneuron',{
    useNewUrlParser:true
})

.then(()=>{
    console.log("database is connected")
})
.catch((err)=>{
    console.log("err:",err)
})

app.use("/",router)
app.listen(3000, function(){
console.log("server is running on port 300")  
})