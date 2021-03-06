/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import bodyParser from 'body-parser';
import express from 'express';

import { errorDoesNotExist, errorFileNotFound, errorInvalidRoute } from './../utils/errors';
import * as projectFiles from './files/projectFiles';

const router = express.Router(); //eslint-disable-line new-cap
const textParser = bodyParser.text();

//permission checking currently handled by data router (user has access to project)
//todo - S3 access control ???? Necessary if all requests go through application server (checks projectId this way)

router.route('/:namespace/:file/:version?')
  .all((req, res, next) => {
    // const { projectId } = req; //already on the request
    const { namespace, file, version } = req.params;

    Object.assign(req, {
      namespace,
      file,
      version,
    });

    next();
  })
  .get((req, res, next) => {
    //future - support for getting all versions
    //if (req.version === 'versions') { ... }

    //future - support for getting old versions
    //const params = (req.version && req.version !== 'latest') ? { VersionId: req.version } : {};

    const { projectId, namespace, file } = req;

    projectFiles.projectFileRead(projectId, namespace, file)
      .then(data => res.send(data))
      .catch((err) => {
        if (err === errorDoesNotExist) {
          return res.status(404).send(errorDoesNotExist);
        }
        console.log('project file get err', err, err.stack);
        next(err);
      });
  })
  .post(textParser, (req, res, next) => {
    const { projectId, namespace, file } = req;
    //check if JSON was passed, parse to string if so (wont parse on the way back out)
    const content = typeof req.body === 'object' ? JSON.stringify(req.body) : (req.body || '');

    projectFiles.projectFileWrite(projectId, namespace, file, content)
      .then(result => res.send(result))
      .catch((err) => {
        console.log('project file post err', err, err.stack);
        next(err);
      });
  })
  .delete((req, res, next) => {
    const { projectId, namespace, file } = req;

    projectFiles.projectFileDelete(projectId, namespace, file)
      .then(() => res.status(200).send())
      .catch((err) => {
        console.log('project file delete err', err, err.stack);
        next(err);
      });
  });

router.route('/:namespace')
  .all((req, res, next) => {
    // const { projectId } = req; //already on request
    const { namespace } = req.params;

    Object.assign(req, {
      namespace,
    });

    next();
  })
  .get((req, res, next) => {
    const { projectId, namespace } = req;

    //future - support query where namespace is optional (need to update s3 support as well)

    //todo - move this to projectFilesList directly

    projectFiles.projectFilesList(projectId, namespace)
      .then((contents) => {
        const mapped = contents.map(filename => ({
          name: filename,
          Key: [projectId, namespace, filename].join('/'),
          url: projectFiles.makeProjectFileLink(projectId, namespace, filename),
        }));
        res.json(mapped);
      })
      .catch(err => res.status(404).send(errorFileNotFound));
  });

//default catch
router.use('*', (req, res) => {
  res.status(404).send(errorInvalidRoute);
});

export default router;
