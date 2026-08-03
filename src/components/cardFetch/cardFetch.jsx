import { useEffect, useState } from "react";

const CardFetch = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      const url = `https://jsonplaceholder.typicode.com/users/${userId}`;
      try {
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`something is wrong: ${res.status}`);
        }

        const json = await res.json();

        setData(json);
        setLoading(false);
      } catch (e) {
        if (e.name === "AbortError") return;

        setError(e.message);
        setLoading(false);
        console.error(`Download error: ${e.message}`);
      }
    };
    fetchData();
    return () => {
      controller.abort();
    };
  }, [userId]);
  if (error) return <h3>error</h3>;

  if (loading) return <h3>loading</h3>;

  return <div>user: {JSON.stringify(data)}</div>;
};

export default CardFetch;
