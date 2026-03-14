'use strict';


localStorage.setItem("isSunny", "true");
const isSunny = localStorage.getItem("isSunny");
const message = document.getElementById('message');
const button = document.getElementById('task')
const iamge = document.getElementById('cat')

function setEvent() {
    cat.src = "happyCat.png"
    message.textContent = "Yay!"
}

if (isSunny === "true"){
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

document.getElementById('task').addEventListener('click', setEvent);
