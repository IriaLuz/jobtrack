import { useEffect, useState } from "react";

type UserProps = {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
};

type RequestState =
  | { status: "loading" }
  | { status: "success"; data: UserProps }
  | { status: "error" }


const CardFetch = ({ userId }: { userId: string }) => {

  const [state, setState] = useState<RequestState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      const url = `https://jsonplaceholder.typicode.com/users/${userId}`;
      try {
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`something is wrong: ${res.status}`);
        }

        const json = await res.json() as UserProps;
        setState({ status: "success", data: json })
      } catch (e) {
        if (e instanceof Error) {
          if (e.name === "AbortError") return;

          setState({ status: "error" });
          console.error(`Download error: ${e.message}`);
        } else {
          console.error('unknown error ', e)
          setState({ status: "error" });
        }
      }
    };
    fetchData();
    return () => {
      controller.abort();
    };
  }, [userId]);
  if (state.status === "error") return <h3>error</h3>;

  if (state.status === "loading") return <h3>loading...</h3>;


  return (
    <>
      <h1>CardFetch</h1>
      <div>user: {JSON.stringify(state.data)}</div>;
    </>)


};

export default CardFetch;
