import { QuartzPage } from "../quartz/components/types";import { Graph } from "./Graph";
import "../../quartz/components/styles/global.scss";
import "../../quartz/components/styles/graph.scss";

export const GraphOnly: QuartzComponentConstructor = () => (
  <main
    style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#fff" // White background; adjust as needed
    }}
  >
    <div style={{ width: "90vw", height: "90vh" }}>
      <Graph />
    </div>
  </main>
);

