export default function formattedDate(){
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
}
