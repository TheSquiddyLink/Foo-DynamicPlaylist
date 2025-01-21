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

    const bulkEditing = document.getElementById("bulkEditing").checked;
    if (bulkEditing) {
        const songs = JSON.parse(document.getElementById("bulkArray").innerHTML);
        console.log(songs);
        sendMessage(CHANNELS.bulkSetSongs.send, { songs: songs, data: formData });
    }
    else {
        sendMessage(CHANNELS.setSong.send, formData);
    }
}

async function getFooLocation(event){
    console.log("Getting foo location");
    event.preventDefault(); 
    const response = await sendAndReceive(CHANNELS.setFooLocation);
    document.getElementById("fooLocation").value = response;
    console.log("Got Foo Location:", response)
}

async function generateSelector(){
    console.log("Generating")
    const response = await sendAndReceive(CHANNELS.getPlaylistJSON);
    
    /** @type {Object[]} */
    const data = JSON.parse(response).files;

    const dataDiv = document.getElementById("songSelectorData");
    dataDiv.innerHTML = "";
    
    var albums = Array.from(new Set(data.map(song => song.tags.album)));
    albums.forEach((album, index) => {
        var element = createAlbumElement(album, index);
        dataDiv.appendChild(element);
    });
    console.log(albums)

    data.forEach((song, songIndex) => {
        let index = albums.indexOf(song.tags.album);
        document.getElementById("album-"+index).querySelector(".songsDiv").appendChild(createSongElement(song, index, songIndex));
        console.log("Added Song")
    });
    
}   

function createSongElement(songData, albumIndex, songIndex){
    var element = document.createElement("div")


    var checkBox = document.createElement("input")
    checkBox.setAttribute("type", "checkbox")
    checkBox.name = songIndex;
    checkBox.id = "song-"+albumIndex

    element.classList.add("songDiv")

    var title = document.createElement("label")
    title.innerHTML = songData.tags.title;
    element.appendChild(checkBox)
    element.appendChild(title)
    return element;
}

function createAlbumElement(name, index){
    var element = document.createElement("div")
    element.classList.add("albumDiv")

    var header = document.createElement("div")
    header.classList.add("albumHeader")
    var dropDown = document.createElement("span")
    dropDown.innerHTML = "▼"
    dropDown.classList.add("dropDownIcon")

    var dropDown2 = document.createElement("span")
    dropDown2.innerHTML = "▲"
    dropDown2.classList.add("dropDownIcon2")
    dropDown2.classList.add("hidden")
    header.appendChild(dropDown2)
    
    var nameEle = document.createElement("span")
    nameEle.innerHTML = name;

    element.id = "album-"+index

    var checkBox = document.createElement("input")
    checkBox.setAttribute("type", "checkbox")
    checkBox.addEventListener("change", () => albumChange(index))
    element.appendChild(checkBox)
    header.appendChild(dropDown)
    header.appendChild(nameEle)

    header.addEventListener("click",() => toggleAlbum("album-"+index))

    element.appendChild(header)

    var songs = document.createElement("div")
    songs.classList.add("songsDiv");
    element.appendChild(songs)
    return element;
}

function toggleAlbum(id){
    console.log("Toggling: ", id)
    let element = document.getElementById(id)
    if (element.hasAttribute("open")) {
        element.removeAttribute("open")
    } else {
        element.setAttribute("open", "")
    }
}

function albumChange(index){
    document.querySelectorAll("#song-"+index).forEach(song => {
        song.checked = document.getElementById("album-"+index).querySelector("input").checked
    })
}

function loadSelectedSongs(){
    var data = document.getElementById("songSelectorData");

    var songs = []
    data.querySelectorAll(".songDiv").forEach(song => {
        var input  = song.querySelector("input");
        if (input.checked) {
            songs.push(Number(input.name))
        }
    })

    document.getElementById("data").classList.add("hidden")

    document.getElementById("bulkSize").innerHTML = songs.length;
    document.getElementById("bulkEditing").checked = true
    resetSettings();

    document.getElementById("bulkArray").innerHTML = JSON.stringify(songs);
}

function resetSettings(){
    document.querySelector(".settings").querySelectorAll("input").forEach(input => {
        input.checked = false;
    })
}


function toggleBulkEditing(event){
    if (event.target.checked) {
        document.getElementById("data").classList.add("hidden")
        document.getElementById("bulkData").classList.remove("hidden")
    } else {
        document.getElementById("data").classList.remove("hidden")
        document.getElementById("bulkData").classList.add("hidden")
    }
}
document.getElementById("next").addEventListener("click", (event) => changeSong(event, 'next'));
document.getElementById("prev").addEventListener("click", (event) => changeSong(event, 'prev'));
document.getElementById("dataSubmit").addEventListener("click", submitTags);
document.getElementById("browseFoo").addEventListener("click", getFooLocation);
document.getElementById("generateSelector").addEventListener("click", generateSelector);
document.getElementById("loadSelected").addEventListener("click", loadSelectedSongs)
document.getElementById("bulkEditing").addEventListener("change", toggleBulkEditing)
