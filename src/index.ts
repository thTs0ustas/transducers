type Reducer<T, R> = (acc: R, val: T) => R;

/**
 * A Transducer is a function that takes a reducer and returns a new reducer.
 */
type Transducer<TIn, TOut> = <R>(reducer: Reducer<TOut, R>) => Reducer<TIn, R>;

/**
 * Composes transducers. For transducers, compose(f, g) means
 * that data flows through f then g.
 */
function composeTransducers<A, B, C>(
  f: Transducer<A, B>,
  g: Transducer<B, C>,
): Transducer<A, C>;
function composeTransducers<A, B, C, D>(
  f: Transducer<A, B>,
  g: Transducer<B, C>,
  h: Transducer<C, D>,
): Transducer<A, D>;
function composeTransducers<A, B, C, D, E>(
  f: Transducer<A, B>,
  g: Transducer<B, C>,
  h: Transducer<C, D>,
  i: Transducer<D, E>,
): Transducer<A, E>;
function composeTransducers<A, B, C, D, E, F>(
  f: Transducer<A, B>,
  g: Transducer<B, C>,
  h: Transducer<C, D>,
  i: Transducer<D, E>,
  j: Transducer<E, F>,
): Transducer<A, F>;
function composeTransducers<A, B, C, D, E, F, G>(
  f: Transducer<A, B>,
  g: Transducer<B, C>,
  h: Transducer<C, D>,
  i: Transducer<D, E>,
  j: Transducer<E, F>,
  k: Transducer<F, G>,
): Transducer<A, G>;
function composeTransducers(...fns: any[]): any {
  return (reducer: Reducer<any, any>) =>
    fns.reduceRight((r, f) => f(r), reducer);
}

// Collectors
const collectToList = <T>(acc: T[], curr: T): T[] => {
  acc.push(curr);
  return acc;
};

const collectToObj = (
  acc: Record<string, any>,
  curr: Record<string, any>,
): Record<string, any> => {
  return { ...acc, ...curr };
};

/**
 * Creates a map transducer.
 */
const mapTransducer =
  <T, U>(f: (val: T) => U): Transducer<T, U> =>
  (reducer) =>
  (acc, val) =>
    reducer(acc, f(val));

/**
 * Creates a filter transducer.
 */
const filterTransducer =
  <T>(p: (val: T) => boolean): Transducer<T, T> =>
  (reducer) =>
  (acc, val) =>
    p(val) ? reducer(acc, val) : acc;

/**
 * Creates a flattening transducer (cat).
 * Takes a stream of arrays and flattens them into the stream.
 */
const flattenTransducer =
  <T>(): Transducer<T[], T> =>
  (reducer) =>
  (acc, val) =>
    val.reduce(reducer, acc);

/**
 * Transforms an iterable into a new collection using a transducer.
 */
function into<T, U>(
  initial: unknown,
  transducer: Transducer<T, U>,
  iterable: T[],
): U[];
function into<T, U, R>(
  initial: R,
  transducer: Transducer<T, U>,
  iterable: T[],
  collectFn: Reducer<U, R>,
): R;
function into<T, U, R>(
  initial: R,
  transducer: Transducer<T, U>,
  iterable: T[],
): R;
function into(
  initial: any,
  transducer: any,
  iterable: any,
  collectFn?: any,
): any {
  const collect =
    collectFn || (Array.isArray(initial) ? collectToList : collectToObj);
  const t = transducer(collect);
  return iterable.reduce(t, initial);
}

// --- Extensive Example: Mocked API Data Transformation ---

interface Order {
  id: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
}

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: "admin" | "user" | "guest";
  orders: Order[];
}

// Simulated response from an API
const apiResponse: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    isActive: true,
    role: "user",
    orders: [
      { id: "ORD-001", amount: 120, status: "completed" },
      { id: "ORD-002", amount: 45, status: "pending" },
    ],
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    isActive: false,
    role: "user",
    orders: [{ id: "ORD-003", amount: 300, status: "completed" }],
  },
  {
    id: 3,
    name: "Charlie Davis",
    email: "charlie@example.com",
    isActive: true,
    role: "admin",
    orders: [
      { id: "ORD-004", amount: 250, status: "completed" },
      { id: "ORD-005", amount: 15, status: "cancelled" },
    ],
  },
  {
    id: 4,
    name: "Diana Prince",
    email: "diana@example.com",
    isActive: true,
    role: "user",
    orders: [
      { id: "ORD-006", amount: 80, status: "completed" },
      { id: "ORD-007", amount: 210, status: "completed" },
    ],
  },
];

/**
 * Goal: Extract a list of high-value order summaries from active users.
 * 1. Filter: Only active users.
 * 2. Map: Extract their orders (results in User -> Order[]).
 * 3. Flatten: Turn the stream of Order[] into a stream of individual Orders.
 * 4. Filter: Only 'completed' orders.
 * 5. Filter: Only orders with amount > 100.
 * 6. Map: Format as a summary string.
 */

const transformationPipeline = composeTransducers(
  filterTransducer((user: User) => user.isActive),
  mapTransducer((user: User) => user.orders),
  flattenTransducer<Order>(),
  filterTransducer((order: Order) => order.status === "completed"),
  filterTransducer((order: Order) => order.amount > 100),
  mapTransducer(
    (order: Order) =>
      `High Value Order ${order.id}: $${order.amount.toFixed(2)}`,
  ),
);

// Run the transformation
const highValueSummaries = into([], transformationPipeline, apiResponse);

console.log("--- High Value Order Summaries ---");
highValueSummaries.forEach((summary) => console.log(summary));
/* 
Expected Output:
High Value Order ORD-001: $120.00
High Value Order ORD-004: $250.00
High Value Order ORD-007: $210.00
*/

// We can also reuse parts of the pipeline
const activeUserOrdersPipeline = composeTransducers(
  filterTransducer((user: User) => user.isActive),
  mapTransducer((user: User) => user.orders),
  flattenTransducer<Order>(),
);

const totalRevenue = into(
  0,
  composeTransducers(
    activeUserOrdersPipeline,
    mapTransducer((o) => o.amount),
  ),
  apiResponse,
  (sum, amount) => sum + amount,
);

console.log("\nTotal Revenue from Active Users:", totalRevenue.toFixed(2));
// Expected Output: Total Revenue from Active Users: 720.00 (120+45+250+15+80+210)
