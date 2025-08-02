// quartz/layouts/graph.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../components/types"
import { FullSlug, SimpleSlug, joinSegments } from "../util/path"
import { a, useSpring } from "@react-spring/web"
import { useDrag } from "@use-gesture/react"
import { useEffect, useState, useMemo } from "preact/hooks"
import Head from "../components/Head" // CORRECTED
import Body from "../components/Body" // CORRECTED
import { i18n } from "../i18n"
import * as d3 from "d3" // ADDED

// A lot of this code is straight from the original graph implementation
const ForceGraph: QuartzComponent = ({ allFiles, fileData, cfg }: QuartzComponentProps) => {
  const [nodes, setNodes] = useState<d3.SimulationNodeDatum[]>([])
  const [links, setLinks] = useState<d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]>([])

  const NODE_RADIUS = 8
  const ZOOM_SENSITIVITY = 0.001
  const [transform, setTransform] = useSpring(() => ({
    x: 0,
    y: 0,
    zoom: 1,
  }))

  const nodeData = useMemo(() => {
    const graph = new Map<SimpleSlug, d3.SimulationNodeDatum & { text: string }>()
    for (const file of allFiles) {
      const slug = file.slug
      if (slug.startsWith(".")) continue
      graph.set(slug, {
        id: slug,
        text: file.frontmatter?.title ?? slug,
        tags: file.frontmatter?.tags ?? [],
      })
    }

    const newLinks: d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] = []
    for (const file of allFiles) {
      const slug = file.slug
      if (!file.links || slug.startsWith(".")) continue
      const source = graph.get(slug)
      if (!source) continue
      for (const link of file.links) {
        const target = graph.get(link as SimpleSlug)
        if (target) {
          newLinks.push({ source: source.id, target: target.id })
        }
      }
    }

    setNodes([...graph.values()])
    setLinks(newLinks)
  }, [allFiles])

  const simulation = useMemo(() => {
    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide(NODE_RADIUS * 2))

    sim.on("tick", () => {
      setNodes([...sim.nodes()])
    })

    return sim
  }, [nodes, links])

  const bind = useDrag(({ offset: [x, y], event }) => {
    event.preventDefault()
    setTransform({ x, y })
  })

  const zoom = (e: WheelEvent) => {
    e.preventDefault()
    const { x, y, zoom } = transform.get()
    const newZoom = Math.max(0.1, zoom - e.deltaY * ZOOM_SENSITIVITY)
    setTransform({ x, y, zoom: newZoom })
  }

  return (
    <div class="graph-container" {...bind()} onWheel={zoom}>
      <a.svg
        class="graph"
        style={{
          transform: transform.zoom.to((z) => `scale(${z})`),
          transformOrigin: "center",
        }}
      >
        <a.g
          style={{
            transform: transform.x.to((x) => `translateX(${x}px)`),
          }}
        >
          <a.g
            style={{
              transform: transform.y.to((y) => `translateY(${y}px)`),
            }}
          >
            {links.map((link) => {
              const source = link.source as d3.SimulationNodeDatum & { id: string }
              const target = link.target as d3.SimulationNodeDatum & { id: string }
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
            {nodes.map((node: any) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                class={`graph-node ${node.id === fileData.slug ? "current" : ""}`}
                onClick={() => (window.location.href = joinSegments(cfg.baseUrl, node.id))
                }
              >
                <circle r={NODE_RADIUS} />
                <text y={-NODE_RADIUS - 5} text-anchor="middle">
                  {node.text}
                </text>
              </g>
            ))}
          </a.g>
        </a.g>
      </a.svg>
    </div>
  )
}

const Graph: QuartzComponent = (props) => {
  return (
    <div id="graph-container">
      <ForceGraph {...props} />
    </div>
  )
}

Graph.css = `
#graph-container {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.graph-container {
  height: 100%;
  width: 100%;
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
}

.graph-node > text {
  fill: var(--dark);
  font-size: 0.75rem;
  pointer-events: none;
  user-select: none;
}

.graph-edge {
  stroke: var(--lightgray);
  stroke-width: 1px;
  opacity: 0.5;
}
`

const GraphPage: QuartzComponent = (props) => {
  return (
    <div id="quartz-root" class="graph-page">
      <Head {...props} />
      <Body {...props}>
        <Graph {...props} />
      </Body>
    </div>
  )
}

GraphPage.css = `
.graph-page .page > .content {
  padding: 0;
}
${Graph.css}
`

export default (() => {
  return GraphPage
}) satisfies QuartzComponentConstructor