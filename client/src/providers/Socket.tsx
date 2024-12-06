import { io, Socket } from "socket.io-client";
import { useMemo, createContext, ReactNode, useContext } from "react";

// Define the type for the context value
interface SocketContextType {
  socket: Socket;
}

// Create the context with a more specific type
const SocketContext = createContext<SocketContextType>({} as SocketContextType);
// Define props interface
interface SocketProviderProps {
  children: ReactNode;
}
//create a custom hook to use the socket
export const useSocket = () => {
  return useContext(SocketContext);
};

// Export the custom hook

export default function SocketProvider({ children }: SocketProviderProps) {
  const socket = useMemo(() => io("http://localhost:8000"), []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
