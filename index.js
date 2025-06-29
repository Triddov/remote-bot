import TelegramBot from 'node-telegram-bot-api'
import { spawn, exec } from 'child_process'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import BotMessage from "./messages.js"
import logger from './logger.js'

dotenv.config({path: '.env'})
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
        logger.warn(`login attempt: ${chatId} ${firstName} ${username}`)
        return bot.sendMessage(chatId, Messages.unauthorized)
    }

    if (!session[chatId]) {
        session[chatId] = { authenticated: false, shell: null, buffer: '', timeoutHandle: null, commandTimeoutHandle: null }
    }

    const userSession = session[chatId]

    const clearAllTimeouts = () => {
        clearTimeout(userSession.timeoutHandle)
        clearTimeout(userSession.commandTimeoutHandle)
    }

    const stopShell = () => {
        if (userSession.shell) userSession.shell.kill()
        userSession.shell = null
        clearAllTimeouts()
    }

    const resetInactivityTimeout = () => {
        clearTimeout(userSession.timeoutHandle)
        userSession.timeoutHandle = setTimeout(() => {
            stopShell()
            bot.sendMessage(chatId, Messages.tooUnactive)
        }, INACTIVITY_TIMEOUT)
    }

    const resetCommandTimeout = () => {
        clearTimeout(userSession.commandTimeoutHandle)
        userSession.commandTimeoutHandle = setTimeout(() => {
            stopShell()
            bot.sendMessage(chatId, Messages.tooLong)
        }, INACTIVITY_TIMEOUT)
    }

    const startShell = () => {
        stopShell()
        userSession.shell = spawn('bash', [], { stdio: 'pipe' })
        userSession.buffer = ''

        userSession.shell.stdout.on('data', (data) => {
            userSession.buffer += data.toString()
        })

        userSession.shell.stderr.on('data', (data) => {
            userSession.buffer += data.toString()
        })

        userSession.shell.on('close', () => {
            stopShell()
        })

        resetInactivityTimeout()
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

    logger.info(`${text} ${(username !== "triddov") ? username : ""}`)

    switch (text) {
        case '/start':
            return bot.sendMessage(chatId, Messages.passwordRequired)
        case '/help':
            return bot.sendMessage(chatId, Messages.help)
        case '/logoff':
            userSession.authenticated = false
            stopShell()
            return bot.sendMessage(chatId, Messages.logoff)
        case '/lan':
            exec(Messages.wakeOnLanCommand)
            return bot.sendMessage(chatId, Messages.commandSuccess)
        case '/killbash':
            if (userSession.shell) {
                stopShell()
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
        resetCommandTimeout()

        setTimeout(() => {
            const output = userSession.buffer.trim() || Messages.commandSuccess
            if (userSession.shell) bot.sendMessage(chatId, output)
        }, 500)
    }
})
