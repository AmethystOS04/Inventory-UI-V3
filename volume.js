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
const volumePercent = document.getElementById("volumePercent");
const volumeStorageKey = "inventoryMusicVolumeV1";
let currentSong = -1;
const storedVolume = localStorage.getItem(volumeStorageKey);
let savedVolume = storedVolume === null ? 50 : Number(storedVolume);
if (!Number.isFinite(savedVolume) || savedVolume < 0 || savedVolume > 100) savedVolume = 50;
slider.value = String(savedVolume);
bgm.volume = savedVolume / 100;
volumePercent.textContent = `${savedVolume}%`;

function saveMusicVolume() {
    const volume = Number(slider.value);
    if (!Number.isFinite(volume)) return;
    bgm.volume = volume / 100;
    volumePercent.textContent = `${volume}%`;
    localStorage.setItem(volumeStorageKey, String(volume));
}

// Play audio on first user interaction (required by Chrome's autoplay policy)
document.addEventListener("click", () => {
    bgm.play();
}, { once: true });

slider.addEventListener("input", saveMusicVolume);
slider.addEventListener("change", saveMusicVolume);

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
