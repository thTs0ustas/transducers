"use strict";
function composeTransducers(...fns) {
    return (reducer) => fns.reduceRight((r, f) => f(r), reducer);
}
// Collectors
const collectToList = (acc, curr) => {
    acc.push(curr);
    return acc;
};
const collectToObj = (acc, curr) => {
    return { ...acc, ...curr };
};
/**
 * Creates a map transducer.
 */
const mapTransducer = (f) => (reducer) => (acc, val) => reducer(acc, f(val));
/**
 * Creates a filter transducer.
 */
const filterTransducer = (p) => (reducer) => (acc, val) => p(val) ? reducer(acc, val) : acc;
/**
 * Creates a flattening transducer (cat).
 * Takes a stream of arrays and flattens them into the stream.
 */
const flattenTransducer = () => (reducer) => (acc, val) => val.reduce(reducer, acc);
function into(initial, transducer, iterable, collectFn) {
    const collect = collectFn || (Array.isArray(initial) ? collectToList : collectToObj);
    const t = transducer(collect);
    return iterable.reduce(t, initial);
}
// Simulated response from an API
const apiResponse = [
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
const transformationPipeline = composeTransducers(filterTransducer((user) => user.isActive), mapTransducer((user) => user.orders), flattenTransducer(), filterTransducer((order) => order.status === "completed"), filterTransducer((order) => order.amount > 100), mapTransducer((order) => `High Value Order ${order.id}: $${order.amount.toFixed(2)}`));
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
const activeUserOrdersPipeline = composeTransducers(filterTransducer((user) => user.isActive), mapTransducer((user) => user.orders), flattenTransducer());
const totalRevenue = into(0, composeTransducers(activeUserOrdersPipeline, mapTransducer((o) => o.amount)), apiResponse, (sum, amount) => sum + amount);
console.log("\nTotal Revenue from Active Users:", totalRevenue.toFixed(2));
// Expected Output: Total Revenue from Active Users: 720.00 (120+45+250+15+80+210)
