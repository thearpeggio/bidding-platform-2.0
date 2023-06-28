import "./App.css";
import Clerk from "./components/Clerk";
import Bidder from "./components/Bidder";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Clerk" element={<Clerk />} />
        <Route path="/bidder" element={<Bidder />} />
      </Routes>
    </Router>
  );
};

export default App;
