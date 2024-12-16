async function displaySong(index){
    const data = await (await fetch(`/getSongData-${index}`)).json();
    document.getElementById("title").innerHTML = data.title;
    document.getElementById("artist").innerHTML = data.artist;
    document.getElementById("album").innerHTML = data.album;
    document.getElementById("currentIndexInput").value = index;
}


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

    console.log(totalElement.innerHTML);
    
    if(direction === 'next' && Number(currentElement.innerHTML) >= Number(totalElement.innerHTML)) {
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
