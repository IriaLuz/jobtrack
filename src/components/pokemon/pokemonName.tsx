import { useEffect, useState } from "react";

type Pokemon = { name: string; url: string };
type PokemonResponse = { results: Pokemon[] };

type RequestState =
  | { status: "loading" }
  | { status: "success"; data: PokemonResponse }
  | { status: "error" }


const PokemonName = () => {
  // const [data, setData] = useState<PokemonResponse | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(false);

  const [state, setState] = useState<RequestState>({ status: "loading" })

  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchData = async () => {
        try {
          const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }
          const json = await res.json() as PokemonResponse;
          // setData(json);
          setState({ status: "success", data: json })
        } catch (e) {
          // setError(true);
          setState({ status: "error" })
          console.error(`Failed load profile ${e}`);
        }
      };
      fetchData();
    }, 5000);

    return () => clearTimeout(timer)
  }, []);

  if (state.status === "loading") return <p>Loading...</p>;
  if (state.status === "error") return <p>There is a problem finding pokemons</p>;
  return (
    <div>
      <h3>Fetching pokemon name</h3>
      <ul>
        {state.data.results.map((pokemon) => (
          <li key={pokemon.name}>{pokemon.name}</li>
        ))}
      </ul>
    </div>
  );
};
export default PokemonName;
