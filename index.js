'use strict'

import TelegramBot from 'node-telegram-bot-api'
import { exec } from 'child_process'
import { writeFile } from 'fs/promises'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import BotMessage from "./messages.js"
import formattedDate from "./getDate.js"


dotenv.config()
const BOT_TOKEN = process.env.BOT_TOKEN
const CHAT_ID = process.env.CHAT_ID
const PASSWD_HASH = process.env.PASSWD_HASH


// === Состояние авторизации по chat_id ===
const session = {
    [CHAT_ID]: {
        authenticated: false
    }
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true })


// главный обработчик
bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const username = msg.from.username
    const firstName = msg.from.first_name
    const text = msg.text?.trim()

    const Messages = new BotMessage(username)

    if (chatId !== parseInt(CHAT_ID)) {
        await writeFile("./access.log", `[${formattedDate()}] - login attempt: ${chatId} ${firstName} ${username}\n`
            , { encoding: "utf8", flag: "a" })
        return bot.sendMessage(chatId, Messages.unauthorized)
    }

    if (!session[chatId]) {
        session[chatId] = { authenticated: false }
    }

    // Команды без авторизации
    if (!session[chatId].authenticated) {
        if (await bcrypt.compare(text, PASSWD_HASH)) {
            session[chatId].authenticated = true
            return bot.sendMessage(chatId, Messages.passwordAccept)

        } else {
            return bot.sendMessage(chatId, Messages.passwordRequired)
        }
    }

    await writeFile("./history.log", `[${formattedDate()}] - ${text} ${(username!=="triddov")? username : ""}\n`
        , { encoding: "utf8", flag: "a" })

    // дефолтные команды
    switch (text) {
        case '/start':
            return bot.sendMessage(chatId, Messages.passwordRequired)
        case '/help':
            return bot.sendMessage(chatId, Messages.help)
        case '/logoff':
            session[chatId].authenticated = false
            return bot.sendMessage(chatId, Messages.logoff)
    }

    // выполнение shell-команды
    exec(text, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
            return bot.sendMessage(chatId, Messages.error + error.message)
        }

        let output = stderr || stdout || Messages.commandSuccess
        bot.sendMessage(chatId, output)
    })
})
