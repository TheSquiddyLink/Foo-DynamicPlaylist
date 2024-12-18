import { CHANNELS, sendAndReceive, sendMessage } from "./electron.js";

document.querySelectorAll("#headerImg").forEach(img => {
    img.addEventListener("click", () => {
        sendMessage(CHANNELS.openLink.send, img.getAttribute("location"));
    });
});

document.addEventListener("DOMContentLoaded", async ()=> {
    var version = await sendAndReceive(CHANNELS.getVersion);
    version = version.replace("-","--")
    var color = version.includes("alpha") ? "orange" : "green"
    const url = `https://img.shields.io/badge/installed-v${version}-${color}`
    console.log(url)
    document.getElementById("version").src = url;
})