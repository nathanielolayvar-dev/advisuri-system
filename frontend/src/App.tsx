import { useEffect, useState } from "react";
import { API_URL } from "./api";

interface HealthResponse {
  status: string;
  app: string;
}

function App() {
  const [data, setData] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health/`)
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>React + Django Connected</h1>
      {data ? (
        <>
          <p>Status: {data.status}</p>
          <p>App: {data.app}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default App;
