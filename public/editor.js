import * as Y from "yjs";
import { CodemirrorBinding } from "y-codemirror";
import { WebrtcProvider } from "y-webrtc";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/lib/codemirror.css";

// Create a Yjs document
const ydoc = new Y.Doc();
console.log("ydoc: ", ydoc);

// Custom WebRTC provider options
const signalingServers = ["ws://localhost:8080"]; // Change to your signaling server

// Connect to the WebRTC provider
const provider = new WebrtcProvider(ROOM_ID, ydoc, {
  signaling: signalingServers,
});
console.log("RoomID: ", ROOM_ID);
console.log("provider: ", provider);

// Create a shared Yjs text type
const yText = ydoc.getText("codemirror");
console.log("yText: ", yText);

// Bind Yjs text type to CodeMirror
const binding = new CodemirrorBinding(yText, editor, provider.awareness);
console.log("binding: ", binding);

// Optional: Set user information for awareness
provider.awareness.setLocalStateField("user", {
  name: "Anonymous",
});
