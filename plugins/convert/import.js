import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import { getPlugin } from '../loadPlugin';
const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json({
  strict: false, //allow values other than arrays and objects
});

const namespace = 'convert';

function callImportFunction(funcName, id, data) {
  return getPlugin(namespace, id)
    .then(mod => {
      return new Promise((resolve, reject) => {
        if (mod && mod[funcName]) {
          try {
            const func = mod[funcName];
            func(data)
              .then(res => {
                resolve(res);
              })
              .catch(err => {
                reject(err);
              });
          } catch (err) {
            reject(err);
          }
        } else {
          reject('No import option named ' + id + ' for projects');
        }
      });
    });
}

function importProject(id, data) {
  return callImportFunction('importProject', id, data);
}

function importBlock(id, data) {
  return callImportFunction('importBlock', id, data);
}

//this function is just trying to avoid redundant code
function importThenCatch(promise, resp) {
  promise
    .then(res => {
      resp.json(res);
    })
    .catch(err => {
      resp.status(500).send(err);
    });
}

router.post('/project/:id', jsonParser, (req, resp) => {
  console.log("HIT THE project ROUTE");
  const { id } = req.params;
  const data = req.body;

  if (data.file) {
    fs.readFile(data.file, 'utf8', (err, text) => {
      const promise = importProject(id, text);
      importThenCatch(promise, resp);
    });
  } else {
    const promise = importProject(id, data.text);
    importThenCatch(promise, resp);
  }
});

router.post('/block/:id', jsonParser, (req, resp) => {
  const { id } = req.params;

  //assuming contents to be string
  let buffer = '';

  //get data in parts
  req.on('data', data => {
    buffer += data;
  });

  //received all the data
  req.on('end', () => {
    const promise = importBlock(id, buffer);
    importThenCatch(promise, resp);
  });
});

//export these functions for testing purpose
router.importBlock = importBlock;
router.importProject = importProject;

module.exports = router;
