import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSocket } from "@/providers/Socket";
import { useNavigate } from "react-router-dom";

interface JoinRoomPayload {
  roomId: string;
  emailId: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [email, setEmail] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const handleRoomJoined = ({ roomId, emailId }: JoinRoomPayload) => {
    // Redirect to room page
    navigate(`/room/${roomId}`);
    console.log(`Joined room ${roomId} as ${emailId}`);
  };

  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
  }, [socket]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !roomCode) {
      alert("Please enter both email and room code");
      return;
    }
    if (!socket) {
      alert("Socket not found");
      return;
    }
    // Emit join-room event
    socket.emit("join-room", {
      roomId: roomCode,
      emailId: email,
    });
    setEmail("");
    setRoomCode("");
    // Redirect to room page
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Your email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johndoe43@gmail.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Room code
            </Label>
            <Input
              id="code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="9xcdqub2"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            // disabled={!isConnected}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Room
          </Button>
        </form>
        {/* 
        {!isConnected && (
          <div className="mt-4 text-center text-red-500">
            Attempting to connect to server...
          </div>
        )} */}
      </div>
    </div>
  );
}
