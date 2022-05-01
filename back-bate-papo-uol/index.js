

import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import joi from 'joi';
import dayjs from 'dayjs';



const app = express();
app.use(cors());
app.use(express.json());

let dataBase;
const mongoClient = new MongoClient("mongodb://localhost:27017");
const promise = mongoClient.connect();
promise.then(() => {
    dataBase = mongoClient.db("batePapoUol");
    console.log("Conectado ao banco de dados!");
})
promise.catch(e => console.log("Não Foi possível conectar ao banco", e))

app.post("/participants", async (req, res) => {
    const login = req.body;
    console.log(login)

    const loginSchema = joi.object({
        name: joi.string().required(),
    });

    const validationLogin = loginSchema.validate(login, { abortEarly: false });
    console.log(validationLogin)

    if (validationLogin.error) {
        console.log(validationLogin.error);
        res.status(422).send(validationLogin.error.details.message)
        return;
    }

    try {
        const find = await dataBase.collection("users").findOne({ name: login.name });
        console.log("find: " + JSON.stringify(find));

        if (find === null) {
            let insertName = await dataBase.collection("users").insertOne({ name: login.name, lastStatus: Date.now() });
            let insertSignInMessage = await dataBase.collection("messages").insertOne(
                { from: login.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') }
            )
            console.log("Novo usuário adicionado ao banco de datos");
        } else {
            console.log("Um usuário tentou entrar no chat com um nome já existente.")
        }
    } catch (e) {
        res.send("Ops, não conseguimos conectar ao servidor: " + e)
        return;
    }


    res.send("Deu certo! ValidationLogin: " + JSON.stringify(validationLogin))
})


app.get("/participants", async (req, res) => {
    try {
        const list = await dataBase.collection("users").find({}).toArray();
        res.send(list);
    } catch (e) {
        res.send("Não foi possível obter a lista de usuários: " + e)
    }
})


app.post("/messages", async (req, res) => {

    const messagesBody = req.body;
    const messagesBodySchema = joi.object({
        to: joi.string(),
        type: joi.string().allow('message', 'private_message'),
        text: joi.string()
    })

    const validationMessagesBody = messagesBodySchema.validate(messagesBody, { abortEarly: false });
    if (validationMessagesBody.error) {
        console.log(validationMessagesBody.error);
        res.status(422).send(validationMessagesBody.error.details.message)
        return;
    }
    // console.log(validationMessagesBody)

    const infosHeader = req.headers;
    const messageHeader = { from: infosHeader.user };

    const messageHeaderSchema = joi.object({
        from: joi.string()
    })

    const validationMessageHeader = messageHeaderSchema.validate(messageHeader, { abortEarly: false });
    if (validationMessageHeader.error) {
        console.log(validationMessageHeader.error);
        res.status(422).send(validationMessageHeader.error.details.message)
        return;
    }
    //  console.log(validationMessageHeader);

    try{

    }catch{
        
    }

    console.log(messageHeader)
    res.send("A mensagem foi enviada com sucesso para o servidor")

})

app.listen(5001);