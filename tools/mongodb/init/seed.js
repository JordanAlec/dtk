db = db.getSiblingDB('dtk');

db.users.insertMany([
  { name: 'Alice', email: 'alice@example.com', active: true },
  { name: 'Bob', email: 'bob@example.com', active: false },
  { name: 'Charlie', email: 'charlie@example.com', active: true },
]);

db.accounts.insertMany([
  { owner: 'Alice', balance: 1000 },
  { owner: 'Bob', balance: 500 },
]);
