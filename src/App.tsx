import "./App.css";
import Column from "./components/column/column";
import { mockJobs } from "./mocks/jobs";
function App() {

  const filteredJobsByStatus = (jobStatus: string) => mockJobs.filter(j => j.status === jobStatus)
  return (
    <div className="flex flex-row items-start gap-2  border-[#2e303a] border rounded-2xl  p-4">
      <Column status="saved" jobs={filteredJobsByStatus('saved')} />
      <Column status="applied" jobs={filteredJobsByStatus('applied')} />
      <Column status="interviewing" jobs={filteredJobsByStatus('interviewing')} />
      <Column status="offered" jobs={filteredJobsByStatus('offered')} />
      <Column status="rejected" jobs={filteredJobsByStatus('rejected')} />
    </div>
  );
}

export default App;
