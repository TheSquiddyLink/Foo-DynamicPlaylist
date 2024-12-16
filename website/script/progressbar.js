console.log("Hello World")
document.getElementById("form").addEventListener("submit", submitForm);

async function submitForm(event) {

    event.preventDefault();
    const formData = new FormData(document.querySelector('form'));

    document.querySelector(".progressStats").style.display = "block";
    
    var processing = true;

    fetch('/getPlaylist', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        processing = false;
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
}

async function updateData(){
    let data = await fetch("/playlistStatus");
    let jsonData = await data.json()
    let percentage = jsonData.percentage;
    console.log(percentage);
    document.querySelector(".progress").style.width = percentage + "%";

    document.getElementById("total").innerHTML = jsonData.total;
    document.getElementById("remaining").innerHTML = jsonData.remaining;
    document.getElementById("elapsed").innerHTML = jsonData.elapsed;
    document.getElementById("failed").innerHTML = jsonData.failed;
}

function wait(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}