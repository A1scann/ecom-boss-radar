import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
