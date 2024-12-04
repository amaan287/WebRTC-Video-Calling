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
  const { socket } = useSocket();
  const [remoteEmailId, setRemoteEmailId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const {
    peer,
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
      const ans = await createAnswer(offer);
      socket.emit("call-accepted", { emailId: from.emailId, answer: ans });
      setRemoteEmailId(from.emailId);
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
  }, [sendStream]);
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
  return (
    <div>
      <Button onClick={() => myStream && sendStream(myStream)}>Join</Button>
      <h1>Roompage</h1>
      <h2>you are connected to {remoteEmailId}</h2>
      {myStream && (
        <ReactPlayer
          url={myStream}
          playing
          controls
          width="100%"
          height="100%"
        />
      )}
      {otherUserStream && (
        <ReactPlayer
          url={otherUserStream}
          playing
          controls
          width="100%"
          height="100%"
        />
      )}
    </div>
  );
}
