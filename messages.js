export default class Message{

    constructor(username) {
        this.username = username || ""

        this.help = `
        This is remote access bot for my raspberry pi. It able to run linux commands you writen\n
        /start — start bot session
        /logoff — end current session and require password again 
        /help — show up this message
        /lan — write wakeonlan command
        /killbash — kill current bash-session
        /newbash — new bash-session
        `
        this.unauthorized = `❌ ${username} Seems like you're not the user you're supposed to be, aren't it?`
        this.passwordRequired = `🔐 Please enter the password to access:`
        this.passwordAccept = `✅ Password accepted. You can now enter commands`
        this.logoff = `🚪 You're out. Re-enter the password`
        this.commandError = `❌ Error:\n`
        this.wakeOnLan = `wakeonlan -i 192.168.1.255 18:c0:4d:a2:05:79`
        this.commandSuccess = `✅ The command was executed without output`
        this.newBash = `Spawn new bash-session. Now write your command`
        this.emptyBash = `No active bash-session`
        this.stopBash = `Bash-session stopped by hands`
        this.endBash = `Bash-session ended`
        this.tooLong = `Command execution is way too long. Bash-session killed`
        this.tooUnactive = `Bash-session terminated due to inactivity`
    }
}
