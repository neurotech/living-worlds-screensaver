import { ipcRenderer } from "electron";

export const api = {
	sendQuit: () => ipcRenderer.sendSync("sendQuit"),
};

var dev = false;

if (!dev) {
	document.addEventListener("keydown", api.sendQuit);
	document.addEventListener("mousedown", api.sendQuit);

	// Also quit on mouse movement, but delay mousemove tracking, otherwise we'll close immediately
	setTimeout(() => {
		const threshold = 5;
		document.addEventListener("mousemove", (e) => {
			if (
				threshold * threshold <
				e.movementX * e.movementX + e.movementY * e.movementY
			) {
				api.sendQuit();
			}
		});
	}, 3000);
}
