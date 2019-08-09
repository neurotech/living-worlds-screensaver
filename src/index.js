var ipc = require("electron").ipcRenderer;

var sendQuit = function() {
  ipc.send("sendQuit");
};

var dev = true;

if (!dev) {
  document.addEventListener("keydown", sendQuit);
  document.addEventListener("mousedown", sendQuit);

  // Also quit on mouse movement, but delay mousemove tracking, otherwise we'll close immediately
  setTimeout(function() {
    var treshold = 5;
    document.addEventListener("mousemove", function(e) {
      if (
        treshold * treshold <
        e.movementX * e.movementX + e.movementY * e.movementY
      ) {
        sendQuit();
      }
    });
  }, 3000);
}

// And now the fun part – the actual thing the screensaver displays. Replace this with your own creation!
// TODO
