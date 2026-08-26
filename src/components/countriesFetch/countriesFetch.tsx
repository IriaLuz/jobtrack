import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";

interface CountriesProps {
    alpha2Code: string
    flag: string
    name: string,
}

interface CountryDetailProps {
    name: string,
    alpha2Code: string
    population: number
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

const fetchCountryByCode = async ({ queryKey, signal }: { queryKey: [string, string], signal: AbortSignal }) => {
    const res = await fetch(`https://countries.dev/alpha/${queryKey[1]}`, { signal })
    if (!res.ok) throw new Error(`Server returned ${res.status}`)
    const json = await res.json() as CountryDetailProps
    return json
}

const CountryList = () => {
    const [countryCode, setCountryCode] = useState("")

    const countryDetails = queryOptions({
        queryKey: ['country', countryCode],
        queryFn: fetchCountryByCode,
        enabled: !!countryCode
    })


    const { isPending, isError, data, error } = useQuery(countriesOptions)
    const { data: dataCountry, isError: dataCountryIsError, isPending: dataCountryIsPending, error: dataCountryError } = useQuery(countryDetails)


    if (isPending) {
        return <span>Loading ...</span>
    }

    if (isError) {
        return <span>Error: {error.message}</span>
    }



    return (
        <div className="text-start">
            <h1>TanSrack practice</h1>
            <div className="flex flex-row items-start text-start gap-2  border-[#2e303a] border max-w-xl p-4">
                <ul>
                    {data.map((country) => (
                        <li onClick={() => { setCountryCode(country.alpha2Code) }} key={country.alpha2Code}>{country.name}{country.flag}</li>
                    ))}
                </ul>
                {countryCode && dataCountryIsPending && <span>Loading ...</span>}
                {countryCode && dataCountryIsError && <span>Error: {dataCountryError.message}</span>}
                {dataCountry && <ul>
                    <p>{dataCountry.name}, tiene una poblacion de: {dataCountry.population} </p>
                </ul>}
            </div>
        </div>
    )
}

export default CountryList