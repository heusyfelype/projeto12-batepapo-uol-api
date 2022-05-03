

import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';


const app = express();
app.use(cors());
app.use(express.json());

let dataBase;

dotenv.config()
const mongoClient = new MongoClient(process.env.MONGO_URI);

const promise = mongoClient.connect();
promise.then(() => {
    dataBase = mongoClient.db("batePapoUol");
    console.log("Conectado ao banco de dados!");
})
promise.catch(e => console.log("Não Foi possível conectar ao banco", e))

app.post("/participants", async (req, res) => {
    const login = req.body;

    const loginSchema = joi.object({
        name: joi.string().required(),
    });

    const validationLogin = loginSchema.validate(login, { abortEarly: false });
    if (validationLogin.error) {
        res.sendStatus(422).send("name deve ser strings não vazio", validationLogin.error.details.message)
        return;
    }

    try {
        const find = await dataBase.collection("users").findOne({ name: login.name });

        if (!find) {
            let insertName = await dataBase.collection("users").insertOne({ name: login.name, lastStatus: Date.now() });
            let insertSignInMessage = await dataBase.collection("messages").insertOne(
                { from: login.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('YYYY-MM-DDTHH:mm:ssZ') }
            )
            res.sendStatus(200);
            return;
        } else {
            res.sendStatus(409)
            return;
        }
    } catch (e) {
        res.sendStatus(422).send("Ops, não conseguimos conectar ao servidor: " + e)
        return;
    }
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
        res.sendStatus(422).send(validationMessagesBody.error.details.message)
        return;
    }

    const infosHeader = req.headers;
    const messageHeader = { "from": infosHeader.user };
    const messageHeaderSchema = joi.object({
        "from": joi.string()
    })

    const validationMessageHeader = messageHeaderSchema.validate(messageHeader, { abortEarly: false });
    if (validationMessageHeader.error) {
        res.sendStatus(422).send(validationMessageHeader.error.details.message)
        return;
    }

    try {
        const findUser = await dataBase.collection("users").findOne({ name: messageHeader.from });
        if (findUser === null) {
            res.send("Não foi possível localizá-lo no servidor")
            return;
        }
        const postMessage = await dataBase.collection("messages").insertOne({ ...messageHeader, ...messagesBody, time: dayjs().format('YYYY-MM-DDTHH:mm:ssZ') })
        res.sendStatus(201);
        return;
    } catch (e) {
        res.sendStatus().send("Não foi possível obter a lista de usuários: " + e);
        return;
    }
})


app.get("/messages", async (req, res) => {
    let {
        limit = ''
    } = req.query;
    let numberLimit = null;

    const limitObjectSchema = joi.object({
        limit: joi.optional()
    })

    let validationLimit = limitObjectSchema.validate({ limit }, { abortEarly: false });
    if (validationLimit.error) {
        res.sendStatus(422);
        return;
    }

    // valor 'defoult' para imprimir as mensagens caso o fron passe apenas a palavra 'limit'
    if (JSON.stringify(validationLimit.value.limit.length) > 0) {
        numberLimit = parseInt(validationLimit.value.limit);
    }

    const user = req.headers.user;

    try {
        if (typeof numberLimit !== "number") {
            const allMessages = await dataBase.collection("messages").find(
                {
                    $or: [
                        { 'type': 'status' },
                        { 'type': 'message' },
                        { "to": user },
                        { "from": user}
                    ]
                }
            ).sort(
                { "time": 1 }
            ).toArray()

            for (let eachMessage of allMessages) {
                eachMessage.time = dayjs(eachMessage.time).format('HH:mm:ss');
            }

            res.send(allMessages);
            return;
        }
        const allMessages = await dataBase.collection("messages").find(
            {
                $or: [
                    { 'type': 'status' },
                    { 'type': 'message' },
                    { "to": user },
                    { "from": user }
                ]
            }
        ).limit(numberLimit).sort(
            { "time": 1 }
        ).toArray()

        for (let eachMessage of allMessages) {
            eachMessage.time = dayjs(eachMessage.time).format('HH:mm:ss');
        }
        res.send(allMessages)
        return;

    } catch (e) {
        res.send("Não foi possível obter a lista de usuários: " + e)
    }

    res.send("teste")
})


setInterval(async () => {
    const onlineusers = await dataBase.collection("users").find({}).toArray();
    for (let i = 0; i < onlineusers.length; i++) {
        if (parseInt(Date.now()) - parseInt(onlineusers[i].lastStatus) > 300000) {
            const userToDelete = await dataBase.collection("users").deleteOne({ ...onlineusers[i] })
            const logOffMessage = await dataBase.collection("messages").insertOne({
                from: onlineusers[i].name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('YYYY-MM-DDTHH:mm:ssZ')
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
        const updatedUser = await dataBase.collection("users").updateOne({
            "name": user
        }, {
            $set: { "lastStatus": Date.now() }
        })
        res.sendStatus(200);
        return;
    } catch (e) {
        res.sendStatus(404).send("Não foi possível atualizar o status: " + e);
        return;
    }
})

app.listen(5000);