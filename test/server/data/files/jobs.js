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
import * as jobFiles from '../../../../server/data/files/jobs';

//note - other modules have s3 specific tests and local specific tests, but at the moment jobs and project files are basically the same, so just doing one siute

describe('Server', () => {
  describe('Data', () => {
    describe('files', () => {
      describe('Jobs', () => {
        const contents = `Here
Are
Some
Contents!`;
        const contentBuffer = new Buffer('here are some contents!', 'utf8');
        const namespace = 'myNamespace';
        let filePath;

        it('jobFileWrite() requires contents, namespace, and can generate key', () => {
          expect(() => jobFiles.jobFileWrite()).to.throw();
          expect(() => jobFiles.jobFileWrite(namespace)).to.throw();
          expect(() => jobFiles.jobFileWrite(namespace, 'some contents')).to.not.throw();
        });

        it('jobFileWrite() returns VersionId and Key', () => {
          return jobFiles.jobFileWrite(namespace, contents)
            .then(result => {
              assert(typeof result === 'object');
              assert(result.VersionId, 'should make a version (or filler for local fs)');
              assert(result.Key, 'should have a key');
              filePath = result.Key;
            });
        });

        it('jobFileWrite() works with a buffer', () => {
          return jobFiles.jobFileWrite(namespace, contentBuffer)
            .then(result => {
              assert(result.Key, 'should have a key');
            });
        });

        it('jobFileRead() returns contents', () => {
          return jobFiles.jobFileRead(namespace, filePath)
            .then(fileContent => {
              expect(fileContent).to.equal(contents);
            });
        });
      });
    });
  });
});
