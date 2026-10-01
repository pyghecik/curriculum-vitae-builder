import "./App.css";
import A4Page from "./components/a4page";
import AllData from "./components/allData";

function App() {
  return (
    <div className="min-h-screen bg-stone-200">
      <main className="ml-[min(35vw,30rem)] min-h-screen px-5 py-8 max-sm:ml-6 max-sm:px-2 sm:px-8">
        <A4Page />
      </main>
      <AllData />
    </div>
  );
}

export default App;
