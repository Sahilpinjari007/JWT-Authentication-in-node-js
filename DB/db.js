import mongoose from "mongoose";


export const connectDB = () =>{
   try{
    mongoose.connect('mongodb://127.0.0.1:27017/JWTAuth');
    console.log('connected to Database!');
   }
   catch(error){
    console.log('unable to conncect Database!');
   }
}