// quartz/layouts/graph.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../components/types"
import { FullSlug, SimpleSlug, joinSegments } from "../util/path"
import { a, useSpring } from "@react-spring/web"
import { useDrag } from "@use-gesture/react"
import { useEffect, useState, useMemo } from "preact/hooks"
import { Head } from "../components/Head"
import { Body } from "../components/Body"
import { i18n } from "../i18n"
import { filter } from "d3-array"

// A lot of this code is straight from the original graph implementation
const ForceGraph: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [edges, setEdges] = useState<EdgeData[]>([])
  const [prevNode, setPrevNode] = useState<NodeData | null>(null)
  const [currentNode, setCurrentNode] = useState<NodeData | null>(null)
  const [showEdges, setShowEdges] = useState(true)

  const NODE_RADIUS = 8
  const ZOOM_SENSITIVITY = 0.001
  const [graphTransform, setGraphTransform] = useSpring(() => ({
    x: 0,
    y: 0,
    zoom: 1,
  }))

  const nodeData = useMemo(() => {
    const graph = new Map<SimpleSlug, NodeData>()
    for (const file of allFiles) {
      const slug = file.slug
      if (slug.startsWith(".")) continue
      graph.set(slug, {
        id: slug,
        text: file.frontmatter?.title ?? slug,
        tags: file.frontmatter?.tags ?? [],
        x: 0,
        y: 0,
        isCurrent: slug === fileData.slug,
        neighbours: [],
      })
    }

    for (const file of allFiles) {
      const slug = file.slug
      if (!file.links || slug.startsWith(".")) continue
      const curr = graph.get(slug)
      if (!curr) continue
      for (const link of file.links) {
        const target = graph.get(link as SimpleSlug)
        if (!target) continue
        curr.neighbours.push(target)
      }
    }

    return graph
  }, [allFiles])

  useEffect(() => {
    const newNodes = [...nodeData.values()]
    const newEdges: EdgeData[] = []
    for (const node of newNodes) {
      for (const neighbour of node.neighbours) {
        if (node.id < neighbour.id) {
          newEdges.push({ source: node.id, target: neighbour.id })
        }
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
    const current = newNodes.find((node) => node.isCurrent)
    if (current) {
      setCurrentNode(current)
    }
  }, [nodeData])

  const simulation = useMemo(() => {
    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d: any) => d.id))
      .force("charge", d3.forceManyBody().strength(-10))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide(NODE_RADIUS * 2))

    simulation.on("tick", () => {
      setNodes([...simulation.nodes()])
    })

    return simulation
  }, [nodes, edges])

  useEffect(() => {
    if (!currentNode) return
    const node = simulation.nodes().find((node) => node.id === currentNode.id)
    if (!node) return
    node.fx = 0
    node.fy = 0
    simulation.alpha(0.3).restart()
  }, [currentNode])

  const bind = useDrag(({ offset: [x, y], event }) => {
    event.preventDefault()
    setGraphTransform({ x, y })
  })

  const zoom = (e: WheelEvent) => {
    e.preventDefault()
    const { x, y, zoom } = graphTransform.get()
    const newZoom = Math.max(0.1, zoom - e.deltaY * ZOOM_SENSITIVITY)
    setGraphTransform({ x, y, zoom: newZoom })
  }

  return (
    <div class="graph-container" {...bind()} onWheel={zoom}>
      <a.svg
        class="graph"
        style={{
          transform: graphTransform.zoom.to((z) => `scale(${z})`),
          transformOrigin: "center",
        }}
      >
        <a.g
          style={{
            transform: graphTransform.x.to((x) => `translateX(${x}px)`),
          }}
        >
          <a.g
            style={{
              transform: graphTransform.y.to((y) => `translateY(${y}px)`),
            }}
          >
            {showEdges &&
              edges.map((edge) => {
                const source = nodes.find((node) => node.id === edge.source)
                const target = nodes.find((node) => node.id === edge.target)
                if (!source || !target) return null
                const current = currentNode?.id
                const isLinked =
                  source.id === current ||
                  target.id === current ||
                  source.neighbours.some((n) => n.id === current) ||
                  target.neighbours.some((n) => n.id === current)
                return (
                  <line
                    key={`${source.id}-${target.id}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    class={`graph-edge ${isLinked ? "linked" : ""}`}
                  />
                )
              })}
            {nodes.map((node) => {
              const isCurrent = node.id === currentNode?.id
              const isNeighbour = currentNode?.neighbours.some((n) => n.id === node.id)
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => {
                    setPrevNode(currentNode)
                    setCurrentNode(node)
                  }}
                  class={`graph-node ${isCurrent ? "current" : ""} ${isNeighbour ? "neighbour" : ""}`}
                >
                  <circle r={NODE_RADIUS} />
                  <text y={-NODE_RADIUS - 5} text-anchor="middle">
                    {node.text}
                  </text>
                </g>
              )
            })}
          </a.g>
        </a.g>
      </a.svg>
    </div>
  )
}

const Graph: QuartzComponent = (props) => {
  const { cfg } = props
  const title = i18n(cfg.locale).pages.graph.title
  return (
    <div id="graph-container">
      {/* If you don't want the 'Interactive Graph' title, you can delete the next line */}
      <h1>{title}</h1>
      <ForceGraph {...props} />
    </div>
  )
}

// We need to define the styles for our graph.
Graph.css = `
#graph-container {
  height: calc(100vh - 2rem);
  width: 100%;
  position: relative;
  overflow: hidden;
  margin-top: 2rem;
}

#graph-container > h1 {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 2rem;
  z-index: 10;
  color: var(--dark);
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

.graph-node.neighbour {
  fill: var(--tertiary);
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

.graph-edge.linked {
  stroke: var(--tertiary);
  opacity: 1;
}
`

// This is the actual layout component that will be exported.
const GraphPage: QuartzComponent = (props) => {
  return (
    <div id="quartz-root">
      <Head {...props} />
      <Body {...props}>
        <Graph {...props} />
      </Body>
    </div>
  )
}

// We attach the CSS to the page component.
GraphPage.css = Graph.css

export default (() => {
  return GraphPage
}) satisfies QuartzComponentConstructor