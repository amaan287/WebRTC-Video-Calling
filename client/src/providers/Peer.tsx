import {
  createContext,
  ReactNode,
  useEffect,
  useContext,
  useState,
  useCallback,
} from "react";

interface PeerProviderProps {
  children: ReactNode;
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

const PeerContext = createContext<PeerContextType | null>(null);

export const usePeer = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
};

export const PeerProvider = ({ children }: PeerProviderProps) => {
  const [otherUserStream, setOtherUserStream] = useState<MediaStream | null>(
    null
  );

  // Create a function to create a new peer connection
  const createPeerConnection = () => {
    return new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
      ],
    });
  };

  const [peer, setPeer] = useState<RTCPeerConnection>(() =>
    createPeerConnection()
  );
  const handleNewUserJoined = useCallback(async (event: RTCTrackEvent) => {
    const streams = event.streams;
    console.log("Got stream", streams);
    setOtherUserStream(streams[0]);
  }, []);
  const resetPeerConnection = useCallback(() => {
    // Close the existing peer connection
    if (peer) {
      peer.close();
    }
    // Create a new peer connection
    const newPeer = createPeerConnection();
    // Re-add event listeners
    newPeer.addEventListener("track", handleNewUserJoined);
    newPeer.addEventListener("connectionstatechange", () => {
      console.log("Peer connection state:", newPeer.connectionState);
      if (newPeer.connectionState === "failed") {
        resetPeerConnection();
      }
    });

    setPeer(newPeer);
    return newPeer;
  }, [handleNewUserJoined, peer]);

  async function createOffer() {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  const createAnswer = async (offer: RTCSessionDescriptionInit) => {
    try {
      // Ensure the peer is in a state to set a remote description
      if (
        peer.signalingState !== "stable" &&
        peer.signalingState !== "have-remote-offer"
      ) {
        console.warn(
          "Cannot create answer. Current state:",
          peer.signalingState
        );
        resetPeerConnection();
      }
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      return answer;
    } catch (error) {
      console.error("Error in createAnswer:", error);
      resetPeerConnection();
      throw error;
    }
  };

  const setRemoteAns = async (answer: RTCSessionDescriptionInit) => {
    try {
      console.log(
        "Current signaling state before setRemote description:",
        peer.signalingState
      );
      // Check the current connection state before setting remote description
      if (peer.signalingState === "have-local-offer") {
        console.warn(
          "unexpected signaling state for setting remote answer:",
          peer.signalingState
        );
        resetPeerConnection();
      }
      await peer.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error setting remote answer:", error);
      resetPeerConnection();
      throw error;
    }
  };

  const sendStream = async (stream: MediaStream) => {
    try {
      // Remove existing tracks before adding new ones
      peer.getSenders().forEach((sender) => peer.removeTrack(sender));

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    } catch (error) {
      console.error("Error sending stream:", error);
      throw error;
    }
  };

  useEffect(() => {
    peer.addEventListener("track", handleNewUserJoined);

    // Add error handling
    peer.addEventListener("connectionstatechange", () => {
      console.log("Peer connection state:", peer.connectionState);
      if (peer.connectionState === "failed") {
        resetPeerConnection();
      }
    });

    return () => {
      peer.removeEventListener("track", handleNewUserJoined);
    };
  }, [peer, handleNewUserJoined, resetPeerConnection]);

  return (
    <PeerContext.Provider
      value={{
        peer,
        createOffer,
        createAnswer,
        setRemoteAns,
        sendStream,
        otherUserStream,
        resetPeerConnection,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};
