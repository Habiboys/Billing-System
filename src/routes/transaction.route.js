const express = require("express");
const router = express.Router();
const {createTransaction}= require("../controllers/transaction.controller")
const {tokenValidation} = require("../middlewares/auth.middleware");


router.post("/create", createTransaction);
module.exports = router;