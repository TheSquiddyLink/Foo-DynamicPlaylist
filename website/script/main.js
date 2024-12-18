import { CHANNELS, sendAndReceive, sendMessage } from "./electron.js";

document.querySelectorAll("#headerImg").forEach(img => {
    img.addEventListener("click", () => {
        sendMessage(CHANNELS.openLink.send, img.getAttribute("location"));
    });
});

document.addEventListener("DOMContentLoaded", async ()=> {
    document.getElementById("version").innerHTML = await sendAndReceive(CHANNELS.getVersion);
})