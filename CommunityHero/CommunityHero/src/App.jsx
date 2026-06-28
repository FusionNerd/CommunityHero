import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import RaiseIssue from "./pages/RaiseIssue";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/raise-issue" element={<RaiseIssue />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;