import "./App.css";
import { Card } from "./components/card/card";
import { mockJobs } from "./mocks/jobs";
function App() {
  return (
    <>
      <h1>Hello World</h1>
      <Card job={mockJobs[0]} />
    </>
  );
}

export default App;
