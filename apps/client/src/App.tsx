import Home from "@/pages/Home";
import RoomContainer from "@/pages/RoomContainer";
import { useRoomSync } from "@/hooks/useRoomSync";
import { BrowserRouter, Route, Routes } from "react-router";

function AppShell() {
  useRoomSync();

  return (
    <Routes>
      <Route path="" element={<Home />} />
      <Route path="room" element={<RoomContainer />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
