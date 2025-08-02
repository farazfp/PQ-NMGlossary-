// quartz/layouts/graph.tsx (The Simpler, Better Way)
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../components/types"
import Head from "../components/Head"
import Graph from "../components/Graph" // Import the BUILT-IN Graph component

const GraphPage: QuartzComponent = (props) => {
  return (
    <div id="quartz-root" class="graph-page">
      <Head {...props} />
      <body data-slug={props.fileData.slug}>
        <div class="graph-container">
          <Graph {...props} />
        </div>
      </body>
    </div>
  )
}

GraphPage.css = `
.graph-page body {
  margin: 0; /* Remove default body margin */
}
.graph-container {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}
/* This is important to override default content padding */
.graph-page .page > .content {
    padding: 0;
}
`

export default (() => {
  return GraphPage
}) satisfies QuartzComponentConstructor