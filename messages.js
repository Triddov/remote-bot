export default class Message{

    constructor(username) {
        this.username = username || ""

        this.help = `
        This is remote access bot for my raspberry pi. It able to run linux commands you writen\n
        /start — start bot session
        /logoff — end current session and require password again 
        /help — show up this message
        `
        this.unauthorized = `❌ ${username} Seems like you're not the user you're supposed to be, aren't it?`
        this.passwordRequired = `🔐 Please enter the password to access:`
        this.passwordAccept = `✅ Password accepted. You can now enter commands`
        this.logoff = `🚪 You're out. Re-enter the password`
        this.commandError = `❌ Error:\n`
        this.commandSuccess = `✅ The command was executed without output`
    }
}
