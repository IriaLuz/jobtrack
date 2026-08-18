import { useState } from "react";

import "./App.css";
import Form from "./components/form/form";
import Search from "./components/search/search";
import PokemonName from "./components/pokemon/pokemonName";
import SearchInput from "./components/searchInput/searchInput";
import CardFetch from "./components/cardFetch/cardFetch";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <section id="center">
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <div className="ticks"></div>
      <section className="flex flex-col py-6 px-5" id="spacer">
        <div className="flex flex-row gap-6">
          <Form />
          <Search />
          <PokemonName />
          <SearchInput onSearch={(q) => console.log("onSearch:", q)} />
        </div>
      </section>
      <section className="flex flex-col py-6 px-5" id="spacer">
        <div className="flex flex-row gap-6">
          <CardFetch userId={1} />
        </div>
      </section>
    </>
  );
}

export default App;
