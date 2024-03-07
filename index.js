import express from 'express';
import { connectDB } from './DB/db.js';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express();


app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


// import routes
import userRouter from './routes/user.routes.js';


// declear routes
app.use('/api/v1/user', userRouter);


app.listen(3000, ()=>{
    console.log('Connected to Server on PORT 3000!');
    connectDB()
})