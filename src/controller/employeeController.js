const employeeModel= require("../models/employee")

module.exports={
    addEmployee: async function(req,res){
        try{
let data= req.body

let id= req.query.id;

if(id){
   var deletedData= await employeeModel.findOneAndDelete({_id:id})
}
data.addCount=(deletedData?.addCount||0)+1
data.updatedCount=deletedData?.addCount||0
let addedData= await employeeModel.create(data)

return res.json({statusCode:201,data:addedData,msg:"data added successfully"})

        }
        catch(err){
            return res.json({statusCode:500, data:"",mag:err.message})
        }
    },

    updateEmployee: async function(req, res) {
        try {
            let data = req.body;
            let id = req.query.id;
    
            // Update employee data in the database
            let updatedEmployee = await employeeModel.findOneAndUpdate({ _id: id }, data, { new: true });
    
            // Increment the update count field
            if (updatedEmployee) {
                updatedEmployee.updatedCount = (updatedEmployee?.updatedCount || 0) + 1;
                await updatedEmployee.save();
            }
    
            return res.json({ statusCode: 200, data: updatedEmployee, msg: "Employee updated successfully" });
        } catch (err) {
            return res.json({ statusCode: 500, data: "", msg: err });
        }
    },

    getAllEmployee: async function(req,res){
        try{


let data= await employeeModel.find()
return res.json({ statusCode: 200, data:data, msg: "Employee updated successfully" });


        }
        catch(err){
            return res.json({ statusCode: 500, data: [], msg: err.message });
            
        }
    },

    deleteEmployee:async function (req,res){
        try{
            let id=req.query.id

let deletedData= await employeeModel.findOneAndDelete({_id:id})

return res.json({ statusCode: 200, data:deletedData, msg: "Employee deleted successfully" });

        }
        catch(err){
            return res.json({ statusCode: 500, data: [], msg: err.message });
            
        }
    }
}