var express = require("express");
var router = express.Router();

const neo4j = require("neo4j-driver").v1;
const driver = neo4j.driver(
  "bolt://neo4j",
  neo4j.auth.basic("neo4j", "password"),
  { disableLosslessIntegers: true }
);
const session = driver.session();

async function neo4jRunQuery(query) {
  // const session = driver.session();
  const result = await session.run(query);
  // on application exit:
  // driver.close();

  return neo4jRecordsToJSON(result.records);
}

function neo4jRecordsToJSON(records) {
  return records.map(record => {
    let data = {};
    for (let i = 0; i < record.keys.length; i++) {
      data[record.keys[i]] = record._fields[i];
    }
    return data;
  });
}

function neo4jLosslesIdToNumber(id) {
  return id.toString();
}

router.get("/personsDirectlyUnderHierarchy/:HierarchyID", async function(
  req,
  res,
  next
) {
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  const query = `MATCH (h)-[:above]->(p:Person) WHERE ID(h) = ${hierarchyID} WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`;
  let ret = await neo4jRunQuery(query);
  res.json(ret);
});

router.get("/personsUnderHierarchy/:HierarchyID", async function(
  req,
  res,
  next
) {
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  const query = `MATCH (h)-[:above*]->(p:Person) WHERE ID(h) = ${hierarchyID} WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`;
  let ret = await neo4jRunQuery(query);
  res.json(ret);
});

router.get("/personsUnderPerson/:ID", async function(req, res, next) {
  const ID = req.params.ID;
  if (!ID) return res.status(400); //bad request
  const query = `MATCH (:Person{id:'${ID}'})-[:under]->(h)-[:above*]->(p:Person) WITH p.name as name,p.id as id,ID(p) as _id RETURN name,id,_id`;
  let ret = await neo4jRunQuery(query);
  res.json(ret);
});

router.get("/subHierarchies/:HierarchyID", async function(req, res, next) {
  const session = driver.session();
  const hierarchyID = req.params.HierarchyID;
  if (!hierarchyID) return res.status(400); //bad request
  const query = `MATCH p = (h_root)-[:above*]-(h:Hierarchy) WHERE ID(h_root) = ${hierarchyID} WITH COLLECT(p) AS ps CALL apoc.convert.toTree(ps) yield value RETURN value;`;
  let ret = await neo4jRunQuery(query);
  res.json(ret);
});

router.get("/subHierarchiesByPersonID/:ID", async function(req, res, next) {
  const session = driver.session();
  const ID = req.params.ID;
  if (!ID) return res.status(400); //bad request
  const query = `MATCH p = (h_direct:Hierarchy)-[:above*]->(h:Hierarchy) WHERE (:Person{id:'${ID}'})-[:under]->(h_direct:Hierarchy) WITH COLLECT(p) AS ps CALL apoc.convert.toTree(ps) yield value RETURN value;`;
  let ret = await neo4jRunQuery(query);
  res.json(ret);
});

module.exports = router;
