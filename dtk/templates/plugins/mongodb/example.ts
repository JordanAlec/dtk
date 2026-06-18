import "../load-env.js";
import { suite } from "../suite.js";
import { createMongoService } from "../services/mongodb.js";

type User = { name: string; email: string; active: boolean; };

const mongo = createMongoService({
  uri: process.env.MONGODB_URI!,
  database: process.env.MONGODB_DATABASE ?? 'dtk',
});

try {
  await suite()
    .step("insert-user", async () => {
      const result = await mongo.insertOne("users", {
        name: "Alice",
        email: "alice@example.com",
        active: true,
      });
      console.log("inserted id:", result.insertedId);
      return result;
    })
    .step("find-active-users", async () => {
      const users = await mongo.find<User>("users", { active: true });
      console.log("active users:", users);
      return users;
    })
    .step("deactivate-user", async () => {
      const result = await mongo.updateOne(
        "users",
        { email: "alice@example.com" },
        { $set: { active: false } }
      );
      console.log("matched:", result.matchedCount, "modified:", result.modifiedCount);
      return result;
    })
    .step("delete-inactive-users", async () => {
      const result = await mongo.deleteMany("users", { active: false });
      console.log("deleted:", result.deletedCount);
      return result;
    })
    .run("stopOnError");
} finally {
  await mongo.disconnect();
}
