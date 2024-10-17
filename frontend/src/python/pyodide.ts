import { PyodideInterface } from "pyodide";
import { createContext } from "react";

export const PyodideContext = createContext<PyodideInterface | any>(null);
