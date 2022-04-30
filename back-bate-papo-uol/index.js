

import express from 'express';
import { MongoClient } from "mongodb";
import cors from "cors";

//const mongoClient = new MongoClient("mongodb://localhost:27017");
const app = express();
app.use(cors());
app.use(express.json());

app.get( "/", (req, res) =>{
    console.log("Está tudo indo")
    res.send("Deu certo!")
})

app.listen(5000);