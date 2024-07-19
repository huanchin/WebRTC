import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { server, io } from "../server"; // 假設 server.js 位於上級目錄
import Client from "socket.io-client";

let clientSocket;

beforeAll((done) => {
  const port = server.address().port;
  clientSocket = Client(`http://localhost:${port}`);
  clientSocket.on("connect", done);
});

afterAll(() => {
  io.close();
  server.close();
  clientSocket.close();
});

describe("Socket.IO server", () => {
  test("should join a room and be notified new user connect", (done) => {
    const roomId = "testRoom";
    const peerId = "testPeer";

    clientSocket.emit("join-room", roomId, peerId);

    clientSocket.on("user-connected", (id) => {
      expect(id).toBe(peerId);
      done();
    });
  });

  test("should run code and return output", (done) => {
    const roomId = "testRoom";
    const code = 'print("Hello, World!")';
    const language = "python";
    const expectedOutput = "Hello, World!\n";

    clientSocket.emit("join-room", roomId, "testPeer");
    clientSocket.emit("runCode", code, language);

    clientSocket.on("output", (output) => {
      expect(output).toBe(expectedOutput);
      done();
    });
  });

  test("should stop screen share", (done) => {
    const roomId = "testRoom";
    const peerId = "testPeer";

    clientSocket.emit("join-room", roomId, peerId);
    clientSocket.emit("stop-screen-share", peerId);

    clientSocket.on("no-share", (id) => {
      expect(id).toBe(peerId);
      done();
    });
  });

  test("should send and receive messages", (done) => {
    const roomId = "testRoom";
    const message = "Hello, everyone!";
    const sender = "testSender";
    const color = "#000000";
    const time = new Date().toISOString();

    clientSocket.emit("join-room", roomId, "testPeer");
    clientSocket.emit("message", message, sender, color, time);

    clientSocket.on("createMessage", (msg, sndr, clr, t) => {
      expect(msg).toBe(message);
      expect(sndr).toBe(sender);
      expect(clr).toBe(color);
      expect(t).toBe(time);
      done();
    });
  });

  test("should handle user leaving the meeting", (done) => {
    const roomId = "testRoom";
    const peerId = "testPeer";
    const peerName = "testName";

    clientSocket.emit("join-room", roomId, peerId);
    clientSocket.emit("leave-meeting", peerId, peerName);

    clientSocket.on("user-leave", (id, name) => {
      expect(id).toBe(peerId);
      expect(name).toBe(peerName);
      done();
    });
  });
});
