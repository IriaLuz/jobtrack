import { useEffect, useState } from "react";

const PokemonName = () => {
  const [data, setData] = useState();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const fetchData = async () => {
        try {
          const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");
          const json = await res.json();
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }
          setData(json);
        } catch (e) {
          setError(true);
          console.error(`Failed load profile ${e}`);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, 5000);
  }, []);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>There is a problem finding pokemons</p>;
  return (
    <div>
      <h3>Fetching pokemon name</h3>
      <ul>
        {data.results.map((pokemon) => (
          <li key={pokemon.name}>{pokemon.name}</li>
        ))}
      </ul>
    </div>
  );
};
export default PokemonName;
