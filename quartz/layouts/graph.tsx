// quartz/layouts/graph.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../components/types"
import { SimpleSlug, joinSegments } from "../util/path"
import { a, useSpring } from "@react-spring/web"
import { useDrag } from "@use-gesture/react"
import { useEffect, useState, useMemo } from "preact/hooks"
import Head from "../components/Head"
import * as d3 from "d3"

// Define types for our graph data
type Node = d3.SimulationNodeDatum & {
  id: SimpleSlug
  text: string
}

type Link = d3.SimulationLinkDatum<Node>

const ForceGraph: QuartzComponent = ({ allFiles, fileData, cfg }: QuartzComponentProps) => {
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])

  const [transform, setTransform] = useSpring(() => ({
    x: 0,
    y: 0,
    zoom: 1,
  }))

  // Recalculate graph data when files change
  useEffect(() => {
    const nodeMap = new Map<SimpleSlug, Node>()
    for (const file of allFiles) {
      const slug = file.slug
      if (slug.startsWith(".")) continue
      nodeMap.set(slug, {
        id: slug,
        text: file.frontmatter?.title ?? slug,
      })
    }

    const newLinks: Link[] = []
    for (const file of allFiles) {
      const source = nodeMap.get(file.slug)
      if (source && file.links) {
        for (const link of file.links) {
          const target = nodeMap.get(link as SimpleSlug)
          if (target) {
            newLinks.push({ source: source.id, target: target.id })
          }
        }
      }
    }

    setNodes([...nodeMap.values()])
    setLinks(newLinks)
  }, [allFiles])

  // Run D3 simulation
  useEffect(() => {
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id))
      .force("charge", d3.forceManyBody().strength(-40))
      .force("center", d3.forceCenter())
      .on("tick", () => {
        setNodes([...nodes])
      })

    return () => simulation.stop()
  }, [nodes, links])

  const bind = useDrag(({ offset: [x, y], event }) => {
    event.preventDefault()
    setTransform({ x, y })
  })

  const zoom = (e: WheelEvent) => {
    e.preventDefault()
    const { x, y, zoom } = transform.get()
    const newZoom = Math.max(0.1, zoom - e.deltaY * 0.001)
    setTransform({ x, y, zoom: newZoom })
  }

  return (
    <div class="graph-container" {...bind()} onWheel={zoom}>
      <a.svg
        class="graph"
        style={{
          transform: transform.zoom.to((z) => `scale(${z})`),
        }}
      >
        <a.g style={{ x: transform.x, y: transform.y }}>
          {links.map((link) => {
            const source = link.source as Node
            const target = link.target as Node
            return (
              <line
                key={`${source.id}-${target.id}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                class="graph-edge"
              />
            )
          })}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              class={`graph-node ${node.id === fileData.slug ? "current" : ""}`}
              onClick={() => (window.location.href = joinSegments(cfg.baseUrl, node.id))}
            >
              <circle r={6} />
              <text y={-12} text-anchor="middle">
                {node.text}
              </text>
            </g>
          ))}
        </a.g>
      </a.svg>
    </div>
  )
}

// This is the actual page layout component
const GraphPage: QuartzComponent = (props) => {
  return (
    <div id="quartz-root" class="graph-page">
      <Head {...props} />
      <body data-slug={props.fileData.slug}>
        <ForceGraph {...props} />
      </body>
    </div>
  )
}

// We attach the CSS directly to the component
GraphPage.css = `
.graph-page body {
  margin: 0; /* Remove default body margin */
}
.graph-container {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--light);
  cursor: move;
}
.graph {
  height: 100%;
  width: 100%;
}
.graph-node {
  cursor: pointer;
  fill: var(--gray);
  transition: fill 0.2s ease-in-out;
}
.graph-node:hover {
  fill: var(--secondary);
}
.graph-node.current {
  fill: var(--secondary);
  filter: drop-shadow(0px 0px 3px var(--secondary));
}
.graph-node > text {
  fill: var(--dark);
  font-size: 0.7rem;
  pointer-events: none;
  user-select: none;
}
.graph-edge {
  stroke: var(--lightgray);
  stroke-width: 1.5px;
  opacity: 0.8;
}
`

export default (() => {
  return GraphPage
}) satisfies QuartzComponentConstructor