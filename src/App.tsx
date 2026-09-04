import "./App.css";
import { Board } from "./components/board/board";
import Column from "./components/column/column";
import { mockJobs } from "./mocks/jobs";
import { STATUSES } from "./types/job";
function App() {

  const filteredJobsByStatus = (jobStatus: string) => mockJobs.filter(j => j.status === jobStatus)
  return (
    <>
      <Board >
        {STATUSES.map((status, i) => {
          return (
            <Column key={i} status={status} jobs={filteredJobsByStatus(status)} />
          )
        })}
      </Board>
    </>
  );
}

export default App;
