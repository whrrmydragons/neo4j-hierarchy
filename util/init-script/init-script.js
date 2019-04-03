const program = require("commander");
const mockJson = require("./mock.json");
program
  .version("0.1.0")
  .option("-u, --uri <uri>", "neo4j uri")
  .parse(process.argv);

if (program.uri) {
  //   console.log(generateHierarchyNodeQuery(mockJson[0]));
  init(program.uri, mockJson);
} else console.log(" no uri");

function generateHierarchyNodeQuery(node) {
  let query = `MERGE (h:Hierarchy{name:'${node.name}'})\n`;
  query += node.above
    .map(under => `MERGE (h)-[:above]->(:Hierarchy{name:'${under}'})`)
    .join("\n");
  return query;
}
function generatePersonNodeQuery(node) {
  let query = `MERGE (p:Person{name:'${node.name}',id:'${
    node.id
  }'})\n WITH p\n`;
  query += node.under
    .map(
      (under, i) => `MATCH (h${i}:Hierarchy{name:'${under}'})
        MERGE (p)<-[:above]-(h${i})
        MERGE (p)-[:under]->(h${i})
        `
    )
    .join("\n");
  //   query += node.under
  //     .map(under => `MERGE (p)-[:under]->(:Hierarchy{name:'${under}'})`)
  //     .join("\n");
  return query;
}

async function init(uri, data) {
  const neo4j = require("neo4j-driver").v1;
  const driver = neo4j.driver(
    `bolt://${uri}`,
    neo4j.auth.basic("neo4j", "password")
  );
  const session = driver.session();

  //   const personName = "Alice";
  for (let i = 0; i < data.length; i++)
    if (data[i].label === "Hierarchy")
      await session.run(generateHierarchyNodeQuery(data[i]));
    else if (data[i].label === "Person")
      await session.run(generatePersonNodeQuery(data[i]));

  //   const result = await session.run("MERGE (a:Person {name: $name}) RETURN a", {
  //     name: personName
  //   });
  session.close();

  //   const singleRecord = result.records[0];
  //   const node = singleRecord.get(0);

  console.log("Done");

  // on application exit:
  driver.close();
}
