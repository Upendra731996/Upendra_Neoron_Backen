const  mongoose  = require("mongoose");

const employeSchema= new mongoose.Schema({
    employee_Name:{
        type:String,

    },
    mobile_number:{
        type:String,
        unique:true,
        require:true
    },
    
    updatedCount:{
        type:Number
    },
    addCount:{
        type:Number,
        default:0
    }
})

module.exports= mongoose.model("eployee",employeSchema)