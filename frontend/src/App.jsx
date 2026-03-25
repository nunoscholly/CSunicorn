import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const handleCheck = async () => {
    const res = await fetch("/api/health");
    const data = await res.json();
    setMessage(data.status);
  };

  return (
    <div className="app">
      <h1>CSUnicorn</h1>
      <button onClick={handleCheck}>Check API</button>
      {message && <p>Backend says: {message}</p>}
    </div>
  );
}

export default App;
