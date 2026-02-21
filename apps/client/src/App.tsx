import Home from "@/pages/Home";
import RoomContainer from "@/pages/RoomContainer";
import { BrowserRouter, Route, Routes } from "react-router";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="" element={<Home />} />
        <Route path="room" element={<RoomContainer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
