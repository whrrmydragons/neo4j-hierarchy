var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", async function(req, res, next) {
  // res.render('index', { title: 'Express' });
  const neo4j = require("neo4j-driver").v1;

  const driver = neo4j.driver(
    "bolt://neo4j",
    neo4j.auth.basic("neo4j", "password")
  );
  const session = driver.session();

  const personName = "Alice";
  const result = await session.run("MERGE (a:Person {name: $name}) RETURN a", {
    name: personName
  });
  session.close();

  const singleRecord = result.records[0];
  const node = singleRecord.get(0);

  console.log(node.properties.name);

  // on application exit:
  driver.close();
  res.json(node);
});

router.get("/personsUnderHierarchy/:HierarchyID", async function(
  req,
  res,
  next
) {
  // res.render('index', { title: 'Express' });
  const neo4j = require("neo4j-driver").v1;

  const driver = neo4j.driver(
    "bolt://neo4j",
    neo4j.auth.basic("neo4j", "password")
  );
  const session = driver.session();
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  console.log(
    `MATCH (h)-[:above*]-(p:Person) WHERE ID(h) = ${hierarchyID} RETURN p`
  );
  const result = await session.run(
    `MATCH (h)-[:above*]-(p:Person) WHERE ID(h) = ${hierarchyID} RETURN p`
  );
  session.close();

  console.log(result.records);

  // on application exit:
  driver.close();
  res.json(result.records);
});

router.get("/subHierarchies/:HierarchyID", async function(req, res, next) {
  // res.render('index', { title: 'Express' });
  const neo4j = require("neo4j-driver").v1;

  const driver = neo4j.driver(
    "bolt://neo4j",
    neo4j.auth.basic("neo4j", "password")
  );
  const session = driver.session();
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  console.log(
    `MATCH (h_root)-[:above*]-(h:Hierarchy) WHERE ID(h_root) = ${hierarchyID} RETURN h`
  );

  // MATCH p=(h:Hierarchy)-[:above*]->(m:Hierarchy)
  // WHERE ID(h) = 8
  // WITH COLLECT(p) AS ps
  // CALL apoc.convert.toTree(ps) yield value
  // RETURN value;

  const result = await session.run(
    `MATCH p = (h_root)-[:above*]-(h:Hierarchy) WHERE ID(h_root) = ${hierarchyID} WITH COLLECT(p) AS ps CALL apoc.convert.toTree(ps) yield value RETURN value;`
  );
  session.close();

  // const singleRecord = result.records[0];
  // const node = singleRecord.get(0);

  console.log(result.records);

  // on application exit:
  driver.close();
  res.json(result.records);
});

module.exports = router;
