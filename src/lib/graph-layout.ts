import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "LR" | "TB" | "RL" | "BT";

interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Computes deterministic topological hierarchical layout using Dagre graphlib.
 * Prevents node collisions and handles arbitrary DAG branching, forks, and retries.
 */
export function getDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = "LR",
    nodeWidth = 300,
    nodeHeight = 160,
    rankSep = 120,
    nodeSep = 70,
  } = options;

  // Filter out any backdrop/lane nodes from dagre calculations
  const layoutableNodes = nodes.filter((n) => n.type !== "SWIMLANE_LANE");
  const backdropNodes = nodes.filter((n) => n.type === "SWIMLANE_LANE");

  if (layoutableNodes.length === 0) {
    return { nodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: 50,
    marginy: 50,
  });

  layoutableNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  edges.forEach((edge) => {
    // Only add edge if both source and target are in dagreGraph
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const positionedNodes = layoutableNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;

    return {
      ...node,
      position: {
        x: Math.round(nodeWithPosition.x - nodeWidth / 2),
        y: Math.round(nodeWithPosition.y - nodeHeight / 2),
      },
    };
  });

  return {
    nodes: [...backdropNodes, ...positionedNodes],
    edges,
  };
}
