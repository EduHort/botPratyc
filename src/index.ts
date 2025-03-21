import client from "../util/client";

client.on('message', async (message) => {
    if (message.fromMe) {
        console.log(message.body);
    }
});
