const express= require("express")
const router= express.Router()
const employeeController= require("../src/controller/employeeController")

router.post("/add", employeeController.addEmployee)
router.put("/update",employeeController.updateEmployee)
router.get("/getData",employeeController.getAllEmployee)
router.delete("/deleteEmployee",employeeController.deleteEmployee)

module.exports=router