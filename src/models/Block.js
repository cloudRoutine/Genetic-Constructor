import Instance from './Instance';
import invariant from 'invariant';
import BlockDefinition from '../schemas/Block';
import { getSequence, writeSequence } from '../middleware/api';
import AnnotationDefinition from '../schemas/Annotation';
import md5 from 'md5';

export default class Block extends Instance {
  constructor(input) {
    super(input, BlockDefinition.scaffold());
  }

  addComponent(componentId, index) {
    const spliceIndex = Number.isInteger(index) ? index : this.components.length;
    const newComponents = this.components.slice();
    newComponents.splice(spliceIndex, 0, componentId);
    return this.mutate('components', newComponents);
  }

  removeComponent(componentId) {
    const spliceIndex = this.components.findIndex(compId => compId === componentId);

    if (spliceIndex < 0) {
      console.warn('component not found'); // eslint-disable-line
      return this;
    }

    const newComponents = this.components.slice();
    newComponents.splice(spliceIndex, 1);
    return this.mutate('components', newComponents);
  }

  //pass index to be at after spliced out
  moveComponent(componentId, newIndex) {
    const spliceFromIndex = this.components.findIndex(compId => compId === componentId);

    if (spliceFromIndex < 0) {
      console.warn('component not found'); // eslint-disable-line
      return this;
    }

    const newComponents = this.components.slice();
    newComponents.splice(spliceFromIndex, 1);
    const spliceIntoIndex = (Number.isInteger(newIndex) && newIndex <= newComponents.length) ?
      newIndex :
      newComponents.length;
    newComponents.splice(spliceIntoIndex, 0, componentId);
    return this.mutate('components', newComponents);
  }

  setSbol(sbol) {
    return this.mutate('rules.sbol', sbol);
  }

  /**
   * @description Retrieve the sequence of the block. Retrieves the sequence from the server, since it is stored in a file, returning a promise.
   * @param format {String} accepts 'raw', 'fasta', 'genbank'
   * @returns {Promise} Promise which resolves with the sequence value, or (resolves) with null if no sequence is associated.
   */
  getSequence(format = 'raw') {
    const sequenceMd5 = this.sequence.md5;
    if (!sequenceMd5) {
      return Promise.resolve(null);
    }
    return getSequence(sequenceMd5, format);
  }

  /**
   * @description Writes the sequence for a block
   * @param sequence {String}
   * @param useStrict {Boolean}
   * @returns {Promise} Promise which resolves with the udpated block
   */
  setSequence(sequence, useStrict = false) {
    const sequenceLength = sequence.length;
    const sequenceMd5 = md5(sequence);

    const validatorStrict = /^[acgtu]*$/gi;
    const validatorLoose = /^[acgturyswkmbdhvn\.\-]*$/gi;

    const validator = !!useStrict ? validatorStrict : validatorLoose;

    if (!validator.test(sequence)) {
      return Promise.reject('sequence has invalid characters');
    }

    return writeSequence(sequenceMd5, sequence, this.id)
      .then(() => {
        const updatedSequence = {
          md5: sequenceMd5,
          length: sequenceLength,
        };
        return this.merge({sequence: updatedSequence});
      });
  }

  annotate(annotation) {
    invariant(AnnotationDefinition.validate(annotation), `'annotation is not valid: ${annotation}`);
    return this.mutate('sequence.annotations', this.sequence.annotations.concat(annotation));
  }

  removeAnnotation(annotation) {
    const annotationId = typeof annotation === 'object' ? annotation.id : annotation;
    invariant(typeof annotationId === 'string', `Must pass object with ID or annotation ID directly, got ${annotation}`);

    const annotations = this.sequence.annotations.slice();
    const toSplice = annotations.findIndex((ann) => ann.id === annotationId);

    if (toSplice < 0) {
      console.warn('annotation not found'); // eslint-disable-line
      return this;
    }

    annotations.splice(toSplice, 1);
    return this.mutate('sequence.annotations', annotations);
  }
}
