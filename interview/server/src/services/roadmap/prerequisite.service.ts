import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { Topic } from '../../models/Topic';
import { TopicPrerequisite, type TopicPrerequisiteDoc } from '../../models/TopicPrerequisite';

/**
 * Builds an adjacency list and in-degree map for a set of topics and their prerequisites.
 */
export async function getPrerequisiteGraph(scopeTopicIds?: (string | mongoose.Types.ObjectId)[]) {
  const query: any = {};
  if (scopeTopicIds && scopeTopicIds.length > 0) {
    const objectIds = scopeTopicIds.map((id) => new mongoose.Types.ObjectId(id));
    query.$or = [{ topicId: { $in: objectIds } }, { prerequisiteTopicId: { $in: objectIds } }];
  }

  const edges = await TopicPrerequisite.find(query).lean();
  return edges;
}

/**
 * Checks whether adding a directed edge (prerequisiteTopicId -> topicId) would introduce a cycle.
 */
export async function wouldIntroduceCycle(
  topicId: string | mongoose.Types.ObjectId,
  prerequisiteTopicId: string | mongoose.Types.ObjectId,
): Promise<boolean> {
  const tid = String(topicId);
  const pid = String(prerequisiteTopicId);

  if (tid === pid) return true;

  // Fetch all existing prerequisite edges
  const allEdges = await TopicPrerequisite.find({}).lean();
  const adj = new Map<string, string[]>();

  for (const edge of allEdges) {
    const from = String(edge.prerequisiteTopicId);
    const to = String(edge.topicId);
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push(to);
  }

  // Add hypothetical edge
  if (!adj.has(pid)) adj.set(pid, []);
  adj.get(pid)!.push(tid);

  // DFS cycle detection starting from tid to see if we can reach pid
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(curr: string): boolean {
    visited.add(curr);
    recursionStack.add(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(curr);
    return false;
  }

  // Test reachable from pid
  return dfs(pid);
}

/**
 * Configures a new prerequisite relationship with circular dependency rejection.
 */
export async function addPrerequisite(
  topicId: string | mongoose.Types.ObjectId,
  prerequisiteTopicId: string | mongoose.Types.ObjectId,
  dependencyType: 'mandatory' | 'recommended' = 'mandatory',
  notes = '',
): Promise<TopicPrerequisiteDoc> {
  const tid = String(topicId);
  const pid = String(prerequisiteTopicId);

  if (tid === pid) {
    throw new AppError(400, 'A topic cannot be a prerequisite of itself', 'SELF_PREREQUISITE');
  }

  const [topic, prereqTopic] = await Promise.all([Topic.findById(tid), Topic.findById(pid)]);

  if (!topic || !prereqTopic) {
    throw new AppError(404, 'One or both specified topics do not exist', 'TOPIC_NOT_FOUND');
  }

  const hasCycle = await wouldIntroduceCycle(tid, pid);
  if (hasCycle) {
    throw new AppError(
      400,
      `Cannot add prerequisite: circular dependency detected between "${prereqTopic.name}" and "${topic.name}"`,
      'CIRCULAR_PREREQUISITE_DEPENDENCY',
    );
  }

  try {
    const doc = await TopicPrerequisite.create({
      topicId: new mongoose.Types.ObjectId(tid),
      prerequisiteTopicId: new mongoose.Types.ObjectId(pid),
      dependencyType,
      notes,
    });
    return doc;
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new AppError(409, 'This prerequisite relationship already exists', 'DUPLICATE_PREREQUISITE');
    }
    throw err;
  }
}

/**
 * Removes an existing prerequisite relationship.
 */
export async function removePrerequisite(prerequisiteId: string | mongoose.Types.ObjectId) {
  const result = await TopicPrerequisite.findByIdAndDelete(prerequisiteId);
  if (!result) {
    throw new AppError(404, 'Prerequisite relationship not found', 'PREREQUISITE_NOT_FOUND');
  }
  return result;
}

/**
 * Performs Kahn's algorithm topological sort on a set of topic IDs.
 * Guarantees that every prerequisite topic appears strictly before any dependent topic.
 * When priorityScoreMap is provided, prioritizes higher-priority unlocked topics first,
 * breaking ties deterministically using topic display order and name.
 */
export async function topologicalSortTopics(
  topicIds: (string | mongoose.Types.ObjectId)[],
  priorityScoreMap?: Map<string, number>,
): Promise<{ orderedTopicIds: mongoose.Types.ObjectId[]; hasCycle: boolean }> {
  if (topicIds.length <= 1) {
    return {
      orderedTopicIds: topicIds.map((id) => new mongoose.Types.ObjectId(id)),
      hasCycle: false,
    };
  }

  const topicIdSet = new Set(topicIds.map((id) => String(id)));
  const objectIdList = Array.from(topicIdSet).map((id) => new mongoose.Types.ObjectId(id));

  // Retrieve topic metadata for deterministic tie-breaking
  const topics = await Topic.find({ _id: { $in: objectIdList } }).lean();
  const topicMap = new Map<string, any>(topics.map((t) => [String(t._id), t]));

  // Retrieve relevant prerequisite edges
  const edges = await TopicPrerequisite.find({
    topicId: { $in: objectIdList },
    prerequisiteTopicId: { $in: objectIdList },
  }).lean();

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const tid of topicIdSet) {
    inDegree.set(tid, 0);
    adj.set(tid, []);
  }

  for (const edge of edges) {
    const u = String(edge.prerequisiteTopicId);
    const v = String(edge.topicId);
    adj.get(u)!.push(v);
    inDegree.set(v, (inDegree.get(v) || 0) + 1);
  }

  // Priority queue / sorted buffer for 0 in-degree nodes (priority descending, then displayOrder, then name)
  const ready: string[] = [];
  for (const [tid, deg] of inDegree.entries()) {
    if (deg === 0) {
      ready.push(tid);
    }
  }

  const sortReady = () => {
    ready.sort((a, b) => {
      if (priorityScoreMap) {
        const prioA = priorityScoreMap.get(a) ?? 0;
        const prioB = priorityScoreMap.get(b) ?? 0;
        if (Math.abs(prioB - prioA) > 1e-6) {
          return prioB - prioA;
        }
      }
      const topicA = topicMap.get(a);
      const topicB = topicMap.get(b);
      const orderA = topicA?.displayOrder ?? 0;
      const orderB = topicB?.displayOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = topicA?.name || '';
      const nameB = topicB?.name || '';
      return nameA.localeCompare(nameB);
    });
  };

  sortReady();

  const ordered: mongoose.Types.ObjectId[] = [];

  while (ready.length > 0) {
    const u = ready.shift()!;
    ordered.push(new mongoose.Types.ObjectId(u));

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const newDeg = (inDegree.get(v) || 0) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        ready.push(v);
        sortReady();
      }
    }
  }

  const hasCycle = ordered.length !== topicIdSet.size;
  return { orderedTopicIds: ordered, hasCycle };
}

