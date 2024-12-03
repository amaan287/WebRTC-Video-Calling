import { createContext, ReactNode, useContext, useMemo } from "react";

interface PeerProviderProps {
  children: ReactNode;
}

interface PeerContextType {
  peer: RTCPeerConnection;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
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

  return (
    <PeerContext.Provider value={{ peer, createOffer }}>
      {children}
    </PeerContext.Provider>
  );
};
