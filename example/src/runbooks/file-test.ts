import axios from 'axios';
import "../load-env.js";
import { suite } from "../suite.js";


await suite()
  .step("list", async (ctx) => {
    const response = await ctx.file.list("C:\\Repos\\file-test");
    console.log(response);
  })
  .step("file-exists", async (ctx) => {
    const exists = await ctx.file.exists("C:\\Repos\\file-test\\example-1.txt");
    console.log(`File exists: ${exists}`);
  })
   .step("append-file", async (ctx) => {
    await ctx.file.append("C:\\Repos\\file-test\\example-1.txt", "Hello, World!");
    console.log("File appended.");
  })
  .step("copy-file", async (ctx) => {
    await ctx.file.copy("C:\\Repos\\file-test\\example-1.txt", "C:\\Repos\\file-test\\copied-example-1.txt");
    console.log("File copied.");
  })
  .step("move-file", async (ctx) => {
    await ctx.file.move("C:\\Repos\\file-test\\example-1.txt", "C:\\Repos\\file-test\\moved-example-1.txt");
    console.log("File moved.");
  })
  .step("ensure-dir", async (ctx) => {
    await ctx.file.ensureDir("C:\\Repos\\file-test\\new-directory");
    console.log("Directory ensured.");
  })
  .step("delete-file", async (ctx) => {
    await ctx.file.delete("C:\\Repos\\file-test\\moved-example-1.txt");
    await ctx.file.delete("C:\\Repos\\file-test\\copied-example-1.txt");
    console.log("Files deleted.");
  })
  .step("write-file", async (ctx) => {
    await ctx.file.write("C:\\Repos\\file-test\\example-1.txt", "Hello, World!");
    console.log("File written.");
  })
  .step("write-file-json", async (ctx) => {
    await ctx.file.writeJson("C:\\Repos\\file-test\\example-1.json", { message: "Hello, World!" });
    console.log("File written.");
  })
  .step("read-file", async (ctx) => {
    const content = await ctx.file.read("C:\\Repos\\file-test\\example-1.txt");
    console.log(`File content: ${content}`);
  })
  .step("read-file-json", async (ctx) => {
    const content = await ctx.file.readJson("C:\\Repos\\file-test\\example-1.json");
    console.log(`File content: ${JSON.stringify(content)}`);
  })
  .run("throwOnError");
