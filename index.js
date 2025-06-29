'use strict'

import TelegramBot from 'node-telegram-bot-api'
import { spawn } from 'child_process'
import { writeFile } from 'fs/promises'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import BotMessage from "./messages.js"
import formattedDate from "./getDate.js"

dotenv.config()
const BOT_TOKEN = process.env.BOT_TOKEN
const CHAT_ID = process.env.CHAT_ID
const PASSWD_HASH = process.env.PASSWD_HASH

const INACTIVITY_TIMEOUT = 5 * 60 * 1000  // 5 минут

const session = {
    [CHAT_ID]: {
        authenticated: false,
        shell: null,
        buffer: '',
        timeoutHandle: null,
        commandTimeoutHandle: null
    }
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true })


bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const username = msg.from.username
    const firstName = msg.from.first_name
    const text = msg.text?.trim()

    const Messages = new BotMessage(username)

    if (chatId !== parseInt(CHAT_ID)) {
        await writeFile("./access.log", `[${formattedDate()}] - login attempt: ${chatId} ${firstName} ${username}\n`,
            { encoding: "utf8", flag: "a" })
        return bot.sendMessage(chatId, Messages.unauthorized)
    }

    if (!session[chatId]) {
        session[chatId] = { authenticated: false, shell: null, buffer: '', timeoutHandle: null, commandTimeoutHandle: null }
    }

    const userSession = session[chatId]


    const startShell = () => {
        if (userSession.shell) userSession.shell.kill()

        userSession.shell = spawn('bash', [], { stdio: 'pipe' })
        userSession.buffer = ''

        userSession.shell.stdout.on('data', (data) => {
            userSession.buffer += data.toString()
            resetInactivityTimeout()
        })

        userSession.shell.stderr.on('data', (data) => {
            userSession.buffer += data.toString()
            resetInactivityTimeout()
        })

        userSession.shell.on('close', () => {
            userSession.shell = null
            clearTimeout(userSession.timeoutHandle)
            clearTimeout(userSession.commandTimeoutHandle)
        })

        resetInactivityTimeout()
    }

    // Сброс таймера неактивности
    const resetInactivityTimeout = () => {
        clearTimeout(userSession.timeoutHandle)
        userSession.timeoutHandle = setTimeout(() => {
            if (userSession.shell) {
                userSession.shell.kill()
                userSession.shell = null
                bot.sendMessage(chatId, Messages.tooUnactive)
            }
        }, INACTIVITY_TIMEOUT)
    }

    if (!userSession.authenticated) {
        if (await bcrypt.compare(text, PASSWD_HASH)) {
            userSession.authenticated = true
            startShell()
            return bot.sendMessage(chatId, Messages.passwordAccept)
        } else {
            return bot.sendMessage(chatId, Messages.passwordRequired)
        }
    }

    await writeFile("./history.log", `[${formattedDate()}] - ${text} ${(username !== "triddov") ? username : ""}\n`,
        { encoding: "utf8", flag: "a" })

    switch (text) {
        case '/start':
            return bot.sendMessage(chatId, Messages.passwordRequired)
        case '/help':
            return bot.sendMessage(chatId, Messages.help)
        case '/logoff':
            userSession.authenticated = false
            if (userSession.shell) userSession.shell.kill()
            userSession.shell = null
            clearTimeout(userSession.timeoutHandle)
            clearTimeout(userSession.commandTimeoutHandle)
            return bot.sendMessage(chatId, Messages.logoff)
        case '/lan':
            return bot.sendMessage(chatId, Messages.wakeOnLan)
        case '/killbash':
            if (userSession.shell) {
                userSession.shell.kill()
                userSession.shell = null
                clearTimeout(userSession.timeoutHandle)
                return bot.sendMessage(chatId, Messages.stopBash)
            }
            return bot.sendMessage(chatId, Messages.emptyBash)
        case '/newbash':
            startShell()
            return bot.sendMessage(chatId, Messages.newBash)
    }

    if (userSession.shell) {
        userSession.buffer = ''
        resetInactivityTimeout()

        userSession.shell.stdin.write(text + '\n')

        clearTimeout(userSession.commandTimeoutHandle)
        userSession.commandTimeoutHandle = setTimeout(() => {
            if (userSession.shell) {
                userSession.shell.kill()
                userSession.shell = null
                bot.sendMessage(chatId, Messages.tooLong)
            }
        }, INACTIVITY_TIMEOUT)

        setTimeout(() => {
            const output = userSession.buffer.trim() || Messages.commandSuccess
            if (userSession.shell) bot.sendMessage(chatId, output)
        }, 500)
    }
})
