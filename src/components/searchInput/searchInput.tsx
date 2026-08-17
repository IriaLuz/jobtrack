import { useState, useEffect } from "react";
import useDebounce from "../../hooks/useDebounce";

interface SearchInputProps {
  onSearch: (query: string) => void;
}

const SearchInput = ({ onSearch }: SearchInputProps) => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <div className="flex flex-col items-start justify-start ">
      <h3>Debounced Search Input</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="border-[#2e303a] border rounded py-1.5 px-3 h-min"
      />
    </div>
  );
};

export default SearchInput;
