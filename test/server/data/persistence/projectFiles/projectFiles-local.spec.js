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
import { assert, expect } from 'chai';
import uuid from 'node-uuid';
import { errorDoesNotExist } from '../../../../../server/utils/errors';
import Project from '../../../../../src/models/Project';
import * as projectFiles from '../../../../../server/data/persistence/projectFiles';
import {
  fileExists,
  fileRead,
  fileWrite,
  fileDelete,
  directoryExists,
  directoryMake,
  directoryDelete
} from '../../../../../server/utils/fileSystem';
import * as filePaths from '../../../../../server/utils/filePaths';
import * as s3 from '../../../../../server/data/persistence/s3';

describe('Server', () => {
  describe('Data', () => {
    describe('persistence', () => {
      describe('Project Files', () => {
        describe('Local', function projectFilesLocalTests() {
          //skip test suite if not using s3
          before(function () {
            if (s3.useRemote) {
              this.skip();
            }
          });

          const projectId = Project.classless().id;
          const namespace = 'tester';

          it('projectFilesWrite() should write a file', () => {
            const fileName = uuid.v4();
            const fileContents = 'h e r e a r e s o m e c o n t e n t s';
            const filePath = filePaths.createProjectFilePath(projectId, namespace, fileName);

            return projectFiles.projectFileWrite(projectId, namespace, fileName, fileContents)
              .then(() => fileRead(filePath, false))
              .then(result => {
                expect(result).to.equal(fileContents);
              });
          });

          it('projectFilesRead() should read a file', () => {
            const fileName = uuid.v4();
            const fileContents = 'h e r e a r e s o m e c o n t e n t s';
            const filePath = filePaths.createProjectFilePath(projectId, namespace, fileName);

            return fileWrite(filePath, fileContents, false)
              .then(() => projectFiles.projectFileRead(projectId, namespace, fileName))
              .then(result => {
                expect(result).to.equal(fileContents);
              });
          });

          it('projectFileList() should list files', () => {
            const files = [1, 2, 3, 4].map(() => uuid.v4());
            const contents = [1, 2, 3, 4].map(() => uuid.v4());

            return Promise.all(
              files.map((file, index) => fileWrite(filePaths.createProjectFilePath(projectId, namespace, file), contents[index]))
            )
              .then(() => projectFiles.projectFilesList(projectId, namespace))
              .then(list => {
                expect(list.length).to.equal(files.length);
                expect(list.sort()).to.eql(files.sort());
              });
          });
        });
      });
    });
  });
});
