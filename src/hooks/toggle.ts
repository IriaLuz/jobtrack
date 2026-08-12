import { useState, useCallback, useRef } from "react";

type ToggleActions = {
  toggle: () => void;
  reset: () => void;
  setOn: () => void;
  setOff: () => void;
};

const useToggle = (v: boolean = false): [boolean, ToggleActions] => {
  const [value, setValue] = useState(v);

  const initialValue = useRef(v);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue.current);
  }, []);

  const setOn = useCallback(() => {
    setValue(true);
  }, []);
  const setOff = useCallback(() => {
    setValue(false);
  }, []);

  return [value, { toggle, reset, setOn, setOff }];
};

export default useToggle;
