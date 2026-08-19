import { useQuery, queryOptions } from "@tanstack/react-query";

interface CountriesProps {
    alpha2Code: string
    flag: string
    name: string,
}


const fetchCountries = async ({ signal }: { signal: AbortSignal }) => {
    const res = await fetch(
        "https://countries.dev/countries", { signal }
    );
    if (!res.ok) throw new Error(`Server returned ${res.status}`)
    const json = await res.json() as CountriesProps[]
    return json
}

const countriesOptions = queryOptions({
    queryKey: ['countries'],
    queryFn: fetchCountries,
})

const CountryList = () => {

    const { isPending, isError, data, error } = useQuery(countriesOptions)


    if (isPending) {
        return <span>Loading ...</span>
    }

    if (isError) {
        return <span>Error: {error.message}</span>
    }

    console.log(data)

    return (
        <div className="flex flex-col items-start text-start gap-2  border-[#2e303a] border max-w-xl p-4">

            <ul>
                {data.map((country) => (
                    <li key={country.alpha2Code}>{country.name}{country.flag}</li>
                ))}
            </ul>
        </div>
    )
}

export default CountryList