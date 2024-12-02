import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import SocketProvider from "./providers/Socket";
import Room from "./pages/Room";
import { PeerProvider } from "@/providers/Peer";

function App() {
  return (
    //All the routes will be defined in the Routes component
    <>
      <SocketProvider>
        <PeerProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/signup" element={<Signin />} />
            <Route path="/signin" element={<Signup />} />
          </Routes>
        </PeerProvider>
      </SocketProvider>
    </>
  );
}

export default App;
