// quartz/layouts/graph.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../components/types"
import Head from "../components/Head"
import Graph from "../components/Graph" // Import the official, built-in component

const GraphPage: QuartzComponent = (props) => {
  // This layout does nothing but render the Head and the official Graph component.
  return (
    <div class="graph-body">
      <Head {...props} />
      <Graph {...props} />
    </div>
  )
}

GraphPage.css = `
  .graph-body {
    height: 100vh;
    width: 100vw;
    margin: 0;
    overflow: hidden;
  }
  /* The built-in Graph component creates its own container, so we make sure it fills our new body */
  .graph-body .graph-container {
    height: 100%;
    width: 100%;
  }
`

export default (() => GraphPage) satisfies QuartzComponentConstructor