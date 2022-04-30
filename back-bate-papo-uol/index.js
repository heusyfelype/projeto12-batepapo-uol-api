

import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import joi from 'joi';

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

app.post( "/participants", async (req, res) =>{
    const login = req.body;

    const loginSchema = joi.object({
        nome: joi.string().required(),
    });

    const validationLogin = loginSchema.validate(login, {abortEarly: false});

    if(validationLogin.error){
        console.log(validationLogin.error);
        res.status(422).send(validationLogin.error.details.message)
        return;
    }

    try{
         const find = await dataBase.collection("users").findOne(login);
         if(find === null){
            let insert = await dataBase.collection("users").insertOne(login);
            console.log("Insert: " + JSON.stringify(insert));
        }
         console.log("find: " + JSON.stringify(find));
    } catch(e){
        console.log("Deu Ruim: " + e)
    }



    console.log("Está tudo indo")
    res.send("Deu certo! ValidationLogin: " + JSON.stringify(validationLogin))
})

app.listen(5000);