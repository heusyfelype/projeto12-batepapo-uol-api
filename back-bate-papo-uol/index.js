

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
        to: joi.string().required(),
        type: joi.valid('message', 'private_message').required(),
        text: joi.string().required()
    })

    const validationMessagesBody = messagesBodySchema.validate(messagesBody, { abortEarly: false });
    if (validationMessagesBody.error) {
        console.log(validationMessagesBody.error);
        res.status(422).send(validationMessagesBody.error.details.message)
        return;
    }
    // console.log(validationMessagesBody)

    const infosHeader = req.headers;
    const messageHeader = { "from": infosHeader.user };

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

    try {
        const findUser = await dataBase.collection("users").findOne({ name: messageHeader.from });
        if (findUser === null) {
            res.send("Não foi possível localizá-lo no servidor")
            return;
        }
        const postMessage = await dataBase.collection("messages").insertOne({ ...messageHeader, ...messagesBody, time: dayjs().format("HH:mm:ss") })
    } catch (e) {
        res.send("Não foi possível obter a lista de usuários: " + e)
    }

    console.log(messageHeader)
    res.status(201).send("A mensagem foi enviada com sucesso para o servidor")

})


app.get("/messages", async (req, res) => {
    let limit = JSON.stringify(req.query);
    let numberLimit = null;

    if (limit.length === 2) {
        limit = { "limit": '' }
    } else {
        limit = { ...req.query }
    }

    const limitObjectSchema = joi.object({
        limit: joi.optional()
    })

    let validationLimit = limitObjectSchema.validate(limit, { abortEarly: false });

    // valor 'defoult' para imprimir as mensagens caso o fron passe apenas a palavra 'limit'
    if (JSON.stringify(validationLimit.value.limit.length) > 0) {
        numberLimit = parseInt(validationLimit.value.limit);
    }
    console.log("numberLimit:", numberLimit)

    const user = req.headers.user


    try {
        const allPublicMessages = await dataBase.collection("messages").find({ "to": 'Todos' }).toArray()
        const privateSended = await dataBase.collection("messages").find({ "from": user, "type": "private_message" }).toArray()
        const privateReceived = await dataBase.collection("messages").find({ "to": user, "type": "private_message" }).toArray()

        let allMessages = [...allPublicMessages, ...privateSended, ...privateReceived];
        //Aqui será necessária uma função para ordenar esse array e colocar as mensagens mais recentes por primeiro.

        if (numberLimit === null) {
            res.send(allMessages);
            return;
        } else {
            res.send(allMessages.slice(0, numberLimit))
            return;
        }

    } catch (e) {
        res.send("Não foi possível obter a lista de usuários: " + e)
    }




    res.send("teste")

    console.log("numer of list: " + numberLimit, "user: " + user)
})


setInterval( async () => {
    const onlineusers = await dataBase.collection("users").find({}).toArray();
    console.log("lista de users: ", onlineusers)
    for(let i = 0; i< onlineusers.length; i++){
        if(parseInt(Date.now()) - parseInt(onlineusers[i].lastStatus) > 300000){
            const userToDelete = await dataBase.collection("users").deleteOne({ ...onlineusers[i] })
            const logOffMessage = await dataBase.collection("messages").insertOne({
                from: onlineusers[i].name , to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss')
            })
        }
    }
}, 15000);

app.post("/status", async (req, res) => {
    const user = req.headers.user;
    try {
        const statusUser = await dataBase.collection("users").findOne({ "name": user })
        if (!statusUser) {
            res.sendStatus(404)
            return;
        }

        await dataBase.collection("users").updateOne({
            "name": user
        }, { $set: { "lastStatus": Date.now() } })

        //Aqui será vai o setTimeout?

    } catch (e) {

    }



})

app.listen(5000);