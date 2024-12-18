import { CHANNELS, sendMessage } from "./electron.js";

document.querySelectorAll("#headerImg").forEach(img => {
    img.addEventListener("click", () => {
        sendMessage(CHANNELS.openLink.send, img.getAttribute("location"));
    });
});