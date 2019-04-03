var express = require("express");
var router = express.Router();

const neo4j = require("neo4j-driver").v1;
const driver = neo4j.driver(
  "bolt://neo4j",
  neo4j.auth.basic("neo4j", "password"),
  { disableLosslessIntegers: true }
);
function neo4jRecordsToJSON(records) {
  return records.map(record => {
    let data = {};
    for (let i = 0; i < record.keys.length; i++) {
      // if (record.keys[i] === "_id")
      //   data[record.keys[i]] = neo4jLosslesIdToNumber(record._fields[i]);
      // else
      data[record.keys[i]] = record._fields[i];
    }
    return data;
  });
}

function neo4jLosslesIdToNumber(id) {
  console.log(id.toString());
  return id.toString();
  // let { high, low } = id;
  // high *= Math.pow(2, 32);
  // return low + high;
}

/* GET home page. */
router.get("/", async function(req, res, next) {
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
  const session = driver.session();
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  console.log(
    `MATCH (h)-[:above*]-(p:Person) WHERE ID(h) = ${hierarchyID} RETURN p`
  );
  const result = await session.run(
    `MATCH (h)-[:above*]-(p:Person) WHERE ID(h) = ${hierarchyID} WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`
  );
  session.close();

  // on application exit:
  driver.close();

  let persons = neo4jRecordsToJSON(result.records);
  res.json(persons);
});

router.get("/personsUnderPerson/:ID", async function(req, res, next) {
  const session = driver.session();
  const ID = req.params.ID;
  if (!ID) return res.status(400); //bad request
  console.log(
    `MATCH (:Person{id:'${ID}'})-[:under]->(h)-[:above*]->(p:Person) WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`
  );
  const result = await session.run(
    `MATCH (:Person{id:'${ID}'})-[:under]->(h)-[:above*]->(p:Person) WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`
  );
  session.close();

  // on application exit:
  driver.close();

  let persons = neo4jRecordsToJSON(result.records);
  res.json(persons);
});

router.get("/subHierarchies/:HierarchyID", async function(req, res, next) {
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

  // on application exit:
  res.json(neo4jRecordsToJSON(result.records));

  driver.close();
});

router.get("/subHierarchiesByPersonID/:ID", async function(req, res, next) {
  const session = driver.session();
  const ID = req.params.ID;
  if (!ID) return res.status(400); //bad request
  console.log(
    `MATCH p = (h_direct:Hierarchy)-[:above*]->(h:Hierarchy) WHERE (:Person{id:'${ID}'})-[:under]->(h_direct:Hierarchy) WITH COLLECT(p) AS ps CALL apoc.convert.toTree(ps) yield value RETURN value;`
  );
  const result = await session.run(
    `MATCH p = (h_direct:Hierarchy)-[:above*]->(h:Hierarchy) WHERE (:Person{id:'${ID}'})-[:under]->(h_direct:Hierarchy) WITH COLLECT(p) AS ps CALL apoc.convert.toTree(ps) yield value RETURN value;`
  );
  session.close();

  // on application exit:
  res.json(neo4jRecordsToJSON(result.records));

  driver.close();
});

module.exports = router;
