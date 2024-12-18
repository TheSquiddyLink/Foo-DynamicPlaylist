import { CHANNELS, onMessage, sendMessage } from "./electron.js";


export async function displaySong(index){
    console.log("Displaying song: " + index);
    sendMessage(CHANNELS.getSongData.send, index);
}

onMessage(CHANNELS.getSongData.reply, (event, arg) => {
    console.log("Got song data");
    const data = arg;
    document.getElementById("title").innerHTML = data.tags.title;
    document.getElementById("artist").innerHTML = data.tags.artist;
    document.getElementById("album").innerHTML = data.tags.album;

    document.getElementById("timeOfDayMorning").checked = data.tags.custom.timeOfDay[0];
    document.getElementById("timeOfDayDay").checked = data.tags.custom.timeOfDay[1];
    document.getElementById("timeOfDayEvening").checked = data.tags.custom.timeOfDay[2];
    document.getElementById("timeOfDayNight").checked = data.tags.custom.timeOfDay[3];
    document.getElementById("currentIndexInput").value = data.index;
})


async function changeSong(event, direction) {
    event.preventDefault();

    var currentElement = document.getElementById("currentIndex");
    var totalElement = document.getElementById("totalSize");
    
    if (totalElement.innerHTML == "?") {
        totalElement.innerHTML = await (await fetch("/getTotal")).text();
    }

    if (currentElement.innerHTML == "?") {
        currentElement.innerHTML = 1;
    }

    console.log("Total Element",totalElement.innerHTML);
    if(totalElement.innerHTML == "0" || totalElement.innerHTML == "?") {
        alert("No songs in playlist");
    }
    else if(direction === 'next' && Number(currentElement.innerHTML) >= Number(totalElement.innerHTML)) {
        currentElement.innerHTML = 1;
        displaySong(currentElement.innerHTML - 1);
    } else if (direction === 'prev' && Number(currentElement.innerHTML) <= 1) {
        currentElement.innerHTML = totalElement.innerHTML;
        displaySong(currentElement.innerHTML - 1);
    } else {
        var index = direction === 'next' 
        ? Math.min(Number(currentElement.innerHTML), Number(totalElement.innerHTML)) - 1 
        : Math.max(Number(currentElement.innerHTML) - 1, 1);

        currentElement.innerHTML = direction === 'next' ? index + 2 : index;
        displaySong(direction === 'next' ? index + 1 : index - 1);
    }

  
}

function submitTags(event){
    event.preventDefault();
    const formData = new FormData(document.getElementById("songDataForm"));
    fetch('/setSong', {
        method: 'POST',
        body: formData
    })
}

document.getElementById("next").addEventListener("click", (event) => changeSong(event, 'next'));
document.getElementById("prev").addEventListener("click", (event) => changeSong(event, 'prev'));
document.getElementById("songDataForm").addEventListener("submit", submitTags);
