const songs = [

    {
        file: "inv-music001.mp3",
        name: "Inventory Theme 1"
    },

    {
        file: "inv-music002.mp3",
        name: "Inventory Theme 2"
    },

    {
        file: "inv-music003.mp3",
        name: "Inventory Theme 3"
    },

     {
        file: "inv-music004.mp3",
        name: "Inventory Theme 4"
    }


];

const bgm = document.getElementById("bgm");
const slider = document.getElementById("volumeSlider");
let currentSong = -1;
// Start at 50% volume
bgm.volume = 0.5;

// Play audio on first user interaction (required by Chrome's autoplay policy)
document.addEventListener("click", () => {
    bgm.play();
}, { once: true });

slider.addEventListener("input", () => {
   
});
slider.addEventListener("input", () => {

    bgm.volume = slider.value / 100;

    document.getElementById("volumePercent")
        .textContent = slider.value + "%";
});

function playRandomSong(){

    let newSong;
bgm.pause();
bgm.currentTime = 0;
    do{

        newSong =
            Math.floor(Math.random() * songs.length);

    }while(newSong === currentSong && songs.length > 1);

    currentSong = newSong;

    bgm.src = songs[currentSong].file;

    bgm.play();

    const songNameEl =
        document.getElementById("songName");

    if(songNameEl){

        songNameEl.textContent =
            songs[currentSong].name;
    }
}

document.addEventListener("click", () => {

    playRandomSong();

}, { once: true });

bgm.addEventListener("ended", () => {

    playRandomSong();

});
document
    .getElementById("skipSongBtn")
    .addEventListener("click", () => {

        playRandomSong();

    });