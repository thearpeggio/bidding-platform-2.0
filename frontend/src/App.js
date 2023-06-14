import "./App.css";
import Auction from "./components/Auction";
import Bidder from "./components/Bidder";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auction" element={<Auction />} />
        <Route path="/bidder" element={<Bidder />} />
      </Routes>
    </Router>
  );
};

export default App;
