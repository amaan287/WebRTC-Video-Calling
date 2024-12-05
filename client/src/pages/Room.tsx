import { useSocket } from "@/providers/Socket";
import { useEffect, useCallback, useState } from "react";
import { usePeer } from "@/providers/Peer";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { Camera, Mic, MicOff, VideoOff } from "lucide-react";

interface JoinRoomPayload {
  roomId: string;
  emailId: string;
}

interface PeerContextType {
  peer: RTCPeerConnection;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (
    offer: RTCSessionDescriptionInit
  ) => Promise<RTCSessionDescriptionInit>;
  setRemoteAns: (answer: RTCSessionDescriptionInit) => Promise<void>;
  sendStream: (stream: MediaStream) => Promise<void>;
  otherUserStream: MediaStream | null;
  resetPeerConnection: () => void;
}

interface incomingCallPayload {
  from: { emailId: string };
  offer: RTCSessionDescriptionInit;
}

interface callAcceptedPayload {
  emailId: string;
  answer: RTCSessionDescriptionInit;
}

export default function Room() {
  const { socket } = useSocket();
  const [remoteEmailId, setRemoteEmailId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const {
    peer,
    resetPeerConnection,
    createOffer,
    createAnswer,
    setRemoteAns,
    otherUserStream,
    sendStream,
  } = usePeer() as unknown as PeerContextType;

  const handleNewUserJoined = useCallback(
    async (data: JoinRoomPayload) => {
      console.log(data);
      const { roomId, emailId } = data;
      console.log(`User ${emailId} has joined room ${roomId}`);
      const offer = await createOffer();
      socket.emit("call-user", { emailId, offer });
      setRemoteEmailId(emailId);
    },
    [createOffer, socket]
  );

  const handleIncomingCall = useCallback(
    async (data: incomingCallPayload) => {
      const { from, offer } = data;
      console.log("Incoming call from", from.emailId, offer);
      try {
        // Log current state before creating answer
        console.log(
          "Current signaling state before createAnswer:",
          peer.signalingState
        );

        const ans = await createAnswer(offer);
        socket.emit("call-accepted", { emailId: from.emailId, answer: ans });
        setRemoteEmailId(from.emailId);
      } catch (error) {
        console.error("Error handling incoming call:", error);
        // Optionally reset the peer connection or notify user
        resetPeerConnection();
      }
    },
    [peer.signalingState, createAnswer, socket, resetPeerConnection]
  );

  const handleCallAccepted = useCallback(
    async (data: callAcceptedPayload) => {
      console.log("Call accepted", data);
      try {
        console.log("current signaling state: ", peer.signalingState);
        await setRemoteAns(data.answer);
      } catch (err) {
        console.log("error setting remote answer: ", err);
        resetPeerConnection();
      }
    },
    [peer.signalingState, resetPeerConnection, setRemoteAns]
  );

  const getUserMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert(
        "Unable to access camera or microphone. Please check your permissions."
      );
    }
  }, []);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
    };
  }, [handleNewUserJoined, socket, handleIncomingCall, handleCallAccepted]);

  const handleNegotiation = useCallback(async () => {
    console.log("Negotiation needed");
    const localOffer = peer.localDescription;
    if (localOffer) {
      socket.emit("call-user", { emailId: remoteEmailId, offer: localOffer });
    }
  }, [peer.localDescription, remoteEmailId, socket]);

  useEffect(() => {
    peer.addEventListener("negotiationneeded", handleNegotiation);
    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  });

  useEffect(() => {
    getUserMediaStream();
  }, [getUserMediaStream]);

  const toggleMic = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicMuted;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleCamera = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-4 bg-blue-500 text-white">
          <h1 className="text-2xl font-bold">Video Chat Room</h1>
          {remoteEmailId && (
            <p className="text-sm">Connected to: {remoteEmailId}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-4">
          {myStream && (
            <div className="relative bg-gray-200 rounded-lg overflow-hidden">
              <ReactPlayer
                url={myStream}
                playing
                controls
                width="100%"
                height="400px"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={toggleMic}
                  className={`p-2 rounded-full ${
                    isMicMuted
                      ? "bg-red-500 text-white"
                      : "bg-white text-gray-800"
                  } shadow-lg`}
                >
                  {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-2 rounded-full ${
                    isCameraOff
                      ? "bg-red-500 text-white"
                      : "bg-white text-gray-800"
                  } shadow-lg`}
                >
                  {isCameraOff ? <VideoOff size={24} /> : <Camera size={24} />}
                </button>
              </div>
            </div>
          )}

          {otherUserStream && (
            <div className="bg-gray-200 rounded-lg overflow-hidden">
              <ReactPlayer
                url={otherUserStream}
                playing
                controls
                width="100%"
                height="400px"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 text-center">
          <Button
            onClick={() => myStream && sendStream(myStream)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Join Call
          </Button>
        </div>
      </div>
    </div>
  );
}
