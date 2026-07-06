import { useState } from "react";
import axios from "axios";

function App() {

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyzeURL = async () => {

    try {

      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/analyze",
        {
          url
        }
      );

      setResult(response.data.data);

    } catch (err) {

      alert("Unable to connect to backend.");

    }

    setLoading(false);

  };

  return (

    <div style={{padding:"40px",fontFamily:"Arial"}}>

      <h1>Email & URL Sandbox</h1>

      <input
        type="text"
        placeholder="https://example.com"
        value={url}
        onChange={(e)=>setUrl(e.target.value)}
        style={{
          width:"500px",
          padding:"12px"
        }}
      />

      <br/><br/>

      <button onClick={analyzeURL}>

        Analyze URL

      </button>

      <br/><br/>

      {

        loading &&

        <h3>Analyzing inside Sandbox...</h3>

      }

      {

        result &&

        <div>

          <h2>Analysis Completed</h2>

          <p><b>Title :</b> {result.vmResponse.title}</p>

          <p><b>URL :</b> {result.vmResponse.url}</p>

          <p><b>Status :</b> {result.vmResponse.status}</p>

        </div>

      }

    </div>

  );

}

export default App;