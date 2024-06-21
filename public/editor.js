import * as Y from "yjs";
import { CodemirrorBinding } from "y-codemirror";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/lib/codemirror.css";

// Create a Yjs document
const ydoc = new Y.Doc();
console.log("ydoc: ", ydoc);

console.log("RoomID: ", ROOM_ID);

// Create a shared Yjs text type
const yText = ydoc.getText("codemirror");
console.log("yText: ", yText);

// Bind Yjs text type to CodeMirror
const binding = new CodemirrorBinding(yText, window.editor);
console.log("binding: ", binding);

socket.on("syncDoc", (update) => {
  Y.applyUpdate(ydoc, new Uint8Array(update));
});

ydoc.on("update", (update) => {
  socket.emit("docUpdate", Array.from(update));
});

socket.on("docUpdate", (update) => {
  Y.applyUpdate(ydoc, new Uint8Array(update));
});
