import { useState } from "react";
import useLocalStorage from "../../hooks/useLocalStorage";

const initialValues = {
  name: "",
  password: "",
  email: "",
  age: "",
  favoriteDay: "",
};

const Form = () => {
  const [userData, setUserData] = useLocalStorage(
    "user details",
    initialValues
  );
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(JSON.stringify({ ...userData, password }));
    setUserData(initialValues);
  };

  return (
    <form className="max-w-xl" onSubmit={handleSubmit}>
      <h3>Controller form with validation</h3>
      <div className="flex flex-col items-start gap-2  border-[#2e303a] border max-w-xl p-4">
        <fieldset className="flex flex-row gap-2 border-[#2e303a] border rounded py-1.5 px-3 w-full">
          <legend>Are you older than 18?</legend>
          <input
            type="radio"
            required
            name="ageSelector"
            id="yes"
            value="yes"
          />
          <label htmlFor="yes">Yes</label>
          <input type="radio" required name="ageSelector" id="no" value="no" />
          <label htmlFor="no">No</label>
        </fieldset>
        <label htmlFor="age">How older are you?</label>
        <input
          id="age"
          required
          type="number"
          name="age"
          value={userData.age}
          placeholder="add your age"
          onChange={(e) => setUserData({ ...userData, age: e.target.value })}
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
          min={18}
          max={120}
        />

        <label className="" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          required
          type="text"
          name="name"
          value={userData.name}
          placeholder="add name here"
          onChange={(e) => setUserData({ ...userData, name: e.target.value })}
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
          minLength={4}
        />
        <label className="" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          required
          type="password"
          name="password"
          value={password}
          placeholder="add password here"
          onChange={(e) => setPassword(e.target.value)}
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
        />
        <label className="" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          required
          type="email"
          name="email"
          value={userData.email}
          placeholder="add email here"
          onChange={(e) => setUserData({ ...userData, email: e.target.value })}
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
        />
        <label htmlFor="day">What is your favorite day of the week?</label>
        <input
          type="text"
          id="day"
          name="fruit"
          list="week"
          required
          pattern="[Mm]onday|[Tt]uesday|[Ww]ednesday|[Tt]hursday|[Ff]riday"
          onChange={(e) =>
            setUserData({
              ...userData,
              favoriteDay: e.target.value.toLowerCase(),
            })
          }
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full"
        />
        <datalist id="week">
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
        </datalist>

        <button
          className="border-[#2e303a] border rounded py-1.5 px-3 w-full bg-[rgba(47,48,58,0.5)] cursor-pointer hover:shadow-(--shadow)"
          type="submit"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default Form;
