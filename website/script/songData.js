import { CHANNELS, onMessage, sendAndReceive, sendMessage } from "./electron.js";


export async function displaySong(index){
    console.log("Displaying song: " + index);
    sendMessage(CHANNELS.getSongData.send, index);
    document.getElementById("currentIndex").innerHTML = index + 1;
    document.getElementById("totalSize").innerHTML =  await sendAndReceive(CHANNELS.getTotal);
    var playlistJSON = await sendAndReceive(CHANNELS.getPlaylistJSON);

    document.getElementById("result").innerHTML = playlistJSON;
}

onMessage(CHANNELS.getSongData.reply, (event, arg) => {
    console.log("Got song data");
    console.log(arg);
    const data = arg;
    document.getElementById("title").innerHTML = data.tags.title;
    document.getElementById("artist").innerHTML = data.tags.artist;
    document.getElementById("album").innerHTML = data.tags.album;

    document.getElementById("timeOfDayMorning").checked = data.tags.custom.timeOfDay[0];
    document.getElementById("timeOfDayDay").checked = data.tags.custom.timeOfDay[1];
    document.getElementById("timeOfDayNight").checked = data.tags.custom.timeOfDay[2];
    document.getElementById("tempHot").checked = data.tags.custom.temp.hot;
    document.getElementById("tempCold").checked = data.tags.custom.temp.cold;
    document.getElementById("currentIndexInput").value = data.index;
    document.getElementById("weatherRaining").checked = data.tags.custom.weather.raining;
    document.getElementById("totalSize").innerHTML = data.total;
})


async function changeSong(event, direction) {
    event.preventDefault();

    var total = await sendAndReceive(CHANNELS.getTotal);


    var currentElement = document.getElementById("currentIndex");
    var totalElement = document.getElementById("totalSize");
    
    if (totalElement.innerHTML == "?") {
        totalElement.innerHTML = total
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
    
    const timeOfDay = [
        document.getElementById("timeOfDayMorning").checked,
        document.getElementById("timeOfDayDay").checked,
        document.getElementById("timeOfDayNight").checked
    ];
    
    const index = Number(document.getElementById("currentIndex").innerHTML)-1;

    const temp = {
        hot: document.getElementById("tempHot").checked,
        cold: document.getElementById("tempCold").checked
    }

    const weather = {
        raining: document.getElementById("weatherRaining").checked,
    }

    const formData ={
        index: index,
        timeOfDay: timeOfDay,
        temp: temp,
        weather: weather
    }

    sendMessage(CHANNELS.setSong.send, formData);
}

document.getElementById("next").addEventListener("click", (event) => changeSong(event, 'next'));
document.getElementById("prev").addEventListener("click", (event) => changeSong(event, 'prev'));
document.getElementById("dataSubmit").addEventListener("click", submitTags);
