

import express from 'express';
import { MongoClient } from "mongodb";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let dataBase;
const mongoClient = new MongoClient("mongodb://localhost:27017");
const promise = mongoClient.connect();
promise.then(() => {
    dataBase = mongoClient.db("bate-papo-uol");
    console.log("Conectado ao banco de dados!");
})
promise.catch( e => console.log("Não Foi possível conectar ao banco", e))

app.get( "/", (req, res) =>{
    console.log("Está tudo indo")
    res.send("Deu certo!")
})

app.listen(5000);