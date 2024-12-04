import {
  createContext,
  ReactNode,
  useEffect,
  useContext,
  useMemo,
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
  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
            ],
          },
        ],
      }),
    []
  );

  async function createOffer() {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }
  const createAnswer = async (offer: RTCSessionDescriptionInit) => {
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  };
  const setRemoteAns = async (answer: RTCSessionDescriptionInit) => {
    await peer.setRemoteDescription(answer);
  };
  const sendStream = async (stream: MediaStream) => {
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
  };
  const handleNewUserJoined = useCallback(async (event: RTCTrackEvent) => {
    const streams = event.streams;
    console.log("Got stream", streams);
    setOtherUserStream(streams[0]);
  }, []);

  useEffect(() => {
    peer.addEventListener("track", handleNewUserJoined);
    return () => {
      peer.removeEventListener("track", handleNewUserJoined);
    };
  }, [peer, handleNewUserJoined]);
  return (
    <PeerContext.Provider
      value={{
        peer,
        createOffer,
        createAnswer,
        setRemoteAns,
        sendStream,
        otherUserStream,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};
