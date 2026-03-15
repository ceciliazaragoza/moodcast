'use strict';

const isSunny = localStorage.getItem("isSunny")
const message = document.getElementById('message');
const button = document.getElementById('task')
const iamge = document.getElementById('cat')

async function getCurrentWeather() {
return new Promise((resolve, reject) => {
navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;

    // Open-Meteo is free, no API key needed
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;

    const res = await fetch(url);
    const data = await res.json();
    console.log(data)
    // resolve(data.current_weather);
    if (data.current_weather.temperature < 20){
        message.textContent = "The weather looks good today!"
        button.style.display = 'none'
        cat.src = "cat.png"
    } else {
        async function loadAdvise() {
            const response = await fetch('advise.json')
            const data = await response.json();
            const randomAdvise = Math.floor(Math.random() * 8)
            message.textContent = data.calming_techniques[randomAdvise].name + ": " + data.calming_techniques[randomAdvise].instruction
        }
        loadAdvise()

    }
    resolve(data.current_weather)
    },
    reject);
});
}
getCurrentWeather()

function setEvent() {
    cat.src = "happyCat.png"
    message.textContent = "Yay!"
}

// if (isSunny === "true"){
//     message.textContent = "The weather looks good today!"
//     button.style.display = 'none'
//     cat.src = "cat.png"
// } else {
//     async function loadAdvise() {
//         const response = await fetch('advise.json')
//         const data = await response.json();
//         const randomAdvise = Math.floor(Math.random() * 8)
//         message.textContent = data.calming_techniques[randomAdvise].name + ": " + data.calming_techniques[randomAdvise].instruction
//     }
//     loadAdvise()

// }

document.getElementById('task').addEventListener('click', setEvent);
