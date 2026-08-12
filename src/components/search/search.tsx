import { useState } from "react";
import useDebounce from "../../hooks/useDebounce";

interface MessageProps {
  message: string
}

const data: MessageProps[] = [
  { message: "hola" },
  { message: "que tal" },
  { message: "example" },
  { message: "exercise" },
];

const Search = () => {
  const [query, setQuery] = useState("");
  const debouncedTextValue = useDebounce(query, 300);

  const handleOnchange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setQuery(input);
  };

  const filteredItems = data.filter((item) =>
    item.message.startsWith(debouncedTextValue)
  );

  return (
    <div className="flex flex-col gap-6">
      <h3>Searchable/filterable list</h3>
      <input
        className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
        onChange={handleOnchange}
        placeholder="type to search"
      />

      {filteredItems.length > 0 ? (
        <ul className="border-[#2e303a] border rounded flex flex-col items-start py-1.5 px-3 w-full">
          {filteredItems.map((item, i) => (
            <li key={i}>{item.message}</li>
          ))}
        </ul>
      ) : (
        <p>Item not found!</p>
      )}
    </div>
  );
};

export default Search;
