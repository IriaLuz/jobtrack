import "./App.css";
import Column from "./components/column/column";
import { mockJobs } from "./mocks/jobs";
import { STATUSES } from "./types/job";
function App() {

  const filteredJobsByStatus = (jobStatus: string) => mockJobs.filter(j => j.status === jobStatus)
  return (
    <div className="flex flex-row items-start gap-2  border-[#2e303a] border rounded-2xl  p-4">
      {STATUSES.map(status => {
        return (
          <Column status={status} jobs={filteredJobsByStatus(status)} />
        )
      })}
    </div>
  );
}

export default App;
