import { useSocket } from "@/providers/Socket";
import { useEffect, useCallback } from "react";
import { usePeer } from "@/providers/Peer";

interface JoinRoomPayload {
  roomId: string;
  emailId: string;
}
interface PeerContextType {
  peer: RTCPeerConnection;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
}
export default function Room() {
  const { socket } = useSocket();
  const { peer, createOffer } = usePeer() as unknown as PeerContextType;
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
  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
  }, [handleNewUserJoined, socket]);
  return (
    <div>
      <h1>Roompage</h1>
    </div>
  );
}
