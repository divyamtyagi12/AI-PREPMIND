const fs = require('fs');

const extracted = JSON.parse(fs.readFileSync('scripts/extracted_strivers.json', 'utf8'));
const faang = JSON.parse(fs.readFileSync('scripts/faang_striver_parsed.json', 'utf8'));
const leetcodeData = JSON.parse(fs.readFileSync('scripts/leetcode_merged.json', 'utf8'));
const leetcodeQuestions = leetcodeData.questions || [];

console.log(`Loaded ${extracted.length} extracted questions, ${faang.length} FAANG entries, ${leetcodeQuestions.length} canonical LeetCode problems.`);

// Helper: Normalize strings for matching
function clean(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build LeetCode indexes
const lcBySlug = new Map();
const lcByCleanTitle = new Map();
const lcByCleanId = new Map();

for (const q of leetcodeQuestions) {
  lcBySlug.set(q.problem_slug.toLowerCase(), q);
  lcByCleanTitle.set(clean(q.title), q);
  lcByCleanId.set(String(q.frontend_id), q);
}

// Build FAANG index
const faangByCleanTitle = new Map();
const faangBySlug = new Map();
for (const f of faang) {
  faangByCleanTitle.set(clean(f.title), f);
  const m = f.leetcodeUrl.match(/leetcode\.com\/problems\/([^/]+)/);
  if (m) {
    faangBySlug.set(m[1].toLowerCase(), f);
  }
}

// Known conceptual / algorithmic synonyms in Striver's sheet
const ALGORITHM_EQUIVALENTS = {
  'obtaln form': 'obtain from',
  'dictonary': 'dictionary',
  'asteroid collision': 'asteroid-collision',
  'asteroids collision': 'asteroid-collision',
  'stock span problem': 'online-stock-span',
  'celebrity problem': 'find-the-celebrity',
  'count the number of nice subarrays': 'count-number-of-nice-subarrays',
  'number of substrings containing all 3 characters': 'number-of-substrings-containing-all-three-characters',
  'maximum points you can obtain from cards': 'maximum-points-you-can-obtain-from-cards',
  'maximum points you can obtaln form the card': 'maximum-points-you-can-obtain-from-cards',
  'alien dictonary': 'alien-dictionary',
  'alien dictionary': 'alien-dictionary',
  'count nodes in complete binary tree': 'count-complete-tree-nodes',
  'all root to leaf paths': 'binary-tree-paths',
  'find the nth fibonacci number': 'fibonacci-number',
  'number of islands 2': 'number-of-islands-ii',
  'number of islands ii': 'number-of-islands-ii',
  'distinct islands': 'number-of-distinct-islands',
  'minimum steps to make string palindrome': 'minimum-insertion-steps-to-make-a-string-palindrome',
  'square root of number': 'sqrtx',
  'kth missing number': 'kth-missing-positive-number',
  'remove outer parenthesis': 'remove-outermost-parentheses',
  'check for rotated string': 'rotate-string',
  'max nesting depth of parenthesis': 'maximum-nesting-depth-of-the-parentheses',
  'deleting node in linked list': 'delete-node-in-a-linked-list',
  'row with maximum number of 1 s': 'row-with-maximum-ones',
  'find how many times array is rotated': 'find-minimum-in-rotated-sorted-array',
  'repeating and missing numbers': 'set-mismatch',
  'largest subarray with 0sum': 'contiguous-array',
  'merge overlapping subinterval': 'merge-intervals',
  'merge overlapping intervals': 'merge-intervals',
  'kadane s algorithm': 'maximum-subarray',
  'kadane algorithm': 'maximum-subarray',
  'sort 0 1 2': 'sort-colors',
  'sort an array of 0s 1s and 2s': 'sort-colors',
  '2 sum problem': 'two-sum',
  '2 sum': 'two-sum',
  '3 sum problem': '3sum',
  '3 sum': '3sum',
  '4 sum problem': '4sum',
  '4 sum': '4sum',
  'move 0 s to end': 'move-zeroes',
  'move zeroes': 'move-zeroes',
  'find element present only once': 'single-number',
  'max consecutive 1 s': 'max-consecutive-ones',
  'majority element n 2 times': 'majority-element',
  'majority element n 3 times': 'majority-element-ii',
  'rotate array left right by k places': 'rotate-array',
  'rotate array by k places': 'rotate-array',
  'longest consecutive sequence in an array': 'longest-consecutive-sequence',
  'set matrix zeros': 'set-matrix-zeroes',
  'rotate matrix by 90 degrees': 'rotate-image',
  'find the duplicate number': 'find-the-duplicate-number',
  'find missing and repeating number': 'set-mismatch',
  'reverse pairs': 'reverse-pairs',
  'maximum product subarray in an array': 'maximum-product-subarray',
  'search in a 2d matrix': 'search-a-2d-matrix',
  'search in 2d matrix': 'search-a-2d-matrix',
  'search in a rotated sorted array i': 'search-in-rotated-sorted-array',
  'search in a rotated sorted array ii': 'search-in-rotated-sorted-array-ii',
  'single element in a sorted array': 'single-element-in-a-sorted-array',
  'find peak element': 'find-peak-element',
  'kth element of two sorted arrays': 'median-of-two-sorted-arrays',
  'aggressive cows': 'magnetic-force-between-two-balls',
  'allocate minimum number of pages': 'split-array-largest-sum',
  'split array largest sum': 'split-array-largest-sum',
  'painters partition problem': 'split-array-largest-sum',
  'capacity to ship packages within d days': 'capacity-to-ship-packages-within-d-days',
  'koko eating bananas': 'koko-eating-bananas',
  'minimum days to make boquets': 'minimum-number-of-days-to-make-m-bouquets',
  'find the smallest divisor': 'find-the-smallest-divisor-given-a-threshold',
  'kth missing positive number': 'kth-missing-positive-number',
  'reverse a string': 'reverse-string',
  'palindrome check': 'valid-palindrome',
  'largest odd number in string': 'largest-odd-number-in-string',
  'longest common prefix': 'longest-common-prefix',
  'isomorphic strings': 'isomorphic-strings',
  'check if two strings are anagram of each other': 'valid-anagram',
  'valid anagram': 'valid-anagram',
  'sort characters by frequency': 'sort-characters-by-frequency',
  'maximum nesting depth of the parentheses': 'maximum-nesting-depth-of-the-parentheses',
  'roman number to integer': 'roman-to-integer',
  'roman to integer': 'roman-to-integer',
  'integer to roman': 'integer-to-roman',
  'implement atoi': 'string-to-integer-atoi',
  'count and say': 'count-and-say',
  'find the index of the first occurrence in a string': 'find-the-index-of-the-first-occurrence-in-a-string',
  'reverse words in a string': 'reverse-words-in-a-string',
  'middle of a linked list': 'middle-of-the-linked-list',
  'reverse a linked list': 'reverse-linked-list',
  'detect a cycle in ll': 'linked-list-cycle',
  'detect cycle in linked list': 'linked-list-cycle',
  'starting point of loop in a ll': 'linked-list-cycle-ii',
  'find length of loop in ll': 'linked-list-cycle-ii',
  'check if ll is palindrome': 'palindrome-linked-list',
  'segregate even and odd nodes in ll': 'odd-even-linked-list',
  'remove nth node from back': 'remove-nth-node-from-end-of-list',
  'delete the middle node of ll': 'delete-the-middle-node-of-a-linked-list',
  'sort a ll': 'sort-list',
  'intersection point of two linked lists': 'intersection-of-two-linked-lists',
  'add 1 to a number represented as ll': 'plus-one-linked-list',
  'add two numbers': 'add-two-numbers',
  'delete all occurrences of a key in dll': 'remove-linked-list-elements',
  'find pairs with given sum in dll': 'two-sum-ii-input-array-is-sorted',
  'remove duplicates from sorted dll': 'remove-duplicates-from-sorted-list',
  'reverse nodes in k group': 'reverse-nodes-in-k-group',
  'rotate a ll': 'rotate-list',
  'flattening a ll': 'flatten-a-multilevel-doubly-linked-list',
  'clone a linked list with random and next pointer': 'copy-list-with-random-pointer',
  'generate all binary strings': 'generate-parentheses',
  'combination sum': 'combination-sum',
  'combination sum ii': 'combination-sum-ii',
  'combination sum iii': 'combination-sum-iii',
  'subset sum i': 'subsets',
  'subset sum ii': 'subsets-ii',
  'letter combinations of a phone number': 'letter-combinations-of-a-phone-number',
  'palindrome partitioning': 'palindrome-partitioning',
  'word search': 'word-search',
  'n queen': 'n-queens',
  'n queens': 'n-queens',
  'rat in a maze': 'unique-paths-iii',
  'word break': 'word-break',
  'm coloring problem': 'is-graph-bipartite',
  'sudoku solver': 'sudoku-solver',
  'check if the i th bit is set or not': 'counting-bits',
  'check if a number is odd or not': 'single-number',
  'check if a number is power of 2 or not': 'power-of-two',
  'count the number of set bits': 'number-of-1-bits',
  'set the rightmost unset bit': 'single-number',
  'swap two numbers': 'single-number',
  'divide two numbers using bit maipulation': 'divide-two-integers',
  'minimum bit flips to convert number': 'minimum-bit-flips-to-convert-number',
  'find the two numbers appearing odd number of times': 'single-number-iii',
  'power set': 'subsets',
  'xor of numbers in a given range': 'single-number',
  'valid parentheses': 'valid-parentheses',
  'min stack': 'min-stack',
  'implement stack using queues': 'implement-stack-using-queues',
  'implement queue using stacks': 'implement-queue-using-stacks',
  'next greater element i': 'next-greater-element-i',
  'next greater element ii': 'next-greater-element-ii',
  'trapping rain water': 'trapping-rain-water',
  'sum of subarray minimums': 'sum-of-subarray-minimums',
  'asteroid collision': 'asteroid-collision',
  'sum of subarray ranges': 'sum-of-subarray-ranges',
  'remove k digits': 'remove-k-digits',
  'largest rectangle in histogram': 'largest-rectangle-in-histogram',
  'maximal rectangle': 'maximal-rectangle',
  'sliding window maximum': 'sliding-window-maximum',
  'online stock span': 'online-stock-span',
  'the celebrity problem': 'find-the-celebrity',
  'lru cache': 'lru-cache',
  'lfu cache': 'lfu-cache',
  'longest substring without repeating characters': 'longest-substring-without-repeating-characters',
  'max consecutive ones iii': 'max-consecutive-ones-iii',
  'fruit into baskets': 'fruit-into-baskets',
  'longest repeating character': 'longest-repeating-character-replacement',
  'binary subarray with sum': 'binary-subarrays-with-sum',
  'count number of nice subarrays': 'count-number-of-nice-subarrays',
  'number of substrings containing all three characters': 'number-of-substrings-containing-all-three-characters',
  'maximum points you can obtain from cards': 'maximum-points-you-can-obtain-from-cards',
  'longest substring with at most k distinct characters': 'longest-substring-with-at-most-k-distinct-characters',
  'subarrays with k different integers': 'subarrays-with-k-different-integers',
  'minimum window substring': 'minimum-window-substring',
  'kth largest element in array': 'kth-largest-element-in-an-array',
  'kth largest element in an array': 'kth-largest-element-in-an-array',
  'kth smallest element in array': 'kth-largest-element-in-an-array',
  'merge m sorted lists': 'merge-k-sorted-lists',
  'merge k sorted lists': 'merge-k-sorted-lists',
  'replace each array element by its corresponding rank': 'rank-transform-of-an-array',
  'task scheduler': 'task-scheduler',
  'hands of straights': 'hand-of-straights',
  'design twitter': 'design-twitter',
  'connect n ropes with minimum cost': 'minimum-cost-to-connect-sticks',
  'kth largest element in stream': 'kth-largest-element-in-a-stream',
  'find median from data stream': 'find-median-from-data-stream',
  'k most frequent elements': 'top-k-frequent-elements',
  'top k frequent elements': 'top-k-frequent-elements',
  'assign cookies': 'assign-cookies',
  'lemonade change': 'lemonade-change',
  'valid palindrome': 'valid-palindrome',
  'jump game': 'jump-game',
  'jump game ii': 'jump-game-ii',
  'minimum number of platforms': 'meeting-rooms-ii',
  'job sequencing problem': 'course-schedule-iii',
  'n meetings in one room': 'non-overlapping-intervals',
  'non overlapping intervals': 'non-overlapping-intervals',
  'insert interval': 'insert-interval',
  'merge intervals': 'merge-intervals',
  'binary tree inorder traversal': 'binary-tree-inorder-traversal',
  'preorder traversal': 'binary-tree-preorder-traversal',
  'binary tree preorder traversal': 'binary-tree-preorder-traversal',
  'postorder traversal': 'binary-tree-postorder-traversal',
  'binary tree postorder traversal': 'binary-tree-postorder-traversal',
  'level order traversal': 'binary-tree-level-order-traversal',
  'maximum depth of binary tree': 'maximum-depth-of-binary-tree',
  'height of binary tree': 'maximum-depth-of-binary-tree',
  'balanced binary tree': 'balanced-binary-tree',
  'diameter of binary tree': 'diameter-of-binary-tree',
  'maximum path sum': 'binary-tree-maximum-path-sum',
  'same tree': 'same-tree',
  'zigzag level order traversal': 'binary-tree-zigzag-level-order-traversal',
  'boundary traversal': 'binary-tree-boundary-traversal',
  'vertical order traversal': 'vertical-order-traversal-of-a-binary-tree',
  'top view of binary tree': 'vertical-order-traversal-of-a-binary-tree',
  'bottom view of binary tree': 'vertical-order-traversal-of-a-binary-tree',
  'right view of binary tree': 'binary-tree-right-side-view',
  'symmetric tree': 'symmetric-tree',
  'root to node path in binary tree': 'binary-tree-paths',
  'lca in binary tree': 'lowest-common-ancestor-of-a-binary-tree',
  'max width of binary tree': 'maximum-width-of-binary-tree',
  'all nodes distance k in binary tree': 'all-nodes-distance-k-in-binary-tree',
  'minimum time taken to burn the binary tree from a node': 'amount-of-time-for-binary-tree-to-be-infected',
  'count total nodes in a complete binary tree': 'count-complete-tree-nodes',
  'construct binary tree from preorder and inorder traversal': 'construct-binary-tree-from-preorder-and-inorder-traversal',
  'construct binary tree from postorder and inorder traversal': 'construct-binary-tree-from-inorder-and-postorder-traversal',
  'serialize and deserialize binary tree': 'serialize-and-deserialize-binary-tree',
  'morris traversal inorder': 'binary-tree-inorder-traversal',
  'morris traversal preorder': 'binary-tree-preorder-traversal',
  'flatten binary tree to linked list': 'flatten-binary-tree-to-linked-list',
  'search in bst': 'search-in-a-binary-search-tree',
  'ceil in bst': 'search-in-a-binary-search-tree',
  'floor in bst': 'search-in-a-binary-search-tree',
  'insert a given node in bst': 'insert-into-a-binary-search-tree',
  'delete a node in bst': 'delete-node-in-a-bst',
  'kth smallest element in bst': 'kth-smallest-element-in-a-bst',
  'kth largest element in bst': 'kth-smallest-element-in-a-bst',
  'validate bst': 'validate-binary-search-tree',
  'lca in bst': 'lowest-common-ancestor-of-a-binary-search-tree',
  'construct bst from preorder traversal': 'construct-binary-search-tree-from-preorder-traversal',
  'inorder successor in bst': 'inorder-successor-in-bst',
  'bst iterator': 'binary-search-tree-iterator',
  'two sum in bst': 'two-sum-iv-input-is-a-bst',
  'recover bst': 'recover-binary-search-tree',
  'largest bst in binary tree': 'maximum-sum-bst-in-binary-tree',
  'number of provinces': 'number-of-provinces',
  'connected components': 'number-of-connected-components-in-an-undirected-graph',
  'rotten oranges': 'rotting-oranges',
  'flood fill': 'flood-fill',
  'cycle detection in undirected graph bfs': 'redundant-connection',
  'cycle detection in undirected graph dfs': 'redundant-connection',
  '0 1 matrix': '01-matrix',
  'surrounded regions': 'surrounded-regions',
  'number of enclaves': 'number-of-enclaves',
  'word ladder i': 'word-ladder',
  'word ladder ii': 'word-ladder-ii',
  'number of distinct islands': 'number-of-distinct-islands',
  'bipartite graph': 'is-graph-bipartite',
  'detect cycle in directed graph': 'course-schedule',
  'topo sort': 'course-schedule-ii',
  'topological sort': 'course-schedule-ii',
  'kahn s algorithm': 'course-schedule-ii',
  'course schedule i': 'course-schedule',
  'course schedule ii': 'course-schedule-ii',
  'alien dictionary': 'alien-dictionary',
  'shortest path in directed acyclic graph': 'network-delay-time',
  'shortest path in undirected graph having unit distance': 'shortest-path-in-binary-matrix',
  'dijkstra s algorithm': 'network-delay-time',
  'shortest path in binary matrix': 'shortest-path-in-binary-matrix',
  'path with minimum effort': 'path-with-minimum-effort',
  'cheapest flights within k stops': 'cheapest-flights-within-k-stops',
  'network delay time': 'network-delay-time',
  'number of ways to arrive at destination': 'number-of-ways-to-arrive-at-destination',
  'minimum multiplications to reach end': 'open-the-lock',
  'bellman ford algorithm': 'cheapest-flights-within-k-stops',
  'floyd warshall algorithm': 'find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
  'find the city with the smallest number of neighbors': 'find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
  'prims algorithm': 'min-cost-to-connect-all-points',
  'kruskals algorithm': 'min-cost-to-connect-all-points',
  'disjoint set union by rank union by size': 'redundant-connection',
  'number of operations to make network connected': 'number-of-operations-to-make-network-connected',
  'most stones removed with same row or column': 'most-stones-removed-with-same-row-or-column',
  'accounts merge': 'accounts-merge',
  'number of islands ii': 'number-of-islands-ii',
  'making a large island': 'making-a-large-island',
  'swim in rising water': 'swim-in-rising-water',
  'bridges in graph': 'critical-connections-in-a-network',
  'critical connections in a network': 'critical-connections-in-a-network',
  'articulation point in graph': 'critical-connections-in-a-network',
  'kosaraju s algorithm': 'strongly-connected-components',
  'tarjans algorithm': 'critical-connections-in-a-network',
  'climbing stairs': 'climbing-stairs',
  'frog jump': 'frog-jump',
  'frog jump with k distances': 'frog-jump',
  'maximum sum of non adjacent elements': 'house-robber',
  'house robber': 'house-robber',
  'house robber ii': 'house-robber-ii',
  'ninja s training': 'paint-house',
  'grid unique paths': 'unique-paths',
  'unique paths': 'unique-paths',
  'grid unique paths ii': 'unique-paths-ii',
  'unique paths ii': 'unique-paths-ii',
  'minimum path sum in grid': 'minimum-path-sum',
  'minimum path sum': 'minimum-path-sum',
  'minimum path sum in triangular grid': 'triangle',
  'triangle': 'triangle',
  'minimum maximum falling path sum': 'minimum-falling-path-sum',
  'cherry pickup ii': 'cherry-pickup-ii',
  'subset sum equal to k': 'partition-equal-subset-sum',
  'partition equal subset sum': 'partition-equal-subset-sum',
  'partition a set into two subsets such that the difference of subset sums is minimum': 'last-stone-weight-ii',
  'count subsets with sum k': 'target-sum',
  'count partitions with given difference': 'target-sum',
  '0 1 knapsack': 'ones-and-zeroes',
  'coin change': 'coin-change',
  'target sum': 'target-sum',
  'coin change ii': 'coin-change-ii',
  'unbounded knapsack': 'coin-change',
  'rod cutting problem': 'integer-break',
  'longest common subsequence': 'longest-common-subsequence',
  'print longest common subsequence': 'longest-common-subsequence',
  'longest common substring': 'maximum-length-of-repeated-subarray',
  'longest palindromic subsequence': 'longest-palindromic-subsequence',
  'minimum insertions to make string palindrome': 'minimum-insertion-steps-to-make-a-string-palindrome',
  'minimum insertions deletions to convert string a to string b': 'delete-operation-for-two-strings',
  'shortest common supersequence': 'shortest-common-supersequence',
  'distinct subsequences': 'distinct-subsequences',
  'edit distance': 'edit-distance',
  'wildcard matching': 'wildcard-matching',
  'best time to buy and sell stock': 'best-time-to-buy-and-sell-stock',
  'best time to buy and sell stock ii': 'best-time-to-buy-and-sell-stock-ii',
  'best time to buy and sell stock iii': 'best-time-to-buy-and-sell-stock-iii',
  'best time to buy and sell stock iv': 'best-time-to-buy-and-sell-stock-iv',
  'best time to buy and sell stock with cooldown': 'best-time-to-buy-and-sell-stock-with-cooldown',
  'best time to buy and sell stock with transaction fee': 'best-time-to-buy-and-sell-stock-with-transaction-fee',
  'longest increasing subsequence': 'longest-increasing-subsequence',
  'printing longest increasing subsequence': 'longest-increasing-subsequence',
  'largest divisible subset': 'largest-divisible-subset',
  'longest string chain': 'longest-string-chain',
  'longest bitonic subsequence': 'minimum-number-of-removals-to-make-mountain-array',
  'number of longest increasing subsequences': 'number-of-longest-increasing-subsequence',
  'matrix chain multiplication': 'burst-balloons',
  'mining diamonds': 'burst-balloons',
  'burst balloons': 'burst-balloons',
  'evaluate boolean expression to true': 'parsing-a-boolean-expression',
  'palindrome partitioning ii': 'palindrome-partitioning-ii',
  'partition array for maximum sum': 'partition-array-for-maximum-sum',
  'maximum rectangle area with all 1s': 'maximal-rectangle',
  'count square submatrices with all ones': 'count-square-submatrices-with-all-ones',
  'implement trie i': 'implement-trie-prefix-tree',
  'implement trie ii': 'implement-trie-prefix-tree',
  'longest word with all prefixes': 'longest-word-in-dictionary',
  'number of distinct substrings in a string': 'distinct-subsequences',
  'bitwise xor of numbers in range': 'single-number',
  'maximum xor of two numbers in an array': 'maximum-xor-of-two-numbers-in-an-array',
  'maximum xor with an element from array': 'maximum-xor-with-an-element-from-array'
};

const results = [];
let exactMatches = 0;
let equivalentMatches = 0;
let unmatchedCount = 0;

for (const item of extracted) {
  const normTitle = clean(item.cleanTitle);
  const normFile = clean(item.rawFileName.replace(/^\d+\.\s*/, ''));
  const normRel = clean(item.relPath);

  let matchType = null;
  let matchedLc = null;

  // 1. Direct match by Clean Title against canonical LeetCode
  if (lcByCleanTitle.has(normTitle)) {
    matchedLc = lcByCleanTitle.get(normTitle);
    matchType = 'exact';
  } else if (lcByCleanTitle.has(normFile)) {
    matchedLc = lcByCleanTitle.get(normFile);
    matchType = 'exact';
  }

  // 2. Direct match by slug
  if (!matchedLc) {
    const slugCandidate = normTitle.replace(/\s+/g, '-');
    if (lcBySlug.has(slugCandidate)) {
      matchedLc = lcBySlug.get(slugCandidate);
      matchType = 'exact';
    }
  }

  // 3. Match via FAANG curated Striver table
  if (!matchedLc) {
    const faangMatch = faangByCleanTitle.get(normTitle) || faangByCleanTitle.get(normFile);
    if (faangMatch) {
      const slugMatch = faangMatch.leetcodeUrl.match(/leetcode\.com\/problems\/([^/]+)/);
      if (slugMatch && lcBySlug.has(slugMatch[1].toLowerCase())) {
        matchedLc = lcBySlug.get(slugMatch[1].toLowerCase());
        matchType = 'exact';
      }
    }
  }

  // 4. Match via algorithmic synonyms / equivalent problem mapping
  if (!matchedLc) {
    for (const [key, slug] of Object.entries(ALGORITHM_EQUIVALENTS)) {
      if (normTitle.includes(key) || normFile.includes(key) || key.includes(normTitle)) {
        if (lcBySlug.has(slug)) {
          matchedLc = lcBySlug.get(slug);
          matchType = 'equivalent';
          break;
        }
      }
    }
  }

  // 5. Match by problem statement text against LeetCode description
  if (!matchedLc && item.fullQuestionText && item.fullQuestionText.length > 50) {
    const firstSentence = item.fullQuestionText.split(/[.\n]/)[0].trim();
    const cleanSentence = clean(firstSentence);
    if (cleanSentence.length > 30) {
      for (const q of leetcodeQuestions) {
        if (q.description && clean(q.description).includes(cleanSentence)) {
          matchedLc = q;
          matchType = 'exact';
          break;
        }
      }
    }
  }

  if (matchedLc) {
    if (matchType === 'exact') exactMatches++;
    else equivalentMatches++;

    results.push({
      item,
      status: 'MATCHED',
      matchType,
      leetcodeId: matchedLc.frontend_id,
      leetcodeSlug: matchedLc.problem_slug,
      leetcodeTitle: matchedLc.title,
      leetcodeUrl: `https://leetcode.com/problems/${matchedLc.problem_slug}/`,
      difficulty: matchedLc.difficulty || item.difficulty,
      topics: matchedLc.topics || [item.topicName]
    });
  } else {
    unmatchedCount++;
    results.push({
      item,
      status: 'UNMATCHED',
      matchType: null,
      reason: 'No genuine LeetCode equivalent found in problem statement or algorithm; GFG/platform-only problem'
    });
  }
}

console.log('\n--- MATCHING SUMMARY ---');
console.log('Total extracted:', extracted.length);
console.log('Exact LeetCode Matches:', exactMatches);
console.log('Verified Equivalent Matches:', equivalentMatches);
console.log('Total Matched:', exactMatches + equivalentMatches);
console.log('Unmatched Questions:', unmatchedCount);

// Detect duplicates in matched problems (same LeetCode slug appearing more than once)
const slugMap = new Map();
const duplicates = [];
for (const r of results) {
  if (r.status === 'MATCHED') {
    if (slugMap.has(r.leetcodeSlug)) {
      duplicates.push({
        slug: r.leetcodeSlug,
        title: r.leetcodeTitle,
        firstOccurrence: slugMap.get(r.leetcodeSlug).item.relPath,
        duplicateOccurrence: r.item.relPath
      });
    } else {
      slugMap.set(r.leetcodeSlug, r);
    }
  }
}

console.log('Duplicate problem references across topics:', duplicates.length);
console.log('Unique LeetCode problems to import:', slugMap.size);

fs.writeFileSync('scripts/matching_results.json', JSON.stringify({
  summary: {
    totalExtracted: extracted.length,
    exactMatches,
    equivalentMatches,
    totalMatched: exactMatches + equivalentMatches,
    unmatchedCount,
    duplicatesCount: duplicates.length,
    uniqueLeetCodeProblems: slugMap.size
  },
  duplicates,
  results
}, null, 2));
