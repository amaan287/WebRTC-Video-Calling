import { useSocket } from "@/providers/Socket";
import { useEffect, useCallback, useState } from "react";
import { usePeer } from "@/providers/Peer";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";

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
  const [myStream, setMyStream] = useState<MediaStream | null>(null);

  const { socket } = useSocket();
  const {
    peer,
    createOffer,
    createAnswer,
    setRemoteAns,
    sendStream,
    otherUserStream,
  } = usePeer() as unknown as PeerContextType;
  const handleNewUserJoined = useCallback(
    async (data: JoinRoomPayload) => {
      console.log(data);
      const { roomId, emailId } = data;
      console.log(`User ${emailId} has joined room ${roomId}`);
      const offer = await createOffer();
      socket.emit("call-user", { emailId, offer });
    },
    [createOffer, socket]
  );
  const handleIncomingCall = useCallback(
    async (data: incomingCallPayload) => {
      const { from, offer } = data;
      console.log("Incoming call from", from.emailId, offer);
      const ans = await createAnswer(offer);
      socket.emit("call-accepted", { emailId: from.emailId, answer: ans });
    },
    [createAnswer, socket]
  );

  const handleCallAccepted = useCallback(
    async (data: callAcceptedPayload) => {
      console.log("Call accepted", data);
      await setRemoteAns(data.answer);
    },
    [setRemoteAns]
  );
  const getUserMediaStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setMyStream(stream);
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });
  }, [peer]);
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

  useEffect(() => {
    getUserMediaStream();
  });
  return (
    <div>
      <h1>Roompage</h1>
      <Button
        onClick={() => {
          if (myStream) {
            sendStream(myStream);
          }
        }}
      >
        Join the call
      </Button>
      {myStream && <ReactPlayer url={myStream} playing />}
      {otherUserStream && <ReactPlayer url={otherUserStream} playing />}
    </div>
  );
}
