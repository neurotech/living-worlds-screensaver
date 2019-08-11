var ipc = require("electron").ipcRenderer;

var sendQuit = function() {
  ipc.send("sendQuit");
};

window.addEventListener("load", function onLoad() {
  setTimeout(() => {
    CC.init();
  }, 2250);
});

var dev = false;

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
