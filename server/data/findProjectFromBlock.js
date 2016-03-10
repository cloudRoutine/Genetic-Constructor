import * as filePaths from '../utils/filePaths';
import { exec } from 'child_process';
import { errorCouldntFindProjectId } from '../utils/errors';

export const findProjectFromBlock = (blockId) => {
  if (!blockId) {
    return Promise.reject(errorCouldntFindProjectId);
  }

  return new Promise((resolve, reject) => {
    const storagePath = filePaths.createStorageUrl(filePaths.projectPath);
    exec(`cd ${storagePath} && find . -type d -name ${blockId}`, (err, output) => {
      if (err) {
        return reject(err);
      }

      const lines = output.split('\n');
      lines.pop(); //get rid of the last empty line
      if (lines.length === 1) {
        const [ /* idBlock */,
          /* blocks/ */,
          /* data/ */,
          idProject,
          ] = lines[0].split('/').reverse();
        resolve(idProject);
      } else {
        reject(errorCouldntFindProjectId);
      }
    });
  });
};

export default findProjectFromBlock;
