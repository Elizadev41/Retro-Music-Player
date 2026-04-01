const song = document.getElementById("song");
const game = document.getElementById("game");

let score = 0;

// BPM + BEATS
const bpm = 150;
const beatInterval = 60 / bpm;
const beats = [];

// Generate beats for the first ~80 seconds.
for (let i = 0; i < 200; i++) {
  beats.push(i * beatInterval);
}

//  START GAME
function startGame() {
  song.currentTime = 0;
  song.play();
}

// SHOOT BALL FUNCTION
function shootBall(ball, perfect = false, miss = false) {
  let position = 50;
  let target = miss ? 350 : 500;

  let shootInterval = setInterval(() => {
    position += 5;
    ball.style.bottom = position + "px";

    if (position >= target) {
      ball.remove();
      clearInterval(shootInterval);
    }
  }, perfect ? 12 : 18);
}

// 🎮 INPUT SYSTEM (SPACE = SHOOT)
document.addEventListener("keydown", (e) => {
  if (e.key === " ") {

    let currentTime = song.currentTime;

    // find closest beat
    let closestBeat = beats.reduce((a, b) =>
      Math.abs(b - currentTime) < Math.abs(a - currentTime) ? b : a
    );

    let diff = Math.abs(currentTime - closestBeat);

    let feedback = "";

    // create ball
    let ball = document.createElement("div");
    ball.classList.add("ball");
    game.appendChild(ball);

    // TIMING LOGIC
    if (diff < 0.1) {
      feedback = "PERFECT 🔥";
      score += 100;
      shootBall(ball, true);
    } else if (diff < 0.25) {
      feedback = "GOOD 👍";
      score += 50;
      shootBall(ball);
    } else {
      feedback = "MISS 💀";
      shootBall(ball, false, true);
    }

    // update UI
    document.getElementById("feedback").innerText = feedback;
    document.getElementById("score").innerText = `Score: ${score}`;
  }
});
