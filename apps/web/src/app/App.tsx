import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { AppRoutes } from "./routes";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
};

export default App;
