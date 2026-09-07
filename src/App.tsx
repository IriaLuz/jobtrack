import "./App.css";
import { Board } from "./components/board/board";
import { mockJobs } from "./mocks/jobs";
import { STATUSES } from "./types/job";
function App() {

  return (
    <>
      <Board statuses={STATUSES} jobs={mockJobs} />
    </>
  );
}

export default App;
