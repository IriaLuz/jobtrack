import "./App.css";
import { useSession } from "./auth/sessionStore";
import { AuthPage } from "./pages/auth-page/auth-page";
import { BoardPage } from "./pages/board-page/board-page";

// Two screens chosen by whether someone is signed in, so no router is needed yet.
function App() {
  const session = useSession();

  return session ? <BoardPage session={session} /> : <AuthPage />;
}

export default App;
