import { CHANNELS, sendAndReceive, sendMessage } from "./electron.js";
import { displaySong } from "./songData.js";

document.querySelectorAll("#headerImg").forEach(img => {
    img.addEventListener("click", () => {
        sendMessage(CHANNELS.openLink.send, img.getAttribute("location"));
    });
});

document.addEventListener("DOMContentLoaded", async ()=> {
    var version = await sendAndReceive(CHANNELS.getVersion);
    version = version.replace("-","--")
    var color;
    if(version.includes("dev")){
        color = "red"
    } else if(version.includes("alpha")){
        color = "orange"
    } else {
        color = "green"
    }
    const url = `https://img.shields.io/badge/installed-v${version}-${color}`
    console.log(url)
    document.getElementById("version").src = url;
    var result = await sendAndReceive(CHANNELS.playlistStatus);
    if(result.status == "complete"){
        document.getElementById("songDataForm").classList.remove("hidden");
        displaySong(0);
    }
    aniBackground();
})

window.addEventListener("resize", setBackground);
document.onload = setBackground();

function setBackground(){
    // Get the width of the first-level div (background > div)
    const backgroundDiv = document.querySelector('.background > div');
    const backgroundWidth = backgroundDiv.offsetWidth;
    // Get the width of the second-level div, including margins
    const secondLevelDiv = document.querySelector('.background > div > div');
    const secondLevelDivWidth = secondLevelDiv.offsetWidth + parseFloat(getComputedStyle(secondLevelDiv).marginLeft) + parseFloat(getComputedStyle(secondLevelDiv).marginRight);
    // Calculate how many second-level divs can fit horizontally inside the first-level div
    const numDivs = Math.floor(backgroundWidth / secondLevelDivWidth);
    // Get the width of the first-level div (background > div)
    const backgroundHeight = backgroundDiv.offsetWidth;
    // Get the width of the second-level div, including margins
    const secondLevelDivHeight = secondLevelDiv.offsetHeight + parseFloat(getComputedStyle(secondLevelDiv).marginTop) + parseFloat(getComputedStyle(secondLevelDiv).marginBottom);
    // Calculate how many second-level divs can fit horizontally inside the first-level div
    const numDivsHeight = Math.floor(backgroundHeight / secondLevelDivHeight);
    const total = numDivs * numDivsHeight + 2;
    var container = document.getElementById("backgroundDivs")
    if(container.children.length != total){
        container.innerHTML = "";
        for(let i = 0; i<total; i++){
            var div = document.createElement("div");
            container.appendChild(div);
        }
    }
    
}

document.getElementById("aniBackground").addEventListener("change", aniBackground)
document.getElementById("export").addEventListener("click", exportData);
document.getElementById("zipCheck").addEventListener("change", toggleZip);

function toggleZip(){
    document.getElementById("zipCodeDiv").classList.toggle("hidden");
    document.getElementById("zipCode").value = ""
}

function aniBackground(){
    console.log("Changed")
    var bg = document.getElementById("backgroundDivs")
    document.getElementById("aniBackground").checked ? bg.classList.add("animateBackground") : bg.classList.remove("animateBackground");
}

function exportData(event){
    event.preventDefault();
    console.log("Exporting data");
    const  data = document.getElementById("result").innerHTML;
    const config = {
        zipCode: document.getElementById("zipCode").value,
        fooLocation: document.getElementById("fooLocation").value
    }

    sendMessage(CHANNELS.updateConfig.send, config);

    sendMessage(CHANNELS.exportData.send, data);
 
}

document.getElementById("showSelector").addEventListener("click", function(event) {
    event.preventDefault();
    toggleSelector(true);
});
document.getElementById("hideSelector").addEventListener("click", function(event) {
    event.preventDefault();
    toggleSelector(false);
});
function toggleSelector(show){
    var selector = document.getElementById("songSelector");
    if(show){
        selector.classList.remove("hidden2");
        document.getElementById("generateSelector").click()
    } else {
        selector.classList.add("hidden2");
    }
}

var songSelector = document.getElementById("songSelector");

window.addEventListener("click", function(event){
    if (!songSelector.contains(event.target) && event.target.id != "showSelector") {
        toggleSelector(false);
    }
});