import { sendMessage, onMessage, CHANNELS, sendAndReceive} from "./electron.js";
import { displaySong } from "./songData.js";

console.log("Hello World")
document.getElementById("form").addEventListener("submit", submitForm);
document.getElementById("browse").addEventListener("click", browse);
document.getElementById("stop").addEventListener("click", stop);

async function browse(event){
    event.preventDefault();
    sendMessage(CHANNELS.promptFileInput.send);
}

onMessage(CHANNELS.promptFileInput.reply, (event, arg) => {
    console.log("Got reply");
    console.log(arg);
    document.getElementById("playlist").value = arg;
});



function stop(event){
    event.preventDefault();
    sendMessage(CHANNELS.stopPlaylist.send);
}

onMessage(CHANNELS.getPlaylist.reply, (event, args) => {
    console.log('Success:', args);
    document.getElementById("result").innerHTML = JSON.stringify(args, null, 2);
    document.getElementById("formSubmit").disabled = false;
    document.getElementById("stop").disabled = true;
    document.getElementById("songDataForm").classList.remove("hidden");
    updateData();
    document.querySelector(".progress").style.width = "100%";
    document.getElementById("currentIndex").innerHTML = 1;
    document.getElementById("totalSize").innerHTML = args.files.length;
    document.getElementById("songDataForm").classList.remove("hidden");
    if(document.getElementById("totalSize").innerHTML == "0") {
        alert("No songs in playlist");
        return;
    }
    displaySong(0);
})

async function submitForm(event) {

    event.preventDefault();

    document.getElementById("formSubmit").disabled = true;
    document.getElementById("stop").disabled = false;

    document.querySelector(".progressStats").classList.remove("hiddenOpacity");
    
    var hideErrors = document.getElementById("hideErrors").checked;
    console.log(hideErrors);
    sendMessage(CHANNELS[hideErrors ? 'getPlaylistHE': 'getPlaylist'].send, document.getElementById("playlist").value);

    var remaining = parseInt(document.getElementById("remaining").innerHTML);

    console.log("Begining Loop")
    while(remaining > 0) {
        console.log("Remaining: " + remaining);
        await wait(250);
        await updateData()
        remaining = parseInt(document.getElementById("remaining").innerHTML);
    }

    /*
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        document.getElementById("result").innerHTML = JSON.stringify(data, null, 2);
        processing = false;
        document.getElementById("formSubmit").disabled = false;
        document.getElementById("stop").disabled = true;
    })
    .catch((error) => {
        console.error('Error:', error);
        processing = false;
    });

    while(processing) {
        updateData();

        await wait(1000);
    }
    updateData();
    document.querySelector(".progress").style.width = "100%";
    document.getElementById("currentIndex").innerHTML = 1;
    document.getElementById("totalSize").innerHTML = await (await fetch("/getTotal")).text();
    document.getElementById("songDataForm").classList.remove("hidden");
    if(document.getElementById("totalSize").innerHTML == "0") {
        alert("No songs in playlist");
        return;
    }
    displaySong(0)
    */
}

async function updateData(){
    let data = await sendAndReceive(CHANNELS.playlistStatus);
    let percentage = data.percentage;
    console.log(percentage);
    document.querySelector(".progress").style.width = percentage + "%";
    let failedPercentage = data.failed / (data.total - data.remaining)
    document.querySelector(".failed").style.width = failedPercentage * 100 + "%";
    document.getElementById("total").innerHTML = data.total;
    document.getElementById("remaining").innerHTML = data.remaining;
    document.getElementById("elapsed").innerHTML = formatTime(data.elapsed);
    document.getElementById("failed").innerHTML = data.failed;

}

function formatTime(ms){
    let miliseconds = Math.floor(ms % 1000);
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor(ms / (1000 * 60));
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${miliseconds.toString().padStart(3, '0')}`;
}

function wait(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}