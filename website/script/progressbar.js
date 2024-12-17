console.log("Hello World")
document.getElementById("form").addEventListener("submit", submitForm);
document.getElementById("browse").addEventListener("click", browse);
document.getElementById("stop").addEventListener("click", stop);

async function browse(event){
    event.preventDefault();
    var path = await fetch('/promptFileInput');
    var result = await path.text();
    document.getElementById("playlist").value = result;
}

function stop(event){
    event.preventDefault();
    fetch('/stopPlaylist');
}


async function submitForm(event) {

    event.preventDefault();

    document.getElementById("formSubmit").disabled = true;
    document.getElementById("stop").disabled = false;

    const formData = new FormData(document.getElementById("form"));

    document.querySelector(".progressStats").classList.remove("hidden");
    
    var processing = true;

    fetch('/getPlaylist', {
        method: 'POST',
        body: formData
    })
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
    displaySong(0)
}

async function updateData(){
    let data = await fetch("/playlistStatus");
    let jsonData = await data.json()
    let percentage = jsonData.percentage;
    console.log(percentage);
    document.querySelector(".progress").style.width = percentage + "%";

    document.getElementById("total").innerHTML = jsonData.total;
    document.getElementById("remaining").innerHTML = jsonData.remaining;
    document.getElementById("elapsed").innerHTML = formatTime(jsonData.elapsed);
    document.getElementById("failed").innerHTML = jsonData.failed;

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